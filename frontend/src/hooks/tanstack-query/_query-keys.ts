import type { ListSearch, StorefrontSearch } from '#/lib/list-search'

/**
 * As chaves de cache, num lugar só, com uma seção por módulo da API
 * (`queryKeys.<módulo>.<recurso>`), como os validators e as rotas do backend.
 *
 * `list` é a tabela (paginação clássica, filtro na URL) e `detail` é um
 * registro só. Todo recurso começa pelo prefixo `all`, e invalidar por ele
 * cobre lista e detalhe de uma vez; o `all` do módulo cobre o módulo inteiro.
 *
 * Módulo sem leitura em cache (`authentication`, `storages`) não tem seção:
 * chave que ninguém lê nem invalida é só nome a mais.
 */
export const queryKeys = {
  account: {
    profile: {
      all: ['account', 'profile'] as const,
    },
  },

  administrator: {
    all: ['administrator'] as const,
    /** A configuração do site: uma só, sem parâmetro. */
    site: ['administrator', 'site'] as const,
    /** O relatório: um só, sem parâmetro. */
    reports: ['administrator', 'reports'] as const,
    users: {
      all: ['administrator', 'users'] as const,
      list: (params: ListSearch) =>
        ['administrator', 'users', 'list', params] as const,
      /** A busca do combobox: páginas de 20, filtro no servidor. */
      infinite: (params: ListSearch) =>
        ['administrator', 'users', 'infinite', params] as const,
      detail: (id: string) => ['administrator', 'users', 'detail', id] as const,
    },
    classrooms: {
      all: ['administrator', 'classrooms'] as const,
      list: (params: ListSearch) =>
        ['administrator', 'classrooms', 'list', params] as const,
      detail: (id: string) =>
        ['administrator', 'classrooms', 'detail', id] as const,
    },
    sports: {
      all: ['administrator', 'sports'] as const,
      list: (params: ListSearch) =>
        ['administrator', 'sports', 'list', params] as const,
      /** A busca do combobox: páginas de 20, filtro no servidor. */
      infinite: (params: ListSearch) =>
        ['administrator', 'sports', 'infinite', params] as const,
      detail: (id: string) =>
        ['administrator', 'sports', 'detail', id] as const,
    },
    announcements: {
      all: ['administrator', 'announcements'] as const,
      list: (params: ListSearch) =>
        ['administrator', 'announcements', 'list', params] as const,
      detail: (id: string) =>
        ['administrator', 'announcements', 'detail', id] as const,
    },
    brackets: {
      all: ['administrator', 'brackets'] as const,
      list: (params: ListSearch) =>
        ['administrator', 'brackets', 'list', params] as const,
      detail: (id: string) =>
        ['administrator', 'brackets', 'detail', id] as const,
      preview: (sportId: string, category: string) =>
        ['administrator', 'brackets', 'preview', sportId, category] as const,
    },
    matches: {
      all: ['administrator', 'matches'] as const,
      list: (params: ListSearch) =>
        ['administrator', 'matches', 'list', params] as const,
      athletes: (id: string) =>
        ['administrator', 'matches', 'athletes', id] as const,
    },
    photos: {
      all: ['administrator', 'photos'] as const,
      list: (params: ListSearch) =>
        ['administrator', 'photos', 'list', params] as const,
    },
    cards: {
      all: ['administrator', 'cards'] as const,
      list: (params: ListSearch) =>
        ['administrator', 'cards', 'list', params] as const,
    },
    enrollmentRemovals: {
      all: ['administrator', 'enrollment-removals'] as const,
      list: (params: ListSearch) =>
        ['administrator', 'enrollment-removals', 'list', params] as const,
    },
  },

  advisor: {
    all: ['advisor'] as const,
    classrooms: {
      all: ['advisor', 'classrooms'] as const,
      list: (params: ListSearch) =>
        ['advisor', 'classrooms', 'list', params] as const,
    },
    photos: {
      all: ['advisor', 'photos'] as const,
      list: (params: ListSearch) =>
        ['advisor', 'photos', 'list', params] as const,
    },
    students: {
      all: ['advisor', 'students'] as const,
      list: (params: ListSearch) =>
        ['advisor', 'students', 'list', params] as const,
    },
    enrollments: {
      all: ['advisor', 'enrollments'] as const,
      board: (classroomId: string) =>
        ['advisor', 'enrollments', 'board', classroomId] as const,
    },
    cards: {
      all: ['advisor', 'cards'] as const,
      list: (params: ListSearch) =>
        ['advisor', 'cards', 'list', params] as const,
    },
  },

  representative: {
    all: ['representative'] as const,
    enrollments: {
      all: ['representative', 'enrollments'] as const,
      /** A turma sai da sessão: não há parâmetro. */
      board: ['representative', 'enrollments', 'board'] as const,
    },
  },

  storefront: {
    all: ['storefront'] as const,
    sports: {
      all: ['storefront', 'sports'] as const,
    },
    announcements: {
      all: ['storefront', 'announcements'] as const,
      list: (params: StorefrontSearch) =>
        ['storefront', 'announcements', 'list', params] as const,
    },
    matches: {
      all: ['storefront', 'matches'] as const,
      list: (params: StorefrontSearch) =>
        ['storefront', 'matches', 'list', params] as const,
    },
    brackets: {
      all: ['storefront', 'brackets'] as const,
      list: (params: StorefrontSearch) =>
        ['storefront', 'brackets', 'list', params] as const,
      detail: (id: string) => ['storefront', 'brackets', 'detail', id] as const,
    },
    site: ['storefront', 'site'] as const,
    photos: {
      all: ['storefront', 'photos'] as const,
      list: (params: StorefrontSearch) =>
        ['storefront', 'photos', 'list', params] as const,
    },
  },
}

/**
 * Chave e partida invalidam juntas: placar muda a classificação, e sorteio
 * cria partidas.
 */
export const GAME_KEYS = [
  queryKeys.administrator.brackets.all,
  queryKeys.administrator.matches.all,
  queryKeys.administrator.cards.all,
  queryKeys.advisor.cards.all,
] as const

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
    ...GAME_KEYS,
    queryKeys.advisor.all,
    queryKeys.representative.all,
    queryKeys.storefront.all,
  ],
  sports: [
    ...GAME_KEYS,
    queryKeys.advisor.enrollments.all,
    queryKeys.representative.enrollments.all,
    queryKeys.storefront.all,
  ],
  announcements: [queryKeys.storefront.all],
  site: [queryKeys.storefront.all],
  /** Foto enviada, aprovada ou apagada muda as três listas e o carrossel. */
  photos: [
    queryKeys.administrator.photos.all,
    queryKeys.advisor.photos.all,
    queryKeys.storefront.photos.all,
  ],
  games: [
    queryKeys.advisor.enrollments.all,
    queryKeys.representative.enrollments.all,
    queryKeys.storefront.all,
  ],
} as const
