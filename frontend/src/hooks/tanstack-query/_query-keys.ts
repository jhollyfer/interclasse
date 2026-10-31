import type { ListSearch, StorefrontSearch } from '#/lib/list-search'

/**
 * The cache keys, in one place, with one section per API module
 * (`queryKeys.<module>.<resource>`), like the backend's validators and routes.
 *
 * `list` is the table (classic pagination, filter in the URL) and `detail` is a
 * single record. Every resource starts with the `all` prefix, and invalidating
 * by it covers list and detail at once; the module's `all` covers the whole module.
 *
 * A module with no cached read (`authentication`, `storages`) has no section:
 * a key nobody reads or invalidates is just an extra name.
 */
export const queryKeys = {
  account: {
    profile: {
      all: ['account', 'profile'] as const,
    },
  },

  administrator: {
    all: ['administrator'] as const,
    /** The site configuration: a single one, no parameter. */
    site: ['administrator', 'site'] as const,
    /** The report: a single one, no parameter. */
    reports: ['administrator', 'reports'] as const,
    users: {
      all: ['administrator', 'users'] as const,
      list: (params: ListSearch) =>
        ['administrator', 'users', 'list', params] as const,
      /** The combobox search: pages of 20, filtered on the server. */
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
      /** The combobox search: pages of 20, filtered on the server. */
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
      /** The classroom comes from the session: there is no parameter. */
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
 * Bracket and match invalidate together: a score changes the standings, and a
 * draw creates matches.
 */
export const GAME_KEYS = [
  queryKeys.administrator.brackets.all,
  queryKeys.administrator.matches.all,
  queryKeys.administrator.cards.all,
  queryKeys.advisor.cards.all,
] as const

/**
 * What else changes when a resource changes, besides itself.
 *
 * In one place because the dependency belongs to the domain, not to the screen:
 * a renamed classroom changes the scoreboard and the site; a sport touches
 * enrollments; a draw locks enrollments and creates matches. Scattered across
 * each form, a screen would forget a key and show stale data.
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
  /** A photo that is uploaded, approved or deleted changes the three lists and the carousel. */
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
