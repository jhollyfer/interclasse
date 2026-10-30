/**
 * O que a turma recusa, como fato (`_standards/domain.md` §2): sem status HTTP
 * nem texto de tela. O `_shared.classroom-refusal.ts` traduz cada um.
 */
export type ClassroomError =
  | { readonly code: 'CLASSROOM_INVALID_GRADE' }
  /** Mudar o ano levaria a turma sorteada para outra categoria. */
  | { readonly code: 'CLASSROOM_CATEGORY_LOCKED' }
  /** A turma já tem time numa chave: apagar a deixaria jogando sem turma. */
  | { readonly code: 'CLASSROOM_IN_COMPETITION' }
  /** O nome é de outra turma: a checagem antes de gravar e a corrida no `unique`. */
  | { readonly code: 'CLASSROOM_ALREADY_EXISTS' }
  | { readonly code: 'ADVISOR_NOT_FOUND' }
  | { readonly code: 'ADVISOR_TAKEN' }
  | { readonly code: 'REPRESENTATIVE_NOT_FOUND' }
  | { readonly code: 'REPRESENTATIVE_TAKEN' }
