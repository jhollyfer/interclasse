/**
 * Vocabulário do domínio: os enums e a forma da resposta paginada.
 *
 * Tudo aqui é consumido pelas duas pontas - a migration, que grava, e o
 * validator, que recusa. Manter numa fonte só é o que impede o banco e a
 * validação de divergirem sem ninguém notar.
 *
 * A forma é sempre a mesma: objeto `as const`, tipo derivado dele, e o array
 * de valores por `Object.values`. `backend-old` usava `enum` do TypeScript, que
 * emite objeto em tempo de execução e não se espalha num `vine.enum()` sem
 * conversão - e, pior, deixa o valor gravado no banco e o literal do código
 * livres para divergirem.
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
 * `Merge<AccountUpdatePayload, { userId: string }>`.
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
 * Sem `OWNER`: o purge que os irmãos reservam a ele fica com o administrador,
 * como no adacaibs.
 */
export const UserRoles = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  ADVISOR: 'ADVISOR',
  REPRESENTATIVE: 'REPRESENTATIVE',
} as const

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles]

export const USER_ROLES = Object.values(UserRoles)

/**
 * Quem opera o painel administrativo, e não só a própria turma.
 *
 * Existe à parte de `USER_ROLES` para que papel novo nasça **de fora**: entraria
 * em `UserRoles` sem entrar aqui, e ficaria de fora das checagens por omissão.
 */
export const STAFF_USER_ROLES: ReadonlyArray<UserRole> = [UserRoles.ADMINISTRATOR]

/**
 * Se a conta pode entrar. Substitui o `UserStatus` de `backend-old`, com os
 * mesmos dois valores e nome genérico: é o par ativo/inativo, e nada nele é
 * específico de usuário.
 *
 * Chave e valor em caixa alta: o valor do enum é identificador, não texto de
 * interface - o rótulo em português é do frontend.
 */
export const ActiveStatuses = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type ActiveStatus = (typeof ActiveStatuses)[keyof typeof ActiveStatuses]

export const ACTIVE_STATUSES = Object.values(ActiveStatuses)

// ---------------------------------------------------------------------------
// Jogos
// ---------------------------------------------------------------------------

/**
 * A categoria de uma turma. Turmas de categorias diferentes nunca se enfrentam:
 * cada modalidade tem uma chave por categoria.
 */
export const Categories = {
  /** Fundamental 1: do 3º ao 5º ano. */
  F1: 'F1',
  /** Fundamental 2: do 6º ao 9º ano. */
  F2: 'F2',
} as const

export type Category = (typeof Categories)[keyof typeof Categories]

export const CATEGORIES = Object.values(Categories)

/** Os anos que a escola tem. Fora daqui não há turma. */
export const GRADES = { MIN: 3, MAX: 9 } as const

/**
 * A categoria que o ano determina. Derivada, e nunca enviada pelo cliente: um
 * 9º ano gravado como `F1` jogaria contra crianças de 8 anos.
 */
export function categoryOf(grade: number): Category {
  if (grade <= 5) return Categories.F1

  return Categories.F2
}

/**
 * Onde a competição de uma modalidade numa categoria está: em disputa ou
 * encerrada, com campeão.
 *
 * Não existe chave "aberta": antes do sorteio a linha simplesmente não existe,
 * e é a ausência dela que deixa as inscrições abertas.
 */
export const BracketStatuses = {
  KNOCKOUT: 'KNOCKOUT',
  FINISHED: 'FINISHED',
} as const

export type BracketStatus = (typeof BracketStatuses)[keyof typeof BracketStatuses]

export const BRACKET_STATUSES = Object.values(BracketStatuses)

/** A fase de uma partida, nomeada pelo número de times que entram nela. */
export const MatchPhases = {
  ROUND_OF_16: 'ROUND_OF_16',
  QUARTER: 'QUARTER',
  SEMI: 'SEMI',
  FINAL: 'FINAL',
} as const

export type MatchPhase = (typeof MatchPhases)[keyof typeof MatchPhases]

export const MATCH_PHASES = Object.values(MatchPhases)

/** Uma partida está marcada ou tem placar. Não há "em andamento": o placar entra ao final. */
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
 * O estado de um arquivo enquanto ele sobe. Existe porque o binário não passa
 * mais por esta aplicação: `POST /storages` grava a linha e devolve URLs
 * assinadas, o navegador sobe as partes direto no bucket, e só depois
 * `POST /storages/:id/complete` confirma. Entre uma coisa e outra a linha
 * existe sem binário íntegro, e é isso que `PENDING` nomeia.
 *
 * Só `UPLOADED` pode ser anexado a alguma coisa - `StorageService.assertExist`
 * recusa o resto, para nada apontar para um arquivo pela metade.
 */
