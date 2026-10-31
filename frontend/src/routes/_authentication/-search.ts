import { validateRedirectSearch } from '#/lib/redirect-search'

/** `?redirect=` only accepts an internal path; the rule lives in `lib/redirect-search.ts`. */
export const validateSearch = validateRedirectSearch
