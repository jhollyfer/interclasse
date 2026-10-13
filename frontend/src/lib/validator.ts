import vine, { SimpleMessagesProvider } from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'

import { FIELD_LABELS, RULE_MESSAGES } from './validator-messages'
import type { Merge } from './interfaces'
import { SORT_DIRECTIONS, TRASHED_MODES } from './entity'
import type {
  ActiveStatus,
  BracketStatus,
  Category,
  MatchPhase,
  MatchStatus,
  UploadStatus,
  UserRole,
} from './entity'

/**
 * O núcleo do contrato da API no frontend: o `vine` configurado, a forma das
 * entidades que a API devolve e as regras que mais de um recurso usa. O
 * validator de cada recurso mora em `src/validators/<módulo>/<recurso>.validator.ts`,
 * com o mesmo nome de export do backend, e importa daqui tudo o que precisa -
 * ninguém mais importa `@vinejs/vine`.
 *
 * É cópia literal de `backend/app/core/validator.ts` e `app/core/entity.ts`. O
 * schema não atravessa a fronteira - o backend não publica os seus validators
 * como pacote - então são duas declarações, e o ganho de usar VineJS dos dois
 * lados é que elas são a **mesma expressão**, não uma tradução.
 *
 * Com dialetos diferentes a tradução envelhece sem avisar, e o sintoma é sempre
 * o mesmo: o cliente recusa por meses um valor que o servidor já aceita.
 *
 * **Regra nova entra nos dois arquivos, ou entra só no servidor.** A validação
 * de cliente é conveniência para quem digita; a do servidor é a que segura o
 * dado, porque quem chama a API direto passa longe daqui.
 *
 * `validate()` do VineJS é assíncrono e lança `E_VALIDATION_ERROR`. Quem consome
 * isto num formulário não chama `validate` na mão: passa o validator para
 * `vineResolver()` do `@hookform/resolvers/vine`.
 */

/**
 * Mensagens de validação em português, num lugar só - os textos moram em
 * `validator-messages.ts`, que é só dado.
 *
 * O VineJS não aceita mensagem inline por campo: a mensagem vem daqui, por
 * chave.
 *
 * Espelha `backend/start/validator.ts`, com as mesmas chaves e os mesmos textos.
 * São duas declarações do mesmo conteúdo pelo mesmo motivo dos validators: o
 * backend não publica o seu como pacote.
 */
// O `vineResolver` lê `error.messages` no formato do `SimpleErrorReporter`
// padrão. Trocar `vine.errorReporter` por um repórter próprio quebra o resolver
// em silêncio: os erros somem dos campos sem nenhum aviso.
vine.messagesProvider = new SimpleMessagesProvider(RULE_MESSAGES, FIELD_LABELS)

/**
 * Espelha `convertEmptyStringsToNull: true` de `backend/config/bodyparser.ts`.
 *
 * O default do VineJS fora do AdonisJS é `false`. Sem esta linha, o `''` de um
 * `<input>` vazio passaria por `vine.string()` aqui e seria recusado como
 * obrigatório do outro lado - validação de cliente aprovando o que a API nega é
 * pior do que não validar.
 *
 * Precisa rodar **antes** de qualquer `vine.create()` abaixo: a flag é lida na
 * compilação do schema, não na validação.
 */
vine.convertEmptyStringsToNull = true

/**
 * O `vine` sai reexportado daqui, e não importado de `@vinejs/vine`, porque as
 * duas linhas acima configuram um **singleton**: um schema criado a partir do
 * pacote cru compila com a flag desligada e com as mensagens em inglês, e o
 * resultado depende da ordem em que os módulos carregam.
 */
export { vine }

/** O tipo do payload validado, para os validators de recurso não irem ao pacote. */
export type { Infer }

// ---------------------------------------------------------------------------
// Vocabulário do domínio
// ---------------------------------------------------------------------------
//
// Mora em `./entity` para não arrastar o VineJS para quem só precisa de uma
// constante - este módulo tem efeito no topo e não é podável. Reexportado aqui
// para não quebrar quem já importava daqui.
export * from './entity'

// ---------------------------------------------------------------------------
// Entidades - a forma que a API devolve
// ---------------------------------------------------------------------------

