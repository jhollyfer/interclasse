# `administrator/`

Rota base: `/administrator`.

A organizacao dos jogos. So `ADMINISTRATOR` entra: o `role()` esta no grupo
inteiro em `start/routes.ts`, entao rota nova aqui nasce fechada aos outros papeis.

Chave nao se edita: `POST /brackets` sorteia e monta o mata-mata inteiro, da
primeira fase a final, e `DELETE` e o caminho para refazer. Partida nao
nasce a mao - so se agenda e se lanca placar.

## Recursos

- [`announcements/`](announcements/CLAUDE.md) — 5 operacoes
- [`brackets/`](brackets/CLAUDE.md) — 5 operacoes
- [`classrooms/`](classrooms/CLAUDE.md) — 5 operacoes
- [`matches/`](matches/CLAUDE.md) — 3 operacoes
- [`sports/`](sports/CLAUDE.md) — 5 operacoes
- [`users/`](users/CLAUDE.md) — 7 operacoes

## Testes

- `tests/functional/jogos.spec.ts`
- `tests/functional/papeis.spec.ts`
- `tests/functional/administrator-users.spec.ts`
