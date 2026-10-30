# Frontend: instruções para agentes

TanStack Start + Nitro. A régua é `../_standards/` (`frontend.md`, `i18n.md`, `typescript.md`,
`solid.md` e `tooling.md`); o contrato das bibliotecas, `../_doc-lib/`. Regras e contexto do produto:
`../AGENTS.md` e `../docs/` (visual em `../docs/DESIGN.md`).

## Comandos

- `pnpm dev` sobe em `http://localhost:3001`.
- `pnpm check`: Paraglide, lint e typecheck; `pnpm format:check` confere o Prettier (`tooling.md` §7).
- `pnpm test:unit`: Vitest. `pnpm test:e2e`: Playwright, contra a API e o banco semeados
  (`.env.e2e.example`).
- `pnpm build`, depois `pnpm check-cycles`.
- `pnpm format` reescreve com Prettier e `eslint --fix`.
- `routeTree.gen.ts` é regerado pelo plugin do Router (`pnpm dev` ou `pnpm build`), nunca à mão.
