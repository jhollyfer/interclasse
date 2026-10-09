import vine from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'

import { messages } from './validator-messages'
import type { Merge } from './interfaces'

import {
  ACTIVE_STATUSES,
  CATEGORIES,
  GRADES,
  UPLOAD_STATUSES,
  SORT_DIRECTIONS,
  STORAGE_MIMETYPES,
  TRASHED_MODES,
  USER_ROLES,
} from './entity'
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
 * Fonte única do contrato da API no frontend: a forma das entidades que a API
 * devolve, e os schemas VineJS do que ela aceita.
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

// O `vineResolver` lê `error.messages` no formato do `SimpleErrorReporter`
// padrão. Trocar `vine.errorReporter` por um repórter próprio quebra o resolver
// em silêncio: os erros somem dos campos sem nenhum aviso.
vine.messagesProvider = messages

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

export function activeStatus() {
  return vine.enum(ACTIVE_STATUSES)
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

// ---------------------------------------------------------------------------
// account
// ---------------------------------------------------------------------------

/**
 * A própria conta, editada pelo dono dela.
 *
 * **Todo campo é opcional**: campo ausente significa "não mexer", e não
 * "apagar".
 *
 * `role` e `status` não entram: o papel é definido na criação, pelo
 * administrador, e ninguém muda o próprio.
 */
export const AccountUpdateValidator = vine.create({
  name: vine.string().trim().maxLength(120).optional(),
  email: email().optional(),
  password: password().optional(),
  /**
   * `passwordConfirmation` precisa ser declarado por dois motivos, e o segundo
   * é o que já foi entendido errado: a regra `confirmed()` de `password()` lê o
   * campo do input cru e reporta o erro nele - mas o VineJS **inclui** no
   * payload validado tudo o que o schema declara. Declarar é o que faz a
   * confirmação chegar ao corpo da requisição.
   *
   * Opcional como a senha, e pelo mesmo motivo: em branco significa "não
   * trocar", e `convertEmptyStringsToNull` transforma o `''` em `null`.
   */
  passwordConfirmation: vine.string().maxLength(32).optional(),
  /**
   * A senha atual, exigida **só** quando `password` vem no payload.
   *
   * É prova de identidade, e não de força: quem sequestra uma sessão tem o
   * cookie, mas não sabe a senha. Sem as regras de força de `password()`: o
   * valor é conferido contra o hash, não gravado.
   */
  currentPassword: vine
    .string()
    .maxLength(32)
    .optional()
    // Pelo VALOR, e não pela chave: o formulário manda `password: ''` quando
    // não se troca senha, e o `requiredIfExists` conta `''` como presente -
    // trocar só a foto pedia a senha atual.
    .requiredWhen((field) => Boolean(field.parent.password)),
  // `nullable` é o que permite tirar a foto sem trocá-la. O uuid só garante o
  // formato; que o arquivo exista é checado no servidor.
  avatarId: vine.string().uuid().nullable().optional(),
})

export type AccountUpdatePayload = Infer<typeof AccountUpdateValidator>

// ---------------------------------------------------------------------------
// authentication
// ---------------------------------------------------------------------------

export const AuthenticationSignInValidator = vine.create({
  email: email(),
  // Entrar não valida força, como no backend: a senha só é comparada com o hash
  // guardado, e exigir o formato atual travaria quem cadastrou antes - e diria,
  // pela mensagem de validação, qual é a política.
  password: vine.string().maxLength(128),
})

export type AuthenticationSignInPayload = Infer<
  typeof AuthenticationSignInValidator
>

// ---------------------------------------------------------------------------
// storages
// ---------------------------------------------------------------------------

/**
 * O que `POST /storages` recebe: metadados, nunca bytes.
 *
 * O binário vai do navegador direto ao bucket, então tipo e tamanho são
 * **declarados** aqui e conferidos contra o objeto real no
 * `POST /storages/:id/complete`.
 *
 * Sem o teto de `size`: ele é `UPLOAD_MAX_SIZE`, que é do ambiente do servidor e
 * não existe aqui. Quem sabe o teto do cliente é a variável de ambiente do
 * frontend, e a checagem mora no componente que escolhe o arquivo - copiar um
 * número para cá seria uma terceira fonte de verdade sobre o mesmo limite.
 */
export const StorageCreateValidator = vine.create({
  fileName: vine.string().trim().minLength(1).maxLength(255),
  mimetype: vine.enum(STORAGE_MIMETYPES),
  size: vine.number().min(1).withoutDecimals(),
})

export type StorageCreatePayload = Infer<typeof StorageCreateValidator>

/**
 * O que `POST /storages/:id/complete` recebe: o `ETag` de cada parte enviada.
 *
 * Vazio - ou ausente - é upload de parte única, que não tem parte para
 * confirmar. O teto de dez mil é o do próprio S3.
 */
export const StorageCompleteValidator = vine.create({
  parts: vine
    .array(
      vine.object({
        partNumber: vine.number().min(1).max(10_000).withoutDecimals(),
        etag: vine.string().trim().maxLength(64).minLength(1),
      }),
    )
    .optional(),
})

export type StorageCompletePayload = Infer<typeof StorageCompleteValidator>

/**
 * Por quais colunas a biblioteca de arquivos pode ser ordenada.
 *
 * `path` e `uploadId` ficam de fora de propósito - são detalhe do bucket e do
 * multipart, e ordenar por eles não é pergunta que a tela faça.
 */
export const STORAGE_SORT_COLUMNS = [
  'originalName',
  'mimetype',
  'size',
  'createdAt',
] as const

/**
 * O que `GET /storages` recebe.
 *
 * Sem `trashedField()`: `storages` tem `deleted_at`, mas apagar arquivo é
 * `DELETE /storages/:id`, que remove a linha **e** o binário. Não há lixeira de
 * arquivo para restaurar.
 */
export const StoragePaginationValidator = vine.create({
  ...paginationFields(),
  status: vine.enum(UPLOAD_STATUSES).optional(),
  // A lista fechada, e não texto livre: é a mesma tupla que `POST /storages`
  // aceita, então filtrar por um tipo que a API nunca grava é 422 em vez de uma
  // página vazia que parece um bug.
  mimetype: vine.enum(STORAGE_MIMETYPES).optional(),
  ...sortFields(STORAGE_SORT_COLUMNS),
})

export type StoragePaginationPayload = Infer<typeof StoragePaginationValidator>

// ---------------------------------------------------------------------------
// administrator/users
// ---------------------------------------------------------------------------

/**
 * Por quais colunas a listagem de usuários pode ser ordenada.
 *
 * São as colunas que a tela mostra, e nada além: `password` é hash e ordenar por
 * ele não significa nada, e `avatar` é relação, que exigiria `join`.
 */
export const USER_SORT_COLUMNS = [
  'name',
  'email',
  'role',
  'status',
  'createdAt',
] as const

/**
 * O papel de um usuário gerenciado pelo painel.
 *
 * Aqui é o enum inteiro: os três papéis nascem pelo painel.
 */
export function manageableRole() {
  return vine.enum(USER_ROLES)
}

/**
 * O que `POST /administrator/users` recebe.
 *
 * `role` é **obrigatório**: a coluna não tem `DEFAULT`, e o papel é sempre
 * explícito. `backend-old` caía em `ADMINISTRATOR` por omissão, e um caminho de
 * criação esquecido gravava o papel mais poderoso em silêncio.
 *
 * `password` passa pela regra de força compartilhada, que também exige
 * `passwordConfirmation` com o mesmo valor - o campo é lido do input cru e não
 * entra no payload validado, então não há o que descartar antes de enviar.
 *
 * `status` é opcional porque a coluna tem `DEFAULT 'ACTIVE'`: a conta nasce
 * podendo entrar, e desativar é edição.
 */
export const AdministratorUserCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  email: email(),
  password: password(),
  /**
   * Declarado aqui e **não** no schema do backend, como em
   * `AccountUpdateValidator` e pelo mesmo motivo: a regra `confirmed()` de
   * `password()` lê o campo do input cru e reporta o erro nele, mas o VineJS só
   * **inclui** no payload validado o que o schema declara. Sem esta linha o
   * corpo sairia daqui sem a confirmação, e o servidor - que a lê do corpo cru -
   * recusaria toda criação com 422.
   */
  passwordConfirmation: vine.string().maxLength(32),
  role: manageableRole(),
  status: activeStatus().optional(),
  // `nullable` é o que permite tirar a foto sem trocá-la. O uuid só garante o
  // formato; que o arquivo exista é checado no use-case do servidor.
  avatarId: vine.string().uuid().nullable().optional(),
})

