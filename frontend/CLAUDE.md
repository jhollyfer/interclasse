# Frontend

A régua é `_standards/frontend.md` (com `typescript.md`, `solid.md` e `tooling.md`).
Aqui fica só o que este projeto faz diferente dela, e os comandos.

## Comandos

- `pnpm dev` sobe em `http://localhost:3001` (porta deslocada, ver o `CLAUDE.md`
  da raiz).
- Portões, na ordem do CI: `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build` e, depois do build, `pnpm check-cycles`.
- `pnpm format` reescreve com Prettier e `eslint --fix`.
- `routeTree.gen.ts` é regerado pelo plugin do Router (`pnpm dev` ou
  `pnpm build`), nunca à mão.

## O que foge da régua

- **TypeScript 7 com o 6 ao lado.** O `typescript-eslint` (8.71) aceita só TS
  `<6.1`: o nome `typescript` aponta para `@typescript/typescript6` (o que o
  lint carrega) e o `tsc` do `pnpm typecheck` vem do alias `typescript7`. Voltam
  a ser um pacote só quando o `typescript-eslint` aceitar o 7.
- **`vitest.config.ts` próprio.** Os plugins do Start e do Nitro carregavam o
  React CJS no runner do Vitest. O glob inclui `scripts/**/*.test.ts`.
- **`authentication/` continua com path**, e não `_authentication/` pathless:
  sem o segmento, o login cairia em `/`, a home pública.
- **Data é texto no validator.** O backend declara `vine.date()`; aqui é
  `vine.string()` com teto, senão o `Infer` vira `Date` e o corpo sai em ISO
  completo, que o servidor recusa (`lib/validator.ts`, `wireDate`).
- **`request<T>` tem um `as` de fronteira** (`integrations/tanstack-query/http.ts`):
  o corpo de sucesso não tem schema no cliente. O corpo de erro é estreitado.
- **`lib/upload-resume.ts` estreita o `localStorage` com type guard**, não com
  VineJS: a API de retomada é síncrona e o `validate` do VineJS não é.
- **ESLint**: o `no-restricted-syntax` de `new *Controller` ignora o
  `AbortController` (API da plataforma); `import-x/order` não roda em
  `components/ui/**` (saída do shadcn).
- **`pnpm-workspace.yaml` só com `allowBuilds`**: é onde o pnpm 12 lê a
  aprovação de build de dependência, mesmo sem workspace.
- **Kit comum sem `rich-editor/` e `multi-file-upload/`**: nenhuma tela do
  domínio tem texto rico nem envio de vários arquivos.
- **Tabela sem contexto para a instância**: o `React.Context` perde o genérico
  do TanStack Table e cobraria um `as`, então ela vai por prop
  (`components/common/table/table-context.ts`).
- **Dentro de `Dialog`, `select` nativo** e não `option-combobox`: o popup do
  combobox abre atrás do overlay.
