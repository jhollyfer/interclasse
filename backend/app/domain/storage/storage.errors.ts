/**
 * O que o arquivo recusa, como fato (`_standards/domain.md` §2): sem status
 * HTTP nem texto de tela. O use-case traduz cada um.
 */
export type StorageError =
  | {
      readonly code: 'STORAGE_SIZE_MISMATCH'
      readonly declared: number
      readonly received: number
    }
  | { readonly code: 'STORAGE_CONTENT_MISMATCH'; readonly mimetype: string }
  | { readonly code: 'STORAGE_IN_USE'; readonly usedBy: ReadonlyArray<string> }
