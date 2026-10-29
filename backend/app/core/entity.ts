/**
 * Vocabulário do domínio: os enums e a forma da resposta paginada.
 *
 * Tudo aqui é consumido pelas duas pontas - a migration, que grava, e o
 * validator, que recusa. Manter numa fonte só é o que impede o banco e a
 * validação de divergirem sem ninguém notar.
 *
 * A forma é sempre a mesma: objeto `as const`, tipo derivado dele, e o array
 * de valores por `Object.values`. `enum` do TypeScript (_standards/typescript.md §4)
 * emitiria objeto em tempo de execução, não se espalharia num `vine.enum()` sem
 * conversão e deixaria o valor gravado no banco e o literal do código livres
 * para divergirem.
 */

// ---------------------------------------------------------------------------
// Tipos utilitários
// ---------------------------------------------------------------------------

/**
 * Junta dois tipos objeto num só, achatado.
 *
 * `A & B` funciona e lê mal: o editor mostra a cadeia de interseção em vez do
 * tipo final, e chave repetida vira `never` silenciosamente. Mapear as chaves
 * resolve as duas coisas - o hover mostra o objeto resultante, campo a campo.
 *
 * É o que os use-cases usam para somar o escopo da sessão ao payload validado:
 * `Merge<ProfileUpdatePayload, { userId: string }>`.
 */
/**
 * Os defaults de paginação, num lugar só.
 *
 * Eram duas constantes locais em cada caso de uso de listagem. Um teto novo
 * exigia achar todas, e a que ficasse para trás não quebraria nada: responderia
 * outra coisa, calada.
 *
 * Aqui e não em `validator.ts` porque isto é default de leitura, não regra de
 * entrada. O teto que o cliente pode pedir continua no validator, que é onde ele
 * é cobrado.
 */
export const PAGINATION = { PAGE: 1, PER_PAGE: 20 } as const

export type Merge<A, B> = { [K in keyof (A & B)]: (A & B)[K] }

// ---------------------------------------------------------------------------
// Papéis e status de conta
// ---------------------------------------------------------------------------

/**
 * O papel do usuário. Lookup object em vez de union solto: a chave nomeia o
 * papel no código, o valor é o que vai para o banco e para a API, e o tipo sai
 * derivado - não há literal repetido para divergir.
 *
 * Três papéis, um por responsabilidade nos jogos:
 *
 * - `ADMINISTRATOR`: a organização. Cadastra turmas, modalidades e contas,
 *   sorteia as chaves e lança placar.
 * - `ADVISOR`: o professor conselheiro. Mantém os alunos das turmas que
 *   aconselha e as inscrições delas.
 * - `REPRESENTATIVE`: o aluno representante. Monta a lista de atletas por
 *   modalidade da própria turma, e nada além disso.
 *
 * Sem `OWNER`: o purge fica com o administrador.
 */
export const USER_ROLE = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  ADVISOR: 'ADVISOR',
  REPRESENTATIVE: 'REPRESENTATIVE',
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export const USER_ROLES = Object.values(USER_ROLE)

/**
 * Quem opera o painel administrativo, e não só a própria turma.
 *
 * Existe à parte de `USER_ROLES` para que papel novo nasça **de fora**: entraria
 * em `USER_ROLE` sem entrar aqui, e ficaria de fora das checagens por omissão.
 */
export const STAFF_USER_ROLES: ReadonlyArray<UserRole> = [USER_ROLE.ADMINISTRATOR]

/**
 * Se a conta pode entrar. Nome genérico: é o par ativo/inativo, e nada nele é
 * específico de usuário.
 *
 * Chave e valor em caixa alta: o valor do enum é identificador, não texto de
 * interface - o rótulo em português é do frontend.
 */
export const ACTIVE_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type ActiveStatus = (typeof ACTIVE_STATUS)[keyof typeof ACTIVE_STATUS]

export const ACTIVE_STATUSES = Object.values(ACTIVE_STATUS)

// ---------------------------------------------------------------------------
// Jogos
// ---------------------------------------------------------------------------

/**
 * A categoria de uma turma. Turmas de categorias diferentes nunca se enfrentam:
 * cada modalidade tem uma chave por categoria.
 */
export const CATEGORY = {
  /** Fundamental 1: do 3º ao 5º ano. */
  F1: 'F1',
  /** Fundamental 2: do 6º ao 9º ano. */
  F2: 'F2',
} as const

export type Category = (typeof CATEGORY)[keyof typeof CATEGORY]

export const CATEGORIES = Object.values(CATEGORY)

/** Os anos que a escola tem. Fora daqui não há turma. */
export const GRADES = { MIN: 3, MAX: 9 } as const

/**
 * Onde a competição de uma modalidade numa categoria está: em disputa ou
 * encerrada, com campeão.
 *
 * Não existe chave "aberta": antes do sorteio a linha simplesmente não existe,
 * e é a ausência dela que deixa as inscrições abertas.
 */
export const BRACKET_STATUS = {
  KNOCKOUT: 'KNOCKOUT',
  FINISHED: 'FINISHED',
} as const

export type BracketStatus = (typeof BRACKET_STATUS)[keyof typeof BRACKET_STATUS]

export const BRACKET_STATUSES = Object.values(BRACKET_STATUS)

/** A fase de uma partida, nomeada pelo número de times que entram nela. */
export const MATCH_PHASE = {
  ROUND_OF_16: 'ROUND_OF_16',
  QUARTER: 'QUARTER',
  SEMI: 'SEMI',
  FINAL: 'FINAL',
} as const

export type MatchPhase = (typeof MATCH_PHASE)[keyof typeof MATCH_PHASE]

export const MATCH_PHASES = Object.values(MATCH_PHASE)

/** Uma partida está marcada ou tem placar. Não há "em andamento": o placar entra ao final. */
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
 * O estado de um arquivo enquanto ele sobe. Existe porque o binário não passa
 * mais por esta aplicação: `POST /storages` grava a linha e devolve URLs
 * assinadas, o navegador sobe as partes direto no bucket, e só depois
 * `POST /storages/:id/complete` confirma. Entre uma coisa e outra a linha
 * existe sem binário íntegro, e é isso que `PENDING` nomeia.
 *
 * Só `UPLOADED` pode ser anexado a alguma coisa - `StorageService.assertExist`
 * recusa o resto, para nada apontar para um arquivo pela metade.
 */
export const UPLOAD_STATUS = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
} as const

export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS]

export const UPLOAD_STATUSES = Object.values(UPLOAD_STATUS)

// ---------------------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------------------

/**
 * O recorte de lixeira das listagens. Ausente é o de sempre - só ativos -,
 * então nenhuma leitura muda de resposta para quem não pediu.
 *
 * Aqui é `deletedAt`, a remoção lógica.
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
 * O sentido da ordenação de uma listagem. Ausente é `asc`, que é a ordem que
 * as listagens já tinham antes de aceitarem o parâmetro.
 */
export const SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export type SortDirection = (typeof SORT_DIRECTION)[keyof typeof SORT_DIRECTION]

export const SORT_DIRECTIONS = Object.values(SORT_DIRECTION)
