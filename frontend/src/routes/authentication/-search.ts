import { validateRedirectSearch } from '#/lib/redirect-search'

/** `?redirect=` só aceita caminho interno; a regra mora em `lib/redirect-search.ts`. */
export const validateSearch = validateRedirectSearch
