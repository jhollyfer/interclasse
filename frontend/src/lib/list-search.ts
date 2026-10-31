import type { Merge, SortDirection, TrashedMode } from '@interclasse/shared'

/**
 * The filters of any dashboard listing, in the URL.
 *
 * In the URL, and not in `useState`, because it is what survives F5 and the shared
 * link - the table on page 2 with a filter applied has to come back
 * the same.
 *
 * By hand, and not with the `shared/` listing validators: the router's `validateSearch`
 * has to return the clean object, discarding the invalid parameter
 * instead of throwing, and here the filter comes from a URL that anyone can edit.
 *
 * Lives outside `routes/` so it can be tested without the tree generator
 * treating the test file as a route.
 */

/**
 * The values are literals, and `@interclasse/shared`'s `SORT_DIRECTION`/`TRASHED_MODE`
 * enter only as a **type**. It is not an oversight: this file is imported by every
 * route that declares `validateSearch`, so it falls into the router chunk, while
 * the enum lives with the rest of the vocabulary. Reading the enum here, at module scope,
 * creates an edge between the two chunks - and Rolldown does not guarantee that the chunk
 * graph is acyclic. In a cycle, the vocabulary chunk has not finished
 * evaluating when this line runs, and the object is `undefined`:
 *
 *     TypeError: Cannot read properties of undefined (reading 'ONLY')
 *
 * The build passes green and only the first SSR in production finds out. `import type`
 * vanishes in the build and the edge with it. The annotation is what holds the duplication:
 * if `TRASHED_MODE.ONLY` changes value, `'only'` stops being assignable to
 * `TrashedMode` and `tsc` complains. `list-search.test.ts` checks both maps
 * against the real enum.
 */
const SORT_DIRECTIONS: Record<string, SortDirection | undefined> = {
  asc: 'asc',
  desc: 'desc',
}

const TRASHED_MODES: Record<string, TrashedMode | undefined> = {
  only: 'only',
  with: 'with',
}

/**
 * What the URL does not need to carry: page 1 is the page without `?page`.
 * `stripSearchParams` removes the parameter equal to the default from the generated URL.
 * _doc-lib/tanstack-router.md#how-to/validate-search-params.
 */
export const LIST_SEARCH_DEFAULTS = { page: 1 }

export type ListSearch = {
  page?: number
  perPage?: number
  search?: string
  trashed?: TrashedMode
  /**
   * The sort column. It is **not** validated against a list here: each resource
   * accepts its own, whoever closes the list is the backend's `sortFields()`, and repeating
   * the lists of seven resources on the client would guarantee that the two
   * diverge. An invalid column returns 422 pointing at the field.
   */
  sort?: string
  direction?: SortDirection
}

/** A search param arrives as a string in the URL and as a number in typed navigation. */
function positive(value: unknown): number | undefined {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1) return undefined

  return parsed
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined

  return value
}

export function validateListSearch(
  search: Record<string, unknown>,
): ListSearch {
  const result: ListSearch = {}

  const page = positive(search.page)
  if (page) result.page = page

  const perPage = positive(search.perPage)
  // The backend refuses above 100; letting it through would become a 422 on a navigation.
  if (perPage && perPage <= 100) result.perPage = perPage

  const term = text(search.search)
  // The cap of `paginationFields()`. A term pasted from the clipboard easily
  // goes past 100 characters, and the 422 would show up as a broken search.
  if (term) result.search = term.slice(0, 100)

  const trashed = TRASHED_MODES[String(search.trashed)]
  if (trashed) result.trashed = trashed

  const sort = text(search.sort)
  if (sort) result.sort = sort

  // `direction` without `sort` sorts nothing; letting it through alone would only dirty
  // the URL with a parameter with no effect.
  const direction = SORT_DIRECTIONS[String(search.direction)]
  if (sort && direction) result.direction = direction

  return result
}

/**
 * The listings that add a filter of their own to the default set - `?status` on
 * testimonials and users, `?mimetype` on the file library,
 * `?category` on news. The extra is always text: uuid and enum arrive as a
 * string in the URL, and whoever refuses an invalid value is the API, with 422 pointing at
 * the field.
 */
