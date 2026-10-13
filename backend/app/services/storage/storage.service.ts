import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import drive from '@adonisjs/drive/services/main'

import Storage from '#models/storage'
import type User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { STORAGE_EXTENSIONS, type StorageMimetype } from '#core/validator'
import { STAFF_USER_ROLES, UploadStatuses } from '#core/entity'

/**
 * Toda coluna que aponta para `storages`, com o rótulo que a mensagem de erro
 * mostra quando o arquivo está em uso.
 *
 * Uma lista só de objetos, e não listas casadas por índice: com duas, uma
 * inserção no meio de uma delas troca o rótulo de todas as seguintes, e o
 * compilador não tem como perceber. É também onde `owner` fica pendurado, e com
 * listas paralelas não haveria onde.
 *
 * `owner` é a coluna que carrega o id da pessoa de quem é a linha. Só o avatar
 * tem: o resto, quando houver, é acervo da organização, que não pertence a uma conta. Ausente
 * quer dizer que só quem opera o painel baixa o arquivo.
 *
 * `db.from` para todas, inclusive as que têm model: o que se pergunta é a
 * contagem de uma coluna, e o model não acrescenta nada a isso.
 */
const REFERENCES = [
  { table: 'users', column: 'avatar_id', label: 'avatar de usuário', owner: 'id' },
] as const

/**
 * Tudo que envolve arquivo: a chave sob a qual ele vive no bucket, o que o
 * bucket sabe sobre ele, quem o referencia e como ele sai de cena.
 *
 * É um serviço injetado, e não um punhado de funções exportadas, porque quem
 * anexa está espalhado - hoje o avatar em `account` e em `users`. Injetar deixa
 * cada use-case declarar a dependência que tem.
 *
 * O binário **não** passa por aqui: ele vai do navegador direto ao
 * bucket por URL assinada. O que atravessa esta camada é metadado.
 */
export default class StorageService {
  /**
   * A chave sob a qual o objeto vai viver no bucket.
   *
   * Um uuid mais a extensão do tipo declarado. O nome que o usuário enviou fica
   * só em `originalName`, como rótulo, e **nunca** vira caminho: ele é texto de
   * terceiro, e caminho montado com texto de terceiro é como se escreve por
   * cima do arquivo alheio.
   *
   * A extensão sai do `mimetype` e não do nome enviado porque o nome não é
   * fonte confiável - `foto.png` pode ser um pdf. O `mimetype` é o mesmo valor
   * com que a URL é assinada, então o que o bucket aceita e o que a chave diz
   * não têm como divergir.
   */
  key(mimetype: StorageMimetype): string {
    return `${randomUUID()}.${STORAGE_EXTENSIONS[mimetype]}`
  }

  /**
   * O que o bucket sabe sobre o objeto: tamanho, tipo, `ETag`.
   *
   * É com isto que a confirmação do upload confere o que **de fato** subiu
   * contra o que o cliente declarou ao pedir as URLs.
   */
  async metadata(storage: Storage) {
    return drive.use().getMetaData(storage.path)
  }

  /** Apaga só o binário, deixando a linha. Usado quando a confirmação recusa. */
  async discard(storage: Storage): Promise<void> {
    await drive.use().delete(storage.path)
  }

  /**
   * Onde um arquivo está sendo usado, em rótulos legíveis ("capa de notícia",
   * "galeria de álbum"). Vazio quer dizer órfão, e órfão é o único que o
   * `DELETE /storages/:id` apaga.
   *
   * A checagem existe porque `storages` é registro **neutro e compartilhado**:
   * o arquivo não pertence ao formulário que o enviou. Sem ela, quem conhecesse
   * um uuid furaria a capa de uma notícia alheia com uma requisição.
   *
   * Toda referência a `storages` é `SET NULL` ou `CASCADE`, então **o banco não
   * impediria nada**: apagar a linha esvaziaria o avatar, a capa ou a galeria
   * sem um erro no caminho. Quem impede é isto aqui, e é por isso que
   * `REFERENCES` tem de cobrir toda coluna que aponta para cá - uma que falte é
   * um arquivo em uso que some sem aviso.
   */
  async references(storageId: string): Promise<string[]> {
    // O rótulo viaja junto com a contagem, no mesmo objeto: casar dois arrays
    // pelo índice é o defeito que _padroes/backend.md §5.2 proíbe.
    const counts = await Promise.all(
      REFERENCES.map(async (reference) => {
        const rows = await db
          .from(reference.table)
          .where(reference.column, storageId)
          .count('* as total')
        // `count` do Postgres é `bigint`, e o driver o entrega como string.
        return { label: reference.label, total: Number(rows[0]?.total ?? 0) }
      }),
    )

    return counts.filter((count) => count.total > 0).map((count) => count.label)
  }