/**
 * Espelham os models do Lucid serializados, que é o que `app/core/response.ts`
 * declara como resposta de toda a API. São `type` e não validators: o que sai do
 * backend já passou pelo VineJS de lá, e validar de novo aqui criaria uma
 * segunda fonte de verdade sobre o mesmo dado. Validator no frontend é para o
 * que o **usuário** digita.
 *
 * Datas são `string`: saem como ISO 8601 pelo `DateTime` do Luxon. `updatedAt` e
 * `deletedAt` são anuláveis.
 */
type Timestamps = {
  createdAt: string
  updatedAt: string | null
  deletedAt: string | null
}

/**
 * Um arquivo. A `url` é derivada de `path` na leitura por hook do model, nunca
 * armazenada - trocar de bucket ou de CDN não reescreve linha nenhuma.
 *
 * `partSize` e `uploadId` são do multipart em curso, e são nulos no arquivo que
 * subiu de uma vez só.
 */
export type Storage = Merge<
  Timestamps,
  {
    id: string
    filename: string
    originalName: string
    mimetype: string
    size: number
    path: string
    status: UploadStatus
    url: string
    partSize: number | null
    uploadId: string | null
  }
>

/**
 * O usuário como sai de `toJSON()`. `password` é `serializeAs: null`, então
 * nunca vem.
 */
export type User = Merge<
  Timestamps,
  {
    id: string
    name: string
    email: string
    role: UserRole
    status: ActiveStatus
    avatarId: string | null
    avatar?: Storage | null
  }
>

/** Uma conta como vínculo de outra coisa: conselheiro ou representante. */
export type Person = Pick<User, 'id' | 'name' | 'email' | 'role' | 'status'>

/** A turma, com conselheiro e representante quando o painel os precarrega. */
export type Classroom = {
  id: string
  name: string
  grade: number
  category: Category
  advisorId: string | null
  representativeId: string | null
  advisor?: Person | null
  representative?: Person | null
  createdAt: string
  updatedAt: string | null
}

export type Student = {
  id: string
  name: string
  classroomId: string
  createdAt: string
  updatedAt: string | null
}

export type Sport = {
  id: string
  name: string
  slug: string
  minAthletes: number
  maxAthletes: number
  createdAt: string
  updatedAt: string | null
}

export type Announcement = {
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: string
  updatedAt: string | null
}

/** A turma dentro de uma competição. O nome que sai no placar vem de `classroom`. */
export type Team = {
  id: string
  bracketId: string
  classroomId: string
  classroom: Classroom
}

export type Bracket = {
  id: string
  sportId: string
  category: Category
  status: BracketStatus
  sport?: Sport
  createdAt: string
  updatedAt: string | null
}

/** A partida como a tabela de jogos a lista: os dois times e a competição. */
export type Match = {
  id: string
  bracketId: string
  phase: MatchPhase
  round: number
  position: number
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number | null
  awayScore: number | null
  winnerTeamId: string | null
  status: MatchStatus
  scheduledAt: string | null
  location: string | null
  homeTeam?: Team | null
  awayTeam?: Team | null
  bracket?: Bracket
  createdAt: string
  updatedAt: string | null
}

/**
 * O plano de upload, espelhando `StorageUpload` de
 * `backend/app/features/storages/create.use-case.ts`.
 *
 * A mesma forma sai de `POST /storages` e de `GET /storages/:id/parts`, porque
 * começar um upload e retomá-lo são a mesma pergunta. Ao começar, `uploaded` vem
 * vazio; ao retomar, ele diz o que o bucket já tem e `parts` traz URL nova só
 * para o que falta.
 *
 * `parts` pode ser menor que `totalParts`: as URLs saem em lotes, e o próximo
 * lote é pedido no mesmo endpoint da retomada.
 */
export type StorageUpload = {
  storage: Storage
  /** Nulo quando o arquivo cabe numa parte só e sobe por um `PUT` simples. */
  uploadId: string | null
  partSize: number
  totalParts: number
  parts: Array<{ partNumber: number; url: string }>
  uploaded: Array<{ partNumber: number; size: number; etag: string }>
}

// ---------------------------------------------------------------------------
// Regras compartilhadas - cópia de `backend/app/core/validator.ts`
// ---------------------------------------------------------------------------

/**
 * São funções, não constantes, pelo mesmo motivo documentado no backend:
 * reaproveitar o mesmo nó de schema em dois validators compartilharia as opções
 * entre eles - o `optional()` de um apareceria no outro.
 */

/**
 * Quantos itens cada lista aceita.
 *
 * Sem teto, `vine.array()` aceita o array que couber no corpo da requisição, e
 * o que chega vai inteiro para o banco. Os números são do domínio: uma galeria
 * de álbum ou de notícia é a maior lista que existe aqui, e as listas de nome
 * de um podcast são curtas por natureza.
 */