/**
 * O que `PUT /administrator/users/:id` recebe.
 *
 * **Todo campo é opcional**, inclusive os obrigatórios na criação: campo ausente
 * significa "não mexer", e não "apagar". Só `avatarId` aceita `null`
 * explícito.
 *
 * `role` entra aqui, ao contrário de `AccountUpdateValidator`: promover e
 * rebaixar é o que este recurso existe para fazer, e ninguém muda o próprio
 * papel por `/account`.
 */
export const AdministratorUserUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional(),
  email: email().optional(),
  password: password().optional(),
  /**
   * Declarado pela mesma razão da criação. Opcional como a senha, e pelo mesmo
   * motivo: em branco significa "não trocar", e `convertEmptyStringsToNull`
   * transforma o `''` em `null`.
   */
  passwordConfirmation: vine.string().maxLength(32).optional(),
  role: manageableRole().optional(),
  status: activeStatus().optional(),
  avatarId: vine.string().uuid().nullable().optional(),
})

/**
 * O que `GET /administrator/users` aceita na query.
 *
 * Dois filtros próprios, que são os dois recortes da tela: `role` separa
 * organização, conselheiros e representantes, e `status` separa quem entra de quem foi desativado
 * sem ser arquivado.
 */
export const AdministratorUserPaginationValidator = vine.create({
  ...paginationFields(),
  ...trashedField(),
  ...sortFields(USER_SORT_COLUMNS),
  role: manageableRole().optional(),
  status: activeStatus().optional(),
})