  /**
   * Quem pode baixar um arquivo pela rota de download.
   *
   * A rota existe porque o atributo `download` de um `<a>` é ignorado entre
   * origens; ela não é um caminho alternativo de leitura, e por isso não repete
   * a regra do site. O que o site mostra sai por `url` assinada, derivada na
   * leitura do recurso que a contém - e quem chega àquele recurso já passou
   * pela autorização dele.
   *
   * O administrador baixa tudo. Conselheiro e representante estão fora de
   * `STAFF_USER_ROLES` e caem na segunda regra, onde só alcançam a própria
   * linha - fechado por omissão, não por alguém lembrar de vir aqui.
   */
  async canDownload(storage: Storage, actor: User): Promise<boolean> {
    if (STAFF_USER_ROLES.includes(actor.role)) return true

    for (const reference of REFERENCES) {
      if (!('owner' in reference)) continue

      const rows = await db
        .from(reference.table)
        .where(reference.column, storage.id)
        .where(reference.owner, actor.id)
        .count('* as total')

      if (Number(rows[0]?.total ?? 0) > 0) return true
    }

    return false
  }

  /**
   * Uma URL temporária que entrega o arquivo com o nome original.
   *
   * O `Content-Disposition` viaja assinado dentro da própria URL, e é o bucket
   * que o devolve no download - por isso o binário não precisa atravessar esta
   * aplicação só para ganhar um header - atravessando, cada download ocuparia
   * a aplicação pelo tempo da transferência.
   *
   * Expira em minutos porque é endereço de uma ação, não de um recurso: quem
   * quiser o arquivo de novo pede outra.
   */
  async signedDownload(storage: Storage): Promise<string> {
    return drive.use().getSignedUrl(storage.path, {
      expiresIn: '5 minutes',
      contentType: storage.mimetype,
      contentDisposition: this.contentDisposition(storage.originalName),
    })
  }

  /**
   * O header `Content-Disposition` de um download, com o nome original.
   *
   * Dois nomes no mesmo header porque a RFC 6266 pede os dois: `filename=` só
   * carrega ASCII e é o que navegador antigo lê, e `filename*=UTF-8''` é o que
   * preserva acento e cedilha. Mandar só o segundo faz o arquivo chegar com o
   * nome errado em quem não o entende; mandar só o primeiro perde o acento em
   * todo mundo.
   *
   * O fallback ASCII decompõe o acento e joga fora o diacrítico (`ó` -> `o`) em
   * vez de passar por uma normalização de slug: slug trocaria o ponto da
   * extensão por hífen, e `relatorio-2026-pdf` não abre em programa nenhum.
   * Aspas e barra viram `_` porque escapariam do valor entre aspas do header.
   */
  contentDisposition(originalName: string): string {
    const ascii = originalName
      .normalize('NFD')
      // Os diacríticos que o NFD separou da letra base.
      .replace(/[\u0300-\u036f]/g, '')
      // O que sobrou fora do ASCII imprimível, mais aspas e barra, que
      // escapariam do valor entre aspas do header.
      .replace(/["\\]|[^\u0020-\u007e]/g, '_')

    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(originalName)}`
  }

  /**
   * Apaga o binário e depois o registro, nesta ordem.
   *
   * Binário órfão é lixo no bucket; registro órfão é `url` quebrada na tela. Se
   * o `delete` do bucket falhar, a linha fica - e o arquivo continua servível -
   * em vez de o inverso.
   *
   * `delete()` de verdade, e não `deletedAt`: `storages` não tem lixeira, e um
   * arquivo "removido" que continua ocupando o bucket não remove nada.
   */
  async remove(storage: Storage): Promise<void> {
    await drive.use().delete(storage.path)

    await storage.delete()
  }

  /**
   * Existência dos arquivos informados num payload, antes de qualquer escrita.
   *
   * Deduplica preservando a ordem - a posição na galeria é o índice do array,
   * então reordenar aqui trocaria a capa do álbum. Id inexistente, removido ou
   * ainda `PENDING` é `422` apontando o campo, nunca `404` nem `500`: quem
   * mandou o id errado foi o payload.
   *
   * `PENDING` conta como inexistente de propósito. Desde que o binário sobe
   * direto para o bucket, a linha nasce antes de o arquivo estar
   * íntegro - anexá-la publicaria uma notícia cuja capa ainda está a meio
   * caminho, e a tela mostraria um 404.
   */
  async assertExist(field: string, storageIds: string[]): Promise<Either<HTTPException, string[]>> {
    const ids = [...new Set(storageIds)]

    if (ids.length === 0) return right(ids)

    const storages = await Storage.query()
      .whereIn('id', ids)
      .where('status', UploadStatuses.UPLOADED)
      .withScopes((scopes) => scopes.notDeleted())

    // A contagem só bate quando todos os ids deduplicados casam com um arquivo
    // vivo.
    if (storages.length !== ids.length)
      return left(
        HTTPException.UnprocessableEntity('Arquivo não encontrado', 'STORAGE_NOT_FOUND', {
          [field]: 'Arquivo não encontrado',
        }),
      )

    return right(ids)
  }
}
