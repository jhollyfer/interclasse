# `representative/`

Rota base: `/representative`.

O aluno representante: a lista de atletas da propria turma, e nada alem. Sem
identificador no caminho - a turma sai da sessao (`classrooms.representative_id`).
Representante sem turma vinculada responde `404`.

## Recursos

- [`enrollments/`](enrollments/CLAUDE.md) — 2 operacoes

## Testes

- `tests/functional/jogos.spec.ts`
- `tests/functional/papeis.spec.ts`
