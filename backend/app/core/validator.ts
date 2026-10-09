import vine from '@vinejs/vine'
import env from '#start/env'
import type { Infer } from '@vinejs/vine/types'
import {
  ACTIVE_STATUSES,
  BRACKET_STATUSES,
  CATEGORIES,
  GRADES,
  MATCH_PHASES,
  MATCH_STATUSES,
  SORT_DIRECTIONS,
  TRASHED_MODES,
  UPLOAD_STATUSES,
  USER_ROLES,
} from '#core/entity'

/**
 * Fonte única dos schemas VineJS do backend.
 *
 * Um arquivo só, e não um `_shared.validator.ts` por feature: a duplicação
 * fica visível, e o import tem um alvo estável - `#core/validator`. Em
 * `backend-old` as regras estavam espalhadas por `app/infra/http/validators/`,
 * e a mesma regra de senha existia em três arquivos.
 *
 * O gerador de OpenAPI resolve estes validators pelo AST dos controllers, lendo
 * o especificador do import e reimportando o módulo. Renomear um export sem
 * atualizar o controller não quebra o build: a operação some do documento em
 * silêncio, e `node ace openapi:generate --check` é o que pega isso.
 *
 * A ordem é: regras compartilhadas, validators globais, e depois um bloco por
 * feature delimitado por banner - os blocos de feature nascem nas fases
 * seguintes.
 */

// ---------------------------------------------------------------------------
// Regras compartilhadas
// ---------------------------------------------------------------------------

/**
 * Regras reaproveitadas por mais de um recurso.
 *
 * São funções, não constantes: reaproveitar o mesmo nó de schema em dois
 * validators compartilharia as opções entre eles - o `optional()` de um
 * apareceria no outro.
 */

/**
 * Quantos itens cada lista aceita.
 *
 * Sem teto, `vine.array()` aceita o array que couber no corpo da requisição, e
 * o que chega vai inteiro para o banco.
 */
export const LIST_LIMITS = {
  /** Atletas de uma turma numa modalidade. Nenhuma modalidade escolar inscreve mais. */
  ATHLETES: 40,
} as const

export function email() {
  return vine.string().email().maxLength(254)
}

/**
 * Força da senha: um `regex` por classe de caractere, para a mensagem apontar
 * exatamente o que falta em vez de um "senha fraca" que não diz o que fazer.
 *
 * `confirmed` exige `passwordConfirmation` com o mesmo valor, lido do input
 * cru. Nenhum schema daqui o declara, e é só por isso que ele não aparece no
 * payload validado - não há o que descartar antes do `merge()`/`create()` no
 * use-case. O que o VineJS entrega é o que o schema declara.
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

/**
 * Status de conta. Canônico em inglês: o valor é identificador, e o rótulo em
 * português é do frontend.
 */
export function activeStatus() {
  return vine.enum(ACTIVE_STATUSES)
}

/**
 * Os três campos que toda listagem aceita. Espalhados
 * (`...paginationFields()`) pelos validators que ainda somam um filtro
 * próprio, para o teto de `perPage` viver num lugar só - repetido à mão em
 * cada recurso, é uma divergência esperando acontecer.
 */
export function paginationFields() {
  return {
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
    search: vine.string().maxLength(100).optional(),
  }
}

/**
 * O recorte de lixeira, para as listagens que têm o que restaurar.
 *
 * Fora de `paginationFields()` de propósito: se estivesse lá, apareceria também
 * nas listagens da vitrine, que nunca enxergam registro arquivado. O parâmetro
 * seria aceito, ignorado em silêncio, e o documento OpenAPI passaria a prometer
 * um filtro que não existe.
 */
export function trashedField() {
  return { trashed: vine.enum(TRASHED_MODES).optional() }
}