export const UploadStatuses = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
} as const

export type UploadStatus = (typeof UploadStatuses)[keyof typeof UploadStatuses]

export const UPLOAD_STATUSES = Object.values(UploadStatuses)

// ---------------------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------------------

/**
 * O recorte de lixeira das listagens. Ausente é o de sempre - só ativos -,
 * então nenhuma leitura muda de resposta para quem não pediu.
 *
 * Aqui é `deletedAt`, a remoção lógica.
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
 * O sentido da ordenação de uma listagem. Ausente é `asc`, que é a ordem que
 * as listagens já tinham antes de aceitarem o parâmetro.
 */
export const SortDirections = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export type SortDirection = (typeof SortDirections)[keyof typeof SortDirections]

export const SORT_DIRECTIONS = Object.values(SortDirections)

/**
 * A ordem que a consulta vai usar: o que o payload pediu, ou o padrão do
 * recurso. Feito para ser espalhado - `query.orderBy(...sortOrder(payload,
 * 'createdAt'))`.
 *
 * O `fallback` é obrigatório porque é a ordem que a listagem já tinha antes de
 * aceitar o parâmetro: quem não manda `?sort` recebe exatamente a mesma
 * resposta de antes.
 *
 * A coluna não é conferida aqui - quem fecha a lista é o `sortFields()` do
 * validator, antes de o payload chegar ao use-case.
 *
 * Só serve a listagem cujo padrão é **crescente** - catálogo, cadastro, tudo
 * que se lê em ordem alfabética. Feed cronológico usa `recentFirst()`.
 */
export function sortOrder<TColumn extends string>(
  payload: { sort?: TColumn; direction?: SortDirection },
  fallback: TColumn
): [TColumn, SortDirection] {
  return [payload.sort ?? fallback, payload.direction ?? SortDirections.ASC]
}

/**
 * A ordem de uma listagem cronológica: `createdAt` **decrescente**, ao
 * contrário de todas as outras. Espalhado como o irmão -
 * `query.orderBy(...recentFirst(payload))`.
 *
 * Existe porque `sortOrder()` assume `asc`, e num feed o que interessa é o
 * último registro, não o primeiro.
 *
 * Função com nome próprio, e não um parâmetro de direção em `sortOrder()`: a
 * exceção fica visível na chamada, em vez de escondida atrás de um argumento
 * que ninguém lê ao passar os olhos pela consulta.
 */
export function recentFirst<TColumn extends string>(payload: {
  sort?: TColumn
  direction?: SortDirection
}): [TColumn | 'createdAt', SortDirection] {
  return [payload.sort ?? 'createdAt', payload.direction ?? SortDirections.DESC]
}

// ---------------------------------------------------------------------------
// Paginação
// ---------------------------------------------------------------------------

/**
 * A resposta paginada como ela sai no fio, tipada.
 *
 * O paginator do Lucid não serve para isso: `ModelPaginatorContract.toJSON()`
 * devolve `{ meta: any; data: ModelObject[] }` - perde o tipo do item e ainda
 * traz um `any`. Devolver o paginator cru também não serve: o registry do Tuyau
 * infere a resposta do retorno do controller, e o front receberia o tipo da
 * classe (com `serialize`, `toJSON` e mais 55 membros) em vez do JSON.
 *
 * Montar `{ meta: paginator.getMeta(), data: paginator.all() }` resolve os dois:
 * `all()` mantém `T[]`, e o `any` de `getMeta()` morre nesta fronteira.
 */
export type PaginationMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
  firstPageUrl: string
  lastPageUrl: string
  nextPageUrl: string | null
  previousPageUrl: string | null
}

export type Paginated<T> = {
  meta: PaginationMeta
  data: T[]
}

/**
 * A mensagem de um erro qualquer, para log.
 *
 * `catch` entrega `unknown`, e quem loga precisa de texto. A guarda com retorno
 * cedo em vez de ternário: `error instanceof Error ? error.message : error`
 * apareceu igual em cada `catch` de comando, e ainda interpolava um `unknown`
 * direto no template - que sai como `[object Object]` quando o erro não é um
 * `Error`.
 */
export function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message

  return String(error)
}
