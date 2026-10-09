# `advisor/`

Rota base: `/advisor`.

O professor conselheiro: alunos e inscricoes das turmas que aconselha. O
`ADMINISTRATOR` entra junto para cobrir a falta de um conselheiro.

O papel abre a porta; **qual turma** cada um alcanca e a `ClassroomPolicy`, por
registro. Turma alheia responde `404`, nunca `403` - confirmar que ela existe ja
seria contar demais. A regra das inscricoes (trava depois do sorteio, limite de
atletas, so alunos da turma) mora no `EnrollmentService`, compartilhado com
`representative/`.

## Recursos

- [`classrooms/`](classrooms/CLAUDE.md) — 1 operacoes
- [`enrollments/`](enrollments/CLAUDE.md) — 2 operacoes
- [`students/`](students/CLAUDE.md) — 4 operacoes

## Testes

- `tests/functional/jogos.spec.ts`
- `tests/functional/papeis.spec.ts`
