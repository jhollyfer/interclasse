# Frontend

TanStack Start + Router + Query + Table, React Hook Form + VineJS, shadcn sobre
Base UI, Tailwind v4. A régua é `_padroes/frontend.md` (e `tooling.md`,
`typescript.md`); aqui fica só o que este projeto faz diferente dela, ou que ela
não cobre.

## Comandos

- `pnpm dev` sobe em `http://localhost:3001` (porta deslocada, ver o
  `CLAUDE.md` da raiz).
- Portões, na ordem do CI: `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build` e, depois do build, `pnpm check-cycles` (procura leitura
  antecipada em ciclo entre os chunks de `.output/server`).
- `pnpm format` reescreve com Prettier e `eslint --fix`.

## O que foge da régua

- **TypeScript 7 com o 6 ao lado.** O `typescript-eslint` recusa a API do 7 na
  carga, então o nome `typescript` no `package.json` aponta para
  `@typescript/typescript6` (é o que o lint enxerga) e o `tsc` do
  `pnpm typecheck` vem do alias `typescript7`. Quando o `typescript-eslint`
  aceitar o 7, os dois voltam a ser um pacote só.
- **pnpm 11.21.0, não o mais novo.** O 12 instala e roda, mas os workflows fixam
  `version: 11.21.0` no `pnpm/action-setup`, que reprova divergência com o
  `packageManager`. Sobem juntos, num commit que mexa nos dois.
- **`vitest.config.ts` próprio.** Os plugins do Start e do Nitro do
  `vite.config.ts` carregavam o React CJS no module runner do Vitest. O glob
  pega `src/**/*.test.ts` e também `scripts/**/*.test.ts`, onde mora o teste do
  `check-chunk-cycles`.
- **Entidades em `lib/validator.ts`.** `User`, `Classroom`, `Match` e as demais
  formas que a API devolve moram ao lado do `vine` configurado, e o envelope de
  resposta (paginação, contadores) em `integrations/response.ts`. Os validators
  de recurso estão em `src/validators/`, como manda a régua.
- **Data é texto no validator.** O backend declara `vine.date()`; aqui agenda e
  datas ficam `vine.string()` com teto, porque o `Infer` viraria `Date` e o
  corpo sairia em ISO completo, que o servidor recusa. Está explicado em
  `lib/validator.ts` e `validators/administrator/matches.validator.ts`.
- **`request` e `send`.** Em `integrations/tanstack-query/http.ts`, `request<T>`
  lê o corpo e `send` serve as rotas que respondem 204 (sign-in, sign-out,
  exclusão, arquivamento). 204 num `request` é `HTTPError`, não `undefined`.
- **`useResourceForm` exige `payload`.** Cadastro cujo formulário é o corpo
  passa `(values) => values`: é a identidade que faz o compilador conferir os
  dois tipos.
- **Teste aceita `as`.** `consistent-type-assertions` fica desligado em
  `*.test.ts`: dublê de `useMutation` é parcial por definição. O `no-ternary`
  vale nos testes também.

## Kit comum (`components/common/`)

- Sobe para cá o que **mais de uma rota** alcança, contando rota e não pasta:
  `administrator` são seis rotas, então `row-actions/` e `option-combobox.tsx`
  são kit.
- Compound só onde há estado compartilhado. A instância do TanStack Table não
  entra em contexto (o `React.Context` perde o genérico e cobraria um `as`): vai
  por prop, e o porquê está em `table/table-context.ts`.
- Composição pela prop `render` do Base UI, nunca `asChild`. Ícones do Phosphor.
- Dentro de `Dialog`, `select` nativo e não `option-combobox`: o popup do
  combobox abre atrás do overlay.
