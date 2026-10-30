/**
 * O que a foto recusa, como fato (`_standards/domain.md` §2): sem status HTTP
 * nem texto de tela. Arquivo que não existe não é fato da foto: quem o procura
 * é o repository, e o use-case responde.
 */
export type PhotoError = { readonly code: 'PHOTO_NOT_IMAGE' }
