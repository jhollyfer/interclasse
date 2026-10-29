/**
 * O que a conta recusa, como fato (`_standards/domain.md` §2): sem status HTTP
 * nem texto de tela. O use-case traduz cada um. Os códigos são os do contrato
 * da API, e por isso não levam o prefixo da entidade.
 */
export type UserError =
  /** O e-mail é de uma conta viva. */
  | { readonly code: 'USER_ALREADY_EXISTS' }
  | { readonly code: 'USER_ALREADY_ARCHIVED' }
  /** Restaurar e apagar de vez só valem para conta arquivada. */
  | { readonly code: 'USER_NOT_ARCHIVED' }
  /** A senha atual informada não confere com a guardada. */
  | { readonly code: 'CURRENT_PASSWORD_INVALID' }
  | { readonly code: 'PASSWORD_SAME_AS_CURRENT' }
