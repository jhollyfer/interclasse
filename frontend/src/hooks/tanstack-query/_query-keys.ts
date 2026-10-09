import type { ListSearch, StorefrontSearch } from '#/lib/list-search'

/**
 * As chaves de cache, num lugar só.
 *
 * `list` é a tabela (paginação clássica, filtro na URL) e `detail` é um
 * registro só. São formatos diferentes de cache para o mesmo recurso, e todos
 * começam pelo mesmo prefixo - invalidar por ele cobre os dois de uma vez.
 *
 * O arquivo é seccionado por comentário. Todo recurso tem o mesmo bloco de três
 * linhas - `all`, `list` e `detail` -, e é de propósito: um formato por recurso
 * é onde um deles ganha uma chave que a invalidação do vizinho não alcança.
 */
export const queryKeys = {
  // Sessão

  account: {
    all: ['account'] as const,
  },

  // Painel

  users: {
    all: ['users'] as const,
    list: (params: ListSearch) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },

  classrooms: {
    all: ['classrooms'] as const,
    list: (params: ListSearch) => ['classrooms', 'list', params] as const,
    detail: (id: string) => ['classrooms', 'detail', id] as const,
  },

  sports: {
    all: ['sports'] as const,
    list: (params: ListSearch) => ['sports', 'list', params] as const,
    detail: (id: string) => ['sports', 'detail', id] as const,
  },

  announcements: {
    all: ['announcements'] as const,
    list: (params: ListSearch) => ['announcements', 'list', params] as const,
    detail: (id: string) => ['announcements', 'detail', id] as const,
  },

  /**
   * Chave e partida invalidam juntas: placar muda a classificação, e sorteio
   * cria partidas. Por isso as duas moram sob `games`.
   */
  brackets: {
    all: ['games', 'brackets'] as const,
    list: (params: ListSearch) =>
      ['games', 'brackets', 'list', params] as const,
    detail: (id: string) => ['games', 'brackets', 'detail', id] as const,
  },

  matches: {
    all: ['games', 'matches'] as const,
    list: (params: ListSearch) => ['games', 'matches', 'list', params] as const,
  },

  games: {
    all: ['games'] as const,
  },

  // Conselheiro e representante

  advisorClassrooms: {
    all: ['advisorClassrooms'] as const,
    list: (params: ListSearch) =>
      ['advisorClassrooms', 'list', params] as const,
  },

  students: {
    all: ['students'] as const,
    list: (params: ListSearch) => ['students', 'list', params] as const,
  },

  enrollments: {
    all: ['enrollments'] as const,
    board: (classroomId: string | null) =>
      ['enrollments', 'board', classroomId] as const,
  },

  // Site

  storefront: {
    all: ['storefront'] as const,
    sports: ['storefront', 'sports'] as const,
    announcements: (params: StorefrontSearch) =>
      ['storefront', 'announcements', params] as const,
    matches: (params: StorefrontSearch) =>
      ['storefront', 'matches', params] as const,
    brackets: (params: StorefrontSearch) =>
      ['storefront', 'brackets', params] as const,
    bracket: (id: string) => ['storefront', 'bracket', id] as const,
  },
}

/**
 * O que mais muda quando um recurso muda, além dele mesmo.
 *
 * Num lugar só porque a dependência é do domínio, e não da tela: turma
 * renomeada muda o placar e o site; modalidade mexe nas inscrições; sorteio
 * trava inscrições e cria jogos. Espalhada por cada formulário, uma tela
 * esqueceria uma chave e mostraria dado velho.
 */
export const DEPENDENTS = {
  classrooms: [
    queryKeys.games.all,
    queryKeys.advisorClassrooms.all,
    queryKeys.enrollments.all,
    queryKeys.students.all,
    queryKeys.storefront.all,
  ],
  sports: [
    queryKeys.games.all,
    queryKeys.enrollments.all,
    queryKeys.storefront.all,
  ],
  announcements: [queryKeys.storefront.all],
  games: [queryKeys.enrollments.all, queryKeys.storefront.all],
} as const