/**
 * A ordem de uma listagem, em dois campos: `sort` (a coluna) e `direction`.
 *
 * **Um par, e não um `order-<coluna>` por coluna.** Dois parâmetros de ordem ao
 * mesmo tempo não expressam precedência - `?order-title=asc&order-date=desc`
 * não diz qual vence -, e a consulta ordena por uma coluna só.
 *
 * **A coluna vem de uma lista fechada, declarada por recurso.** O valor entra
 * direto no `orderBy`, que o compõe no SQL: aceitar texto livre da URL seria
 * entregar a cláusula ao cliente. Coluna fora da lista é 422 apontando o campo,
 * e não um 500 do banco reclamando de coluna inexistente.
 *
 * Fora de `paginationFields()` pelo mesmo motivo de `trashedField()`: cada
 * recurso ordena pelo que tem, e um conjunto global prometeria no OpenAPI
 * colunas que metade das listagens não conhece.
 */
export function sortFields<const TColumns extends readonly [string, ...string[]]>(
  columns: TColumns
) {
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
 *
 * Existe para que um `:id` malformado seja 422 apontando o campo, e não um 500
 * do Postgres recusando o literal na cláusula `where`.
 */
export const IdentifierValidator = vine.create({
  id: vine.string().uuid(),
})

export const PaginationValidator = vine.create(vine.object(paginationFields()))

/**
 * A paginação dos recursos que têm lixeira. É o `PaginationValidator` mais o
 * `trashed`, e existe como schema próprio porque as listagens da vitrine
 * seguem sem ele.
 */
export const TrashablePaginationValidator = vine.create({
  ...paginationFields(),
  ...trashedField(),
})

export type IdentifierPayload = Infer<typeof IdentifierValidator>
export type PaginationPayload = Infer<typeof PaginationValidator>
export type TrashablePaginationPayload = Infer<typeof TrashablePaginationValidator>

// ---------------------------------------------------------------------------
// account
// ---------------------------------------------------------------------------

/**
 * A própria conta, editada pelo dono dela.
 *
 * **Todo campo é opcional**: campo ausente significa "não mexer", e não
 * "apagar". `backend-old` usava `PATCH` com um schema que exigia `name`,
 * `email`, `role` e `avatarId` - o verbo prometia parcial e o schema recusava
 * parcial.
 *
 * `role` e `status` não entram: o papel é definido na criação, pelo
 * administrador, e ninguém muda o próprio. Declará-los só para ignorar depois
 * convidaria alguém a tentar.
 */
export const AccountUpdateValidator = vine.create({
  name: vine.string().trim().maxLength(120).optional(),
  email: email().optional(),
  password: password().optional(),
  /**
   * A senha atual, exigida **só** quando `password` vem no payload.
   *
   * É prova de identidade, e não de força: quem sequestra uma sessão tem o
   * cookie, mas não sabe a senha. `PASSWORD_SAME_AS_CURRENT` não serve para
   * isso - ele compara a nova com o hash, e passar por ele é justamente não
   * saber a atual.
   *
   * `requiredIfExists` e não uma checagem no use-case: a obrigatoriedade
   * condicional é forma do payload, e aqui ela vira `422` apontando o campo -
   * é o que `backend-old` respondia como erro genérico
   * (`profile/use-cases/update.use-case.ts:22`).
   *
   * Sem as regras de força de `password()`: o valor é conferido contra o hash,
   * não gravado. O teto de 32 é o mesmo da política, porque é o maior valor que
   * a aplicação já pode ter gravado.
   */
  currentPassword: vine.string().maxLength(32).optional().requiredIfExists('password'),
  // `nullable` é o que permite tirar a foto sem trocá-la. O uuid só garante o
  // formato; que o arquivo exista é checado no use-case, senão a violação da
  // chave estrangeira estouraria como 500 em vez de 422.
  avatarId: vine.string().uuid().nullable().optional(),
})

export type AccountUpdatePayload = Infer<typeof AccountUpdateValidator>

// ---------------------------------------------------------------------------
// authentication
// ---------------------------------------------------------------------------

export const AuthenticationSignInValidator = vine.create({
  email: email(),
  // Entrar não valida força: a senha só é comparada com o hash guardado.
  // Exigir o formato atual aqui trancaria fora quem cadastrou antes de a regra
  // endurecer - e diria, pela mensagem de validação, qual é a política.
  password: vine.string().maxLength(128),
})

export type AuthenticationSignInPayload = Infer<typeof AuthenticationSignInValidator>

// ---------------------------------------------------------------------------
// storages
// ---------------------------------------------------------------------------

/**
 * Os tipos aceitos, e a extensão que cada um ganha na chave do objeto.
 *
 * O mapa existe porque o nome que o usuário enviou **não** é fonte confiável de
 * extensão - ele é rótulo, e `foto.png` pode ser um pdf. A extensão da chave
 * sai do `mimetype` declarado, que é o mesmo valor com que a URL é assinada e
 * que o bucket devolve na confirmação.
 *
 * `Record<StorageMimetype, string>` faz o compilador cobrar uma entrada por
 * tipo: acrescentar um mimetype na lista sem dizer que extensão ele tem quebra
 * a compilação, em vez de virar arquivo sem extensão no bucket.
 *
 * Áudio e vídeo entram porque o domínio os tem: um podcast guarda o arquivo de
 * áudio, e o `mp3` é o formato que `backend-old` já recebia.
 */
export const STORAGE_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // `image/svg+xml` saiu da lista: SVG é HTML, carrega `<script>`, e o bucket é
  // público - `storage.service.ts` devolve a URL assinada com o `contentType`
  // gravado, então o navegador o executa na origem do storage. Era XSS
  // armazenado por upload. O academy já não o aceitava.
  'application/pdf',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
] as const

