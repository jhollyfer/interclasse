/** O que o aluno recusa, como fato (`_standards/domain.md` §2). */
export type StudentError =
  | { readonly code: 'STUDENT_NAME_EMPTY' }
  /** Inscrito numa modalidade já sorteada: o time perderia um atleta. */
  | { readonly code: 'STUDENT_IN_COMPETITION' }
