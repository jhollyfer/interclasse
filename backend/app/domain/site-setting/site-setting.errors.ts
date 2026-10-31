/**
 * What the site configuration refuses, as a fact (`_standards/domain.md` §2):
 * no HTTP status or screen text. The use case translates each one.
 */
export type SiteSettingError =
  { readonly code: 'STORAGE_NOT_FOUND' } | { readonly code: 'REGULATION_NOT_PDF' }