export type StorageMimetype = (typeof STORAGE_MIMETYPES)[number]

export const STORAGE_EXTENSIONS: Record<StorageMimetype, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
}

/**
 * O teto por arquivo, em bytes. Vem do ambiente e não tem default: sem a
 * variável a aplicação nem sobe (`start/env.ts`). A coluna `size` é
 * `bigint` justamente para não impor aqui um teto que o operador não pediu.
 */
export const UPLOAD_MAX_SIZE = env.get('UPLOAD_MAX_SIZE')

/**
 * O que `POST /storages` recebe: metadados, nunca bytes.
 *
 * O binário vai do navegador direto ao bucket, então tipo e tamanho
 * são **declarados** aqui e conferidos contra o objeto real no
 * `POST /storages/:id/complete`. Recusar antes de assinar é o que impede um
 * arquivo proibido de chegar ao bucket; conferir depois é o que impede que o
 * declarado tenha sido mentira.
 */
export const StorageCreateValidator = vine.create({
  fileName: vine.string().trim().minLength(1).maxLength(255),
  mimetype: vine.enum(STORAGE_MIMETYPES),
  size: vine.number().min(1).max(UPLOAD_MAX_SIZE).withoutDecimals(),
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
      })
    )
    .optional(),
})

export type StorageCompletePayload = Infer<typeof StorageCompleteValidator>

/**
 * Por quais colunas a biblioteca de arquivos pode ser ordenada.
 *
 * Tupla fechada pelo mesmo motivo das outras: o valor entra direto no
 * `orderBy`, que o compõe no SQL, e texto livre da URL seria entregar a
 * cláusula ao cliente.
 *
 * `path` e `uploadId` ficam de fora de propósito - são detalhe do bucket e do
 * multipart, e ordenar por eles não é pergunta que a tela faça.
 */
export const STORAGE_SORT_COLUMNS = ['originalName', 'mimetype', 'size', 'createdAt'] as const

