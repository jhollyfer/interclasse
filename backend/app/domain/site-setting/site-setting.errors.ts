/**
 * O que a configuração do site recusa, como fato (`_standards/domain.md` §2):
 * sem status HTTP nem texto de tela. O use-case traduz cada um.
 */
export type SiteSettingError =
  { readonly code: 'STORAGE_NOT_FOUND' } | { readonly code: 'REGULATION_NOT_PDF' }