export type AdministratorUserCreatePayload = Infer<
  typeof AdministratorUserCreateValidator
>
export type AdministratorUserUpdatePayload = Infer<
  typeof AdministratorUserUpdateValidator
>
export type AdministratorUserPaginationPayload = Infer<
  typeof AdministratorUserPaginationValidator
>

// ---------------------------------------------------------------------------
// administrator/classrooms - cópia de `backend/app/core/validator.ts`
// ---------------------------------------------------------------------------

export const CLASSROOM_SORT_COLUMNS = [
  'name',
  'grade',
  'category',
  'createdAt',
] as const

export function grade() {
  return vine.number().withoutDecimals().min(GRADES.MIN).max(GRADES.MAX)
}

export const AdministratorClassroomCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(20),
  grade: grade(),
  advisorId: vine.string().uuid().nullable().optional(),
  representativeId: vine.string().uuid().nullable().optional(),
})

export const AdministratorClassroomUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(20).optional(),
  grade: grade().optional(),
  advisorId: vine.string().uuid().nullable().optional(),
  representativeId: vine.string().uuid().nullable().optional(),
})

export type AdministratorClassroomCreatePayload = Infer<
  typeof AdministratorClassroomCreateValidator
>
export type AdministratorClassroomUpdatePayload = Infer<
  typeof AdministratorClassroomUpdateValidator
>

// ---------------------------------------------------------------------------
// administrator/sports
// ---------------------------------------------------------------------------

export const SPORT_SORT_COLUMNS = ['name', 'createdAt'] as const