/**
 * O que `GET /storages` recebe.
 *
 * A biblioteca de arquivos do painel: `?search` acha pelo rótulo original, pelo
 * nome gerado ou pelo tipo - é a busca de `backend-old`, nas colunas que
 * sobreviveram ao de-para -, e `?status` e `?mimetype` recortam o que já subiu
 * e o que é imagem.
 *
 * Sem `trashedField()`: `storages` tem `deleted_at`, mas apagar arquivo é
 * `DELETE /storages/:id`, que remove a linha **e** o binário. Não há lixeira de
 * arquivo para restaurar, e o parâmetro seria aceito e ignorado em silêncio.
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
 * São as colunas que a tela mostra, e nada além: `password` é hash e ordenar
 * por ele não significa nada, e `avatar` é relação, que exigiria `join`.
 */
export const USER_SORT_COLUMNS = ['name', 'email', 'role', 'status', 'createdAt'] as const

/**
 * O papel de um usuário gerenciado pelo painel.
 *
 * Aqui é o enum inteiro, e não um recorte como no simple-hub: os três papéis
 * nascem pelo painel, e o privilégio de purge que lá pertence a um `OWNER`
 * inalcançável fica com o `ADMINISTRATOR`. Não há papel a excluir da lista.
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
 * entra no payload validado, então não há o que descartar antes do `merge()`.
 *
 * `status` é opcional porque a coluna tem `DEFAULT 'ACTIVE'`: a conta nasce
 * podendo entrar, e desativar é edição.
 */
export const AdministratorUserCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  email: email(),
  password: password(),
  role: manageableRole(),
  status: activeStatus().optional(),
  // `nullable` é o que permite tirar a foto sem trocá-la. O uuid só garante o
  // formato; que o arquivo exista é checado no use-case, senão a violação da
  // chave estrangeira estouraria como `500` em vez de `422`.
  avatarId: vine.string().uuid().nullable().optional(),
})

/**
 * O que `PUT /administrator/users/:id` recebe.
 *
 * **Todo campo é opcional**, inclusive os obrigatórios na criação: campo
 * ausente significa "não mexer", e não "apagar". Só `avatarId` aceita
 * `null` explícito.
 *
 * `role` entra aqui, ao contrário de `AccountUpdateValidator`: promover e
 * rebaixar é o que este recurso existe para fazer, e ninguém muda o próprio
 * papel por `/account`.
 */
export const AdministratorUserUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional(),
  email: email().optional(),
  password: password().optional(),
  role: manageableRole().optional(),
  status: activeStatus().optional(),
  avatarId: vine.string().uuid().nullable().optional(),
})

/**
 * O que `GET /administrator/users` aceita na query.
 *
 * Dois filtros próprios, que são os dois recortes da tela: `role` separa quem
 * administra de quem edita, e `status` separa quem entra de quem foi desativado
 * sem ser arquivado.
 */
export const AdministratorUserPaginationValidator = vine.create({
  ...paginationFields(),
  ...trashedField(),
  ...sortFields(USER_SORT_COLUMNS),
  role: manageableRole().optional(),
  status: activeStatus().optional(),
})

export type AdministratorUserCreatePayload = Infer<typeof AdministratorUserCreateValidator>
export type AdministratorUserUpdatePayload = Infer<typeof AdministratorUserUpdateValidator>
export type AdministratorUserPaginationPayload = Infer<typeof AdministratorUserPaginationValidator>

// ---------------------------------------------------------------------------
// administrator/classrooms
// ---------------------------------------------------------------------------

export const CLASSROOM_SORT_COLUMNS = ['name', 'grade', 'category', 'createdAt'] as const

/** O ano da turma. A categoria sai dele, e por isso ela não é campo de entrada. */
export function grade() {
  return vine.number().withoutDecimals().min(GRADES.MIN).max(GRADES.MAX)
}

/**
 * O que `POST /administrator/classrooms` recebe.
 *
 * Conselheiro e representante são opcionais: a turma nasce antes de alguém ser
 * indicado. Que a conta exista e tenha o papel certo é checado no use-case.
 */
export const AdministratorClassroomCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(20),
  grade: grade(),
  advisorId: vine.string().uuid().nullable().optional(),
  representativeId: vine.string().uuid().nullable().optional(),
})