export function withExtra<TKey extends string, TNumeric extends string = never>(
  keys: ReadonlyArray<TKey>,
  /**
   * The keys that are numbers in the URL. Separate because `?size=abc` has to vanish,
   * and not become the string `'abc'` in a request that the backend would refuse with
   * 422.
   */
  numericKeys: ReadonlyArray<TNumeric> = [],
) {
  return (search: Record<string, unknown>) => {
    const extra: Partial<Record<TKey, string>> = {}

    for (const key of keys) {
      const value = text(search[key])
      if (value) extra[key] = value
    }

    const numeric: Partial<Record<TNumeric, number>> = {}

    for (const key of numericKeys) {
      const parsed = Number(search[key])
      // `0` is a legitimate filter, so the condition is about being a non-negative
      // integer, and not about being truthy.
      if (Number.isInteger(parsed) && parsed >= 0) numeric[key] = parsed
    }

    // The extras are built separately and spread: writing directly into the combined
    // object would require an assertion to prove to the compiler that the generic
    // key fits there, and assertions are what this project does not use.
    return { ...validateListSearch(search), ...extra, ...numeric }
  }
}

/**
 * The public storefront's filters.
 *
 * Separate from `ListSearch` because it **has no `trashed`**: `/storefront` never
 * sees an archived record - `StorefrontVisibilityService` filters
 * `deleted_at IS NULL` before any parameter -, and the `trashedField()` stays
 * out of the validators there. Leaving the key in the typing would be promising a
 * filter that the URL accepts, the client sends and the backend refuses with 422.
 *
 * The rest is the same: `page`, `perPage`, `search`, `sort` and `direction`. Whoever closes
 * the list of sortable columns is each resource's `sortFields()` in the backend,
 * as on the dashboard.
 */
export type StorefrontSearch = Omit<ListSearch, 'trashed'>

/**
 * The search validation of a public screen.
 *
 * It is `validateListSearch` **minus `trashed`**, and nothing more. Writing the full
 * version and trimming afterwards, instead of repeating the five fields here, is what
 * keeps a single rule: the `perPage` cap of 100, the cut of the term at 100
 * characters and the refusal of `direction` without `sort` hold equally on both
 * surfaces, and duplicating them would guarantee that one of them aged on its own.
 *
 * `sort` and `direction` stay: `/storefront/notices` and `/storefront/events`
 * declare their own sortable columns, and the chosen order is a URL filter
 * like any other.
 */
export function validateStorefrontSearch(
  search: Record<string, unknown>,
): StorefrontSearch {
  const { trashed: _trashed, ...common } = validateListSearch(search)

  return common
}

/**
 * Each listing's own filters, on top of those every listing has.
 *
 * The values are `string` and not the domain enum: what comes out of the URL is text, and
 * whoever refuses a value outside the list is the API, with 422 pointing at the field.
 */
export type UserListSearch = Merge<
  ListSearch,
  { role?: string; status?: string }
>

export type ClassroomListSearch = Merge<ListSearch, { category?: string }>

export type BracketListSearch = Merge<
  StorefrontSearch,
  { sportId?: string; category?: string; status?: string }
>

export type MatchListSearch = Merge<
  StorefrontSearch,
  {
    bracketId?: string
    classroomId?: string
    sportId?: string
    category?: string
    phase?: string
    status?: string
  }
>

export type PhotoListSearch = Merge<ListSearch, { status?: string }>

export type StudentListSearch = Merge<ListSearch, { classroomId?: string }>

export type CardListSearch = Merge<
  ListSearch,
  { matchId?: string; classroomId?: string; studentId?: string }
>

export type RemovalListSearch = Merge<ListSearch, { pending?: boolean }>

/**
 * Builds the query string ignoring what was not filled in.
 *
 * Discards by falsiness and not by `!== undefined`: the value may arrive `null`
 * (the search param exists and is clean) or `''`, and `String(null)` would become the text
 * "null" in the filter. `page` and `perPage` are `min(1)` in the validator, but a number is
 * tested by type and not by truth - a numeric filter that accepts `0` must
 * not vanish for being falsy.
 *
 * It accepts every dashboard filter shape and the storefront's. Typing only as
 * `ListSearch` would compile -
 * every field of it is optional, so the others pass by assignability -, but the
 * signature would be lying about who enters here.
 */
export function queryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, value]) => typeof value === 'number' || Boolean(value),
  )

  if (entries.length === 0) return ''

  return '?'.concat(
    new URLSearchParams(
      entries.map(([key, value]) => [key, String(value)]),
    ).toString(),
  )
}
