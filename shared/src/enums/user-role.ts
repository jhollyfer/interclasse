/**
 * O papel do usuário. Lookup object em vez de union solto: a chave nomeia o
 * papel no código, o valor é o que vai para o banco e para a API, e o tipo sai
 * derivado - não há literal repetido para divergir.
 *
 * Três papéis, um por responsabilidade nos jogos:
 *
 * - `ADMINISTRATOR`: a organização. Cadastra turmas, modalidades e contas,
 *   sorteia as chaves e lança placar.
 * - `ADVISOR`: o professor conselheiro. Mantém os alunos das turmas que
 *   aconselha e as inscrições delas.
 * - `REPRESENTATIVE`: o aluno representante. Monta a lista de atletas por
 *   modalidade da própria turma, e nada além disso.
 *
 * Sem `OWNER`: o purge fica com o administrador.
 */
export const USER_ROLE = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  ADVISOR: 'ADVISOR',
  REPRESENTATIVE: 'REPRESENTATIVE',
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export const USER_ROLES = Object.values(USER_ROLE)
