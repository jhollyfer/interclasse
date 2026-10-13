import { afterFetch, afterFind, column, computed, scope } from '@adonisjs/lucid/orm'
import drive from '@adonisjs/drive/services/main'

import { StorageSchema } from '#database/schema'
import { URL_TTL } from '#config/drive'
import type { UploadStatus } from '#core/entity'

/**
 * Registro neutro de arquivo: nome da chave, rótulo original, tipo, tamanho e
 * onde o binário vive (`path`). A `url` é derivada na leitura - nunca uma
 * coluna, para que trocar de bucket ou de CDN não
 * exija sair reescrevendo linha por linha.
 */
export default class Storage extends StorageSchema {
  /**
   * Só o que não foi arquivado.
   *
   * O filtro é de segurança, e por isso mora num ponto só: escrito à mão em cada
   * consulta, ele depende de alguém lembrar, e a consulta que esquecer devolve
   * registro arquivado sem avisar. Consulta que precisa ver o arquivado pede
   * `trashed` de propósito, e a que não pede não tem como esquecer.
   */
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })

  /**
   * Redeclarada só para estreitar o tipo: `database/schema.ts` é gerado das
   * colunas e entrega todo enum como `string`, então sem isto um typo
   * (`'UPLOADEED'`) compilaria e só apareceria na leitura seguinte.
   */
  @column()
  declare status: UploadStatus

  /**
   * Redeclarada porque `size` é `bigint` no banco - o teto de upload é do
   * ambiente e passa de `int4` -, e o driver devolve `int8` como string ou
   * `BigInt` conforme o caminho. `consume` normaliza na leitura, senão o `size`
   * sai como string no fio e o validator da resposta, que o declara número,
   * recusa a própria resposta.
   *
   * `Number` comporta: o seguro do `double` são 2^53 bytes, nove petabytes.
   */
  @column({ consume: (value: bigint | number | string) => Number(value) })
  declare size: number

  /**
   * A `url` derivada de `path`, resolvida na leitura por hook.
   *
   * É hook e não getter porque `getUrl()` do FlyDrive é **assíncrono** e
   * `serialize()` do Lucid é síncrono - sem isto a derivação teria que morar
   * numa camada de serializer à parte, remontando a resposta à mão.
   *
   * Vale para toda leitura, inclusive `preload`: o preloader executa o query
   * builder do model relacionado, que dispara `after:find` e `after:fetch` como
   * qualquer consulta. Uma capa precarregada chega com `url` sem que o use-case
   * peça.
   *
   * Assinada, e com prazo: o disco é privado, então nenhum endereço deste
   * objeto autoriza sozinho. `getUrl` continua devolvendo um endereço - a doc
   * do FlyDrive avisa que ele não confere existência nem visibilidade -, só que
   * esse endereço responde 403. Quem serve a leitura é a assinatura.
   *
   * Não custa rede: o FlyDrive assina por `@aws-sdk/s3-request-presigner`, que
   * calcula a SigV4 localmente. A URL vence em `URL_TTL`, e quem a guardar
   * recebe 403 depois disso.
   */
  @afterFind()
  static async resolveUrl(storage: Storage): Promise<void> {
    storage.$extras.url = await drive.use().getSignedUrl(storage.path, { expiresIn: URL_TTL })
  }

  /** O mesmo para a leitura em lote - listagem, galeria e todo `preload`. */
  @afterFetch()
  static async resolveUrls(storages: Storage[]): Promise<void> {
    await Promise.all(storages.map((storage) => Storage.resolveUrl(storage)))
  }

  /**
   * O que o hook resolveu, exposto no JSON.
   *
   * `@computed` e não `@column` porque não existe coluna `url`: ela é derivada,
   * e gravá-la seria congelar o endereço do bucket na linha.
   */
  @computed()
  get url(): string {
    return this.$extras.url
  }
}