export const LIST_LIMITS = {
  /** Atletas de uma turma numa modalidade. */
  ATHLETES: 40,
} as const

/**
 * A data como a API a troca: `YYYY-MM-DD`.
 *
 * **Divergência deliberada do backend**, que declara `vine.date()`. Lá o VineJS
 * recebe o texto e o transform global de `start/validator.ts` entrega um
 * `DateTime` do Luxon pronto para o model. Aqui o valor nunca deixa de ser
 * texto: é o que o `DatePicker` guarda e o que o `JSON.stringify` do corpo
 * manda. Copiar `vine.date()` faria o `Infer` virar `Date`, e o corpo sairia
 * com o ISO completo (`2026-07-01T00:00:00.000Z`), que o `vine.date()` do
 * servidor recusa por não estar em nenhum dos formatos que ele aceita.
 *
 * O teto de 40 caracteres é o que impede o campo de virar texto livre; quem
 * confere o formato de verdade é o servidor, com 422 apontando o campo.
 */
export function wireDate() {
  return vine.string().trim().maxLength(40)
}

export function email() {
  return vine.string().email().maxLength(254)
}

/**
 * Um `regex` por classe de caractere.
 *
 * A intenção no backend era "a mensagem aponta exatamente o que falta", mas o
 * VineJS não entrega isso: as quatro regras reportam a mesma chave
 * `password.regex` e a validação para na primeira que falha. A mensagem em
 * `validator-messages.ts` lista as quatro exigências de uma vez, por isso.
 */
export function password() {
  return vine
    .string()
    .minLength(8)
    .maxLength(32)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^a-zA-Z0-9]/)
    .confirmed({ as: 'passwordConfirmation' })
}

/** Os três campos que toda listagem aceita. O teto de `perPage` vive num lugar só. */
export function paginationFields() {
  return {
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
    search: vine.string().maxLength(100).optional(),
  }
}

/**
 * O recorte de lixeira, só para as listagens que têm o que restaurar.
 *
 * Fora de `paginationFields()` de propósito: se estivesse lá, apareceria também
 * nas listagens da vitrine, que nunca enxergam registro arquivado.
 */
export function trashedField() {
  return { trashed: vine.enum(TRASHED_MODES).optional() }
}

/**
 * A ordem de uma listagem, em dois campos: `sort` (a coluna) e `direction`.
 *
 * **Um par, e não um `order-<coluna>` por coluna.** Dois parâmetros de ordem ao
 * mesmo tempo não expressam precedência, e a consulta ordena por uma coluna só.
 *
 * **A coluna vem de uma lista fechada, declarada por recurso.** O valor entra
 * direto no `orderBy` do servidor: coluna fora da lista é `422` apontando o
 * campo. Aqui a lista serve para a tela não oferecer o que a API recusa.
 */
export function sortFields<
  const TColumns extends readonly [string, ...Array<string>],
>(columns: TColumns) {
  return {
    sort: vine.enum(columns).optional(),
    direction: vine.enum(SORT_DIRECTIONS).optional(),
  }
}

/**
 * A lista de atletas de uma turma numa modalidade. O conselheiro e o
 * representante editam a mesma lista, cada um pela sua rota.
 */
export function athleteListFields() {
  return {
    sportId: vine.string().uuid(),
    studentIds: vine
      .array(vine.string().uuid())
      .distinct()
      .maxLength(LIST_LIMITS.ATHLETES),
  }
}

// ---------------------------------------------------------------------------
// Validators globais
// ---------------------------------------------------------------------------

/**
 * O identificador na URL. Vale para todo recurso: a PK é uuid em toda tabela.
 */
export const IdentifierValidator = vine.create({
  id: vine.string().uuid(),
})

export const PaginationValidator = vine.create(vine.object(paginationFields()))

/**
 * A paginação dos recursos que têm lixeira. É o `PaginationValidator` mais o
 * `trashed`, e existe como schema próprio porque as listagens da vitrine seguem
 * sem ele.
 */
export const TrashablePaginationValidator = vine.create({
  ...paginationFields(),
  ...trashedField(),
})

export type IdentifierPayload = Infer<typeof IdentifierValidator>
export type PaginationPayload = Infer<typeof PaginationValidator>
export type TrashablePaginationPayload = Infer<
  typeof TrashablePaginationValidator
>
