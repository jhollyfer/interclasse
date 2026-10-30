/** O que a lista de atletas recusa, como fato (`_standards/domain.md` §2). */
export type EnrollmentError =
  /** Mais atletas que o máximo da modalidade. */
  | { readonly code: 'ENROLLMENT_LIMIT_EXCEEDED'; readonly maxAthletes: number }
  /** Aluno que não é da turma: sem isto, o uuid de outra turma entraria na lista. */
  | { readonly code: 'ENROLLMENT_STUDENT_NOT_IN_CLASSROOM' }
  /** O representante só acrescenta; tirar atleta é do professor conselheiro. */
  | { readonly code: 'ENROLLMENT_REMOVAL_FORBIDDEN' }
  /** Depois do sorteio a lista do representante trava. */
  | { readonly code: 'ENROLLMENT_LOCKED' }
  /** O conselheiro que tira atleta diz por quê. */
  | { readonly code: 'ENROLLMENT_REASON_REQUIRED' }
