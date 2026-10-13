import { column, computed, scope } from '@adonisjs/lucid/orm'

import { StorageSchema } from '#database/schema'
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
   * A URL assinada, exposta no JSON. Quem a resolve a cada leitura é o hook
   * registrado em `providers/storage.provider.ts`, que a deixa em `$extras`.
   *
   * `@computed` e não `@column` porque não existe coluna `url`: ela é derivada,
   * e gravá-la seria congelar o endereço do bucket na linha. Ausente (registro
   * recém-criado, nunca lido), a chave some do JSON.
   */
  @computed()
  get url(): string | undefined {
    const url: unknown = this.$extras.url
    if (typeof url === 'string') return url
    return undefined
  }
}
