/**
 * O vocabulário do domínio - cópia de `backend/app/core/entity.ts`.
 *
 * Mora fora de `validator.ts`, e não por arrumação: aquele arquivo faz
 * `vine.messagesProvider = messages` no escopo do módulo e monta cada validator
 * com `vine.create({...})` no topo. São efeitos no topo, e o Rollup não poda
 * módulo com efeito no topo - então **um** `import { MatchPhases }`
 * arrastaria o VineJS inteiro e o arquivo de schemas para dentro do bundle de
 * quem importou.
 *
 * Quem paga essa conta é o site público: as páginas leem constante daqui só
 * para desenhar um rótulo de fase, e não têm por que embarcar uma biblioteca de
 * validação de servidor para ler a string `'FINAL'`.
 *
 * Aqui não entra nada que dependa de `vine`. `validator.ts` reexporta tudo,
 * então quem já importava de lá continua funcionando - mas código novo que só
 * precisa do vocabulário importa **deste** arquivo.
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
export const UserRoles = {
  /** A organização dos jogos: cadastra, sorteia e lança placar. */
  ADMINISTRATOR: 'ADMINISTRATOR',
  /** O professor conselheiro: alunos e inscrições das próprias turmas. */
  ADVISOR: 'ADVISOR',
  /** O aluno representante: a lista de atletas da própria turma. */
  REPRESENTATIVE: 'REPRESENTATIVE',
} as const

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles]

export const USER_ROLES = Object.values(UserRoles)

/**
 * Se a conta pode entrar. É o par ativo/inativo, e nada nele é específico de
 * usuário.
 */
export const ActiveStatuses = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type ActiveStatus = (typeof ActiveStatuses)[keyof typeof ActiveStatuses]

export const ACTIVE_STATUSES = Object.values(ActiveStatuses)

// ---------------------------------------------------------------------------
// Jogos - cópia de `backend/app/core/entity.ts`
// ---------------------------------------------------------------------------

/** Fundamental 1 (3º ao 5º) e Fundamental 2 (6º ao 9º). Nunca se enfrentam. */
export const Categories = {
  F1: 'F1',
  F2: 'F2',
} as const

export type Category = (typeof Categories)[keyof typeof Categories]

export const CATEGORIES = Object.values(Categories)

/** Os anos que a escola tem. */
export const GRADES = { MIN: 3, MAX: 9 } as const

export const BracketStatuses = {
  KNOCKOUT: 'KNOCKOUT',
  FINISHED: 'FINISHED',
} as const

export type BracketStatus =
  (typeof BracketStatuses)[keyof typeof BracketStatuses]

export const BRACKET_STATUSES = Object.values(BracketStatuses)

export const MatchPhases = {
  ROUND_OF_16: 'ROUND_OF_16',
  QUARTER: 'QUARTER',
  SEMI: 'SEMI',
  FINAL: 'FINAL',
} as const

export type MatchPhase = (typeof MatchPhases)[keyof typeof MatchPhases]

export const MATCH_PHASES = Object.values(MatchPhases)

export const MatchStatuses = {
  SCHEDULED: 'SCHEDULED',
  FINISHED: 'FINISHED',
} as const

export type MatchStatus = (typeof MatchStatuses)[keyof typeof MatchStatuses]

export const MATCH_STATUSES = Object.values(MatchStatuses)

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
export const UploadStatuses = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
} as const

export type UploadStatus = (typeof UploadStatuses)[keyof typeof UploadStatuses]

export const UPLOAD_STATUSES = Object.values(UploadStatuses)

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
  'image/svg+xml',
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
export const TrashedModes = {
  /** Só o que está na lixeira. É a listagem da tela de restauração. */
  ONLY: 'only',
  /** Ativos e removidos juntos. */
  WITH: 'with',
} as const

export type TrashedMode = (typeof TrashedModes)[keyof typeof TrashedModes]

export const TRASHED_MODES = Object.values(TrashedModes)

/**
 * O sentido da ordenação de uma listagem. Ausente é `asc`, que é a ordem que as
 * listagens já tinham antes de aceitarem o parâmetro.
 */
export const SortDirections = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export type SortDirection = (typeof SortDirections)[keyof typeof SortDirections]

export const SORT_DIRECTIONS = Object.values(SortDirections)
