/**
 * What the photo refuses, as a fact (`_standards/domain.md` §2): no HTTP status
 * or screen text. A file that does not exist is not a photo fact: whoever looks it
 * up is the repository, and the use case answers.
 */
export type PhotoError = { readonly code: 'PHOTO_NOT_IMAGE' }