export function athletes() {
  return vine.number().withoutDecimals().min(1).max(LIST_LIMITS.ATHLETES)
}

export const AdministratorSportCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60),
  minAthletes: athletes(),
  maxAthletes: athletes(),
})

export const AdministratorSportUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(60).optional(),
  minAthletes: athletes().optional(),
  maxAthletes: athletes().optional(),
})

export type AdministratorSportCreatePayload = Infer<
  typeof AdministratorSportCreateValidator
>
export type AdministratorSportUpdatePayload = Infer<
  typeof AdministratorSportUpdateValidator
>

// ---------------------------------------------------------------------------
// administrator/announcements
// ---------------------------------------------------------------------------

export const ANNOUNCEMENT_SORT_COLUMNS = ['title', 'createdAt'] as const

export const AdministratorAnnouncementCreateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(160),
  body: vine.string().trim().minLength(1).maxLength(5000),
  pinned: vine.boolean().optional(),
})

export const AdministratorAnnouncementUpdateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(160).optional(),
  body: vine.string().trim().minLength(1).maxLength(5000).optional(),
  pinned: vine.boolean().optional(),
})

export type AdministratorAnnouncementCreatePayload = Infer<
  typeof AdministratorAnnouncementCreateValidator
>
export type AdministratorAnnouncementUpdatePayload = Infer<
  typeof AdministratorAnnouncementUpdateValidator
>

// ---------------------------------------------------------------------------
// administrator/brackets e matches
// ---------------------------------------------------------------------------

export const AdministratorBracketCreateValidator = vine.create({
  sportId: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
})

/**
 * A agenda. **Divergência deliberada do backend**, pelo mesmo motivo de
 * `wireDate()`: lá é `vine.date({ formats: ['iso8601'] })`; aqui o valor é o
 * texto que o campo `datetime-local` produz, convertido para ISO com fuso na
 * hora de enviar.
 */
export const AdministratorMatchUpdateValidator = vine.create({
  scheduledAt: vine.string().trim().maxLength(40).nullable().optional(),
  location: vine.string().trim().maxLength(120).nullable().optional(),
})

export const AdministratorMatchScoreValidator = vine.create({
  homeScore: vine.number().withoutDecimals().min(0).max(999),
  awayScore: vine.number().withoutDecimals().min(0).max(999),
  winnerTeamId: vine.string().uuid().optional(),
})

export type AdministratorBracketCreatePayload = Infer<
  typeof AdministratorBracketCreateValidator
>
export type AdministratorMatchUpdatePayload = Infer<
  typeof AdministratorMatchUpdateValidator
>
export type AdministratorMatchScorePayload = Infer<
  typeof AdministratorMatchScoreValidator
>

// ---------------------------------------------------------------------------
// advisor e representative
// ---------------------------------------------------------------------------

export const AdvisorStudentCreateValidator = vine.create({
  classroomId: vine.string().uuid(),
  name: vine.string().trim().minLength(1).maxLength(120),
})

export const AdvisorStudentUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
})

export function athleteListFields() {
  return {
    sportId: vine.string().uuid(),
    studentIds: vine
      .array(vine.string().uuid())
      .distinct()
      .maxLength(LIST_LIMITS.ATHLETES),
  }
}

export const AdvisorEnrollmentUpdateValidator = vine.create({
  classroomId: vine.string().uuid(),
  ...athleteListFields(),
})

export const RepresentativeEnrollmentUpdateValidator = vine.create({
  ...athleteListFields(),
})

export type AdvisorStudentCreatePayload = Infer<
  typeof AdvisorStudentCreateValidator
>
export type AdvisorStudentUpdatePayload = Infer<
  typeof AdvisorStudentUpdateValidator
>
export type AdvisorEnrollmentUpdatePayload = Infer<
  typeof AdvisorEnrollmentUpdateValidator
>
export type RepresentativeEnrollmentUpdatePayload = Infer<
  typeof RepresentativeEnrollmentUpdateValidator
>