/** Campo ausente é "não mexer"; `null` em conselheiro ou representante desfaz o vínculo. */
export const AdministratorClassroomUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(20).optional(),
  grade: grade().optional(),
  advisorId: vine.string().uuid().nullable().optional(),
  representativeId: vine.string().uuid().nullable().optional(),
})

export const AdministratorClassroomPaginationValidator = vine.create({
  ...paginationFields(),
  ...sortFields(CLASSROOM_SORT_COLUMNS),
  category: vine.enum(CATEGORIES).optional(),
})

export type AdministratorClassroomCreatePayload = Infer<
  typeof AdministratorClassroomCreateValidator
>
export type AdministratorClassroomUpdatePayload = Infer<
  typeof AdministratorClassroomUpdateValidator
>
export type AdministratorClassroomPaginationPayload = Infer<
  typeof AdministratorClassroomPaginationValidator
>

// ---------------------------------------------------------------------------
// administrator/sports
// ---------------------------------------------------------------------------

export const SPORT_SORT_COLUMNS = ['name', 'createdAt'] as const

/** Atletas por time. Que o mínimo não passe do máximo é checado no use-case. */
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

export const AdministratorSportPaginationValidator = vine.create({
  ...paginationFields(),
  ...sortFields(SPORT_SORT_COLUMNS),
})

export type AdministratorSportCreatePayload = Infer<typeof AdministratorSportCreateValidator>
export type AdministratorSportUpdatePayload = Infer<typeof AdministratorSportUpdateValidator>
export type AdministratorSportPaginationPayload = Infer<
  typeof AdministratorSportPaginationValidator
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

export const AdministratorAnnouncementPaginationValidator = vine.create({
  ...paginationFields(),
  ...sortFields(ANNOUNCEMENT_SORT_COLUMNS),
})

export type AdministratorAnnouncementCreatePayload = Infer<
  typeof AdministratorAnnouncementCreateValidator
>
export type AdministratorAnnouncementUpdatePayload = Infer<
  typeof AdministratorAnnouncementUpdateValidator
>
export type AdministratorAnnouncementPaginationPayload = Infer<
  typeof AdministratorAnnouncementPaginationValidator
>

// ---------------------------------------------------------------------------
// administrator/brackets
// ---------------------------------------------------------------------------

/**
 * O que `POST /administrator/brackets` recebe: qual competição sortear. O resto
 * - times, grupos e partidas - sai das inscrições e do sorteio.
 */
export const AdministratorBracketCreateValidator = vine.create({
  sportId: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
})

export const AdministratorBracketPaginationValidator = vine.create({
  ...paginationFields(),
  sportId: vine.string().uuid().optional(),
  category: vine.enum(CATEGORIES).optional(),
  status: vine.enum(BRACKET_STATUSES).optional(),
})

export type AdministratorBracketCreatePayload = Infer<typeof AdministratorBracketCreateValidator>
export type AdministratorBracketPaginationPayload = Infer<
  typeof AdministratorBracketPaginationValidator
>

// ---------------------------------------------------------------------------
// administrator/matches
// ---------------------------------------------------------------------------

/** Os filtros da tabela de jogos, iguais no painel e no site. */
export function matchFilterFields() {
  return {
    bracketId: vine.string().uuid().optional(),
    sportId: vine.string().uuid().optional(),
    category: vine.enum(CATEGORIES).optional(),
    phase: vine.enum(MATCH_PHASES).optional(),
    status: vine.enum(MATCH_STATUSES).optional(),
  }
}

export const AdministratorMatchPaginationValidator = vine.create({
  ...paginationFields(),
  ...matchFilterFields(),
})

/**
 * A agenda da partida. `scheduledAt` em ISO 8601 com fuso: a escola joga no
 * horário local, e o servidor grava em UTC.
 */
export const AdministratorMatchUpdateValidator = vine.create({
  scheduledAt: vine
    .date({ formats: ['iso8601'] })
    .nullable()
    .optional(),
  location: vine.string().trim().maxLength(120).nullable().optional(),
})

