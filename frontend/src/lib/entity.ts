/**
 * O vocabulário do domínio - cópia de `backend/app/core/entity.ts`, na forma
 * da régua: objeto `as const` (`USER_ROLE`), tipo (`UserRole`) e lista
 * (`USER_ROLES`).
 *
 * Fora de `validator.ts` porque aquele módulo tem efeito no topo (configura o
 * `vine`) e não é podável: o site público lê constante daqui só para desenhar
 * um rótulo e não tem por que embarcar o VineJS. Nada aqui depende de `vine`.
 */

// ---------------------------------------------------------------------------
// Papéis e status de conta - cópia de `backend/app/core/entity.ts`
// ---------------------------------------------------------------------------

/**
 * Lookup object em vez de union solto, como no backend: a chave nomeia o valor
 * no código, o valor é o que vai para a API, e o tipo sai derivado - não há
 * literal repetido para divergir. O rótulo em português mora em `lib/labels.ts`,
 * porque é apresentação.
 */
export const USER_ROLE = {
  /** A organização dos jogos: cadastra, sorteia e lança placar. */
  ADMINISTRATOR: 'ADMINISTRATOR',
  /** O professor conselheiro: alunos e inscrições das próprias turmas. */
  ADVISOR: 'ADVISOR',
  /** O aluno representante: a lista de atletas da própria turma. */
  REPRESENTATIVE: 'REPRESENTATIVE',
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export const USER_ROLES = Object.values(USER_ROLE)

/**
 * Se a conta pode entrar. É o par ativo/inativo, e nada nele é específico de
 * usuário.
 */
export const ACTIVE_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type ActiveStatus = (typeof ACTIVE_STATUS)[keyof typeof ACTIVE_STATUS]

export const ACTIVE_STATUSES = Object.values(ACTIVE_STATUS)

// ---------------------------------------------------------------------------
// Jogos - cópia de `backend/app/core/entity.ts`
// ---------------------------------------------------------------------------

/** Fundamental 1 (3º ao 5º) e Fundamental 2 (6º ao 9º). Nunca se enfrentam. */
export const CATEGORY = {
  F1: 'F1',
  F2: 'F2',
} as const

export type Category = (typeof CATEGORY)[keyof typeof CATEGORY]

export const CATEGORIES = Object.values(CATEGORY)

/** Os anos que a escola tem. */
export const GRADES = { MIN: 3, MAX: 9 } as const

export const BRACKET_STATUS = {
  KNOCKOUT: 'KNOCKOUT',
  FINISHED: 'FINISHED',
} as const

export type BracketStatus = (typeof BRACKET_STATUS)[keyof typeof BRACKET_STATUS]

export const BRACKET_STATUSES = Object.values(BRACKET_STATUS)

/** A foto do carrossel: a do conselheiro espera a aprovação da organização. */
export const PHOTO_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export type PhotoStatus = (typeof PHOTO_STATUS)[keyof typeof PHOTO_STATUS]

export const PHOTO_STATUSES = Object.values(PHOTO_STATUS)

export const MATCH_PHASE = {
  ROUND_OF_16: 'ROUND_OF_16',
  QUARTER: 'QUARTER',
  SEMI: 'SEMI',
  FINAL: 'FINAL',
} as const

export type MatchPhase = (typeof MATCH_PHASE)[keyof typeof MATCH_PHASE]

export const MATCH_PHASES = Object.values(MATCH_PHASE)

export const MATCH_STATUS = {
  SCHEDULED: 'SCHEDULED',
  FINISHED: 'FINISHED',
} as const

export type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS]

export const MATCH_STATUSES = Object.values(MATCH_STATUS)

/** A cor do cartão que um atleta levou numa partida. */
export const CARD_COLOR = {
  YELLOW: 'YELLOW',
  RED: 'RED',
} as const

export type CardColor = (typeof CARD_COLOR)[keyof typeof CARD_COLOR]

export const CARD_COLORS = Object.values(CARD_COLOR)

// ---------------------------------------------------------------------------
// Arquivos
// ---------------------------------------------------------------------------

/**
 * O estado de um arquivo enquanto ele sobe. O binário não passa pela API: o
 * `POST /storages` grava a linha e devolve URLs assinadas, o navegador sobe as
 * partes direto no bucket, e `POST /storages/:id/complete` confirma. Entre uma
 * coisa e outra a linha existe sem binário íntegro, e é isso que `PENDING`
 * nomeia - o backend recusa anexar o que não estiver `UPLOADED`.
 */
export const UPLOAD_STATUS = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
} as const

export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS]

export const UPLOAD_STATUSES = Object.values(UPLOAD_STATUS)

/**
 * Os tipos que o backend aceita anexar, espelhando `STORAGE_MIMETYPES` de
 * `backend/app/core/validator.ts`.
 *
 * Existe aqui para o cliente recusar antes de gastar uma requisição - e, mais
 * importante, para dizer *qual* arquivo não serve. Sem a lista, um `.zip`
 * escolhido por engano só viraria um `422` genérico depois do envio do
 * formulário. A recusa que vale continua sendo a do servidor.
 *
 * Os quatro tipos de áudio estão aqui porque este projeto tem podcast, e o
 * episódio é um arquivo como qualquer outro.
 */
export const STORAGE_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
] as const

export type StorageMimetype = (typeof STORAGE_MIMETYPES)[number]

export function isStorageMimetype(value: string): value is StorageMimetype {
  return STORAGE_MIMETYPES.some((mimetype) => mimetype === value)
}

/**
 * Os dois recortes de `STORAGE_MIMETYPES` que viram campo de formulário.
 *
 * O `accept` do seletor nativo e a recusa antes do `POST /storages` saem daqui,
 * e não de uma string escrita à mão em cada campo: somados ao pdf eles são a
 * lista inteira, e uma cópia manual sairia dela na primeira mudança do backend.
 */
export const IMAGE_MIMETYPES = STORAGE_MIMETYPES.filter((mimetype) =>
  mimetype.startsWith('image/'),
)

export const AUDIO_MIMETYPES = STORAGE_MIMETYPES.filter((mimetype) =>
  mimetype.startsWith('audio/'),
)

// ---------------------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------------------

/**
 * O recorte de lixeira das listagens. Ausente é o de sempre - só ativos.
 *
 * Os valores são **minúsculos**, ao contrário de todo o resto daqui: é o que o
 * backend declara, e o que ele compara. `'ONLY'` na URL não é lixeira vazia, é
 * `422`.
 *
 * Aqui é `deletedAt`, a remoção lógica - hoje só contas e arquivos a têm.
 */
export const TRASHED_MODE = {
  /** Só o que está na lixeira. É a listagem da tela de restauração. */
  ONLY: 'only',
  /** Ativos e removidos juntos. */
  WITH: 'with',
} as const

export type TrashedMode = (typeof TRASHED_MODE)[keyof typeof TRASHED_MODE]

export const TRASHED_MODES = Object.values(TRASHED_MODE)

/**
 * O sentido da ordenação de uma listagem. Ausente é `asc`, que é a ordem que as
 * listagens já tinham antes de aceitarem o parâmetro.
 */
export const SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export type SortDirection = (typeof SORT_DIRECTION)[keyof typeof SORT_DIRECTION]

export const SORT_DIRECTIONS = Object.values(SORT_DIRECTION)
