# `storefront/`

Rota base: `/storefront`.

O site publico. **Sem middleware** e **somente leitura**: tabela de jogos,
classificacao, chaves e avisos. Aqui a resposta e o model serializado, e nao um
recorte como nos irmaos - nada destas tabelas e privado.

A classificacao e a mesma do painel: `BracketService.detail`, calculada do placar
a cada leitura.

## Recursos

- [`announcements/`](announcements/CLAUDE.md) — 1 operacoes
- [`brackets/`](brackets/CLAUDE.md) — 2 operacoes
- [`matches/`](matches/CLAUDE.md) — 1 operacoes
- [`sports/`](sports/CLAUDE.md) — 1 operacoes

## Testes

- `tests/functional/jogos.spec.ts`
- `tests/functional/papeis.spec.ts`
