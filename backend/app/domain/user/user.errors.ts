/**
 * What the account refuses, as a fact (`_standards/domain.md` §2): no HTTP status
 * or screen text. The use case translates each one. The codes are those of the API
 * contract, and so do not carry the entity prefix.
 */
export type UserError =
  /** The e-mail belongs to a live account. */
  | { readonly code: 'USER_ALREADY_EXISTS' }
  | { readonly code: 'USER_ALREADY_ARCHIVED' }
  /** Restoring and deleting for good only hold for an archived account. */
  | { readonly code: 'USER_NOT_ARCHIVED' }
  /** The current password given does not match the stored one. */
  | { readonly code: 'CURRENT_PASSWORD_INVALID' }
  | { readonly code: 'PASSWORD_SAME_AS_CURRENT' }
