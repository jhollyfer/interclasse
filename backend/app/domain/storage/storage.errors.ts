/**
 * What the file refuses, as a fact (`_standards/domain.md` §2): no
 * HTTP status or screen text. The use case translates each one.
 */
export type StorageError =
  | {
      readonly code: 'STORAGE_SIZE_MISMATCH'
      readonly declared: number
      readonly received: number
    }
  | { readonly code: 'STORAGE_CONTENT_MISMATCH'; readonly mimetype: string }
  | { readonly code: 'STORAGE_IN_USE'; readonly usedBy: ReadonlyArray<string> }