/**
 * O placar. `winnerTeamId` só é lido no mata-mata empatado - o vencedor nos
 * pênaltis; em qualquer outro caso o placar decide sozinho.
 */
export const AdministratorMatchScoreValidator = vine.create({
  homeScore: vine.number().withoutDecimals().min(0).max(999),
  awayScore: vine.number().withoutDecimals().min(0).max(999),
  winnerTeamId: vine.string().uuid().optional(),
})

export type AdministratorMatchPaginationPayload = Infer<
  typeof AdministratorMatchPaginationValidator
>
export type AdministratorMatchUpdatePayload = Infer<typeof AdministratorMatchUpdateValidator>
export type AdministratorMatchScorePayload = Infer<typeof AdministratorMatchScoreValidator>

// ---------------------------------------------------------------------------
// advisor
// ---------------------------------------------------------------------------

export const AdvisorStudentPaginationValidator = vine.create({
  ...paginationFields(),
  classroomId: vine.string().uuid().optional(),
})

export const AdvisorStudentCreateValidator = vine.create({
  classroomId: vine.string().uuid(),
  name: vine.string().trim().minLength(1).maxLength(120),
})

/** Só o nome: trocar o aluno de turma é apagar e cadastrar na outra. */
export const AdvisorStudentUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
})

export const AdvisorEnrollmentShowValidator = vine.create({
  classroomId: vine.string().uuid(),
})

/** A lista de atletas de uma modalidade, inteira: substitui a anterior. */
export function athleteListFields() {
  return {
    sportId: vine.string().uuid(),
    studentIds: vine.array(vine.string().uuid()).distinct().maxLength(LIST_LIMITS.ATHLETES),
  }
}

export const AdvisorEnrollmentUpdateValidator = vine.create({
  classroomId: vine.string().uuid(),
  ...athleteListFields(),
})

export type AdvisorStudentPaginationPayload = Infer<typeof AdvisorStudentPaginationValidator>
export type AdvisorStudentCreatePayload = Infer<typeof AdvisorStudentCreateValidator>
export type AdvisorStudentUpdatePayload = Infer<typeof AdvisorStudentUpdateValidator>
export type AdvisorEnrollmentShowPayload = Infer<typeof AdvisorEnrollmentShowValidator>
export type AdvisorEnrollmentUpdatePayload = Infer<typeof AdvisorEnrollmentUpdateValidator>

// ---------------------------------------------------------------------------
// representative
// ---------------------------------------------------------------------------

/** Sem `classroomId`: a turma do representante sai da sessão, nunca do payload. */
export const RepresentativeEnrollmentUpdateValidator = vine.create({
  ...athleteListFields(),
})

export type RepresentativeEnrollmentUpdatePayload = Infer<
  typeof RepresentativeEnrollmentUpdateValidator
>

// ---------------------------------------------------------------------------
// storefront
// ---------------------------------------------------------------------------

/**
 * O que o site aceita na query. **Sem `trashed`**: nada daqui tem lixeira, e o
 * parâmetro seria aceito e ignorado em silêncio.
 */
export const StorefrontMatchPaginationValidator = vine.create({
  ...paginationFields(),
  ...matchFilterFields(),
})

export const StorefrontBracketPaginationValidator = vine.create({
  ...paginationFields(),
  sportId: vine.string().uuid().optional(),
  category: vine.enum(CATEGORIES).optional(),
})

export type StorefrontMatchPaginationPayload = Infer<typeof StorefrontMatchPaginationValidator>
export type StorefrontBracketPaginationPayload = Infer<typeof StorefrontBracketPaginationValidator>

/**
 * O identificador público de uma modalidade. O teto de 255 é o da coluna - sem
 * ele, uma URL absurdamente longa viraria uma consulta ao banco.
 */
export const SlugValidator = vine.create({
  slug: vine.string().trim().minLength(1).maxLength(255),
})

export type SlugPayload = Infer<typeof SlugValidator>
