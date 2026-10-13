# Backend

AdonisJS 7 + Lucid/Postgres. **A régua é `../_padroes/`** (`arquitetura.md` e
`backend.md` acima de tudo), cópia do upstream `maiyu-pattern` conferida por
`sync:check`. Este arquivo não repete a régua: aqui fica só o que este projeto faz
de diferente dela, e os comandos. O que cada operação faz, recebe e devolve está no
`openapi.json` (UI em `/documentation`); o porquê de cada regra, no comentário do
use-case e da policy.

## O que foge da régua

- **TypeScript 7 com o 6 ao lado.** `tsc` (typecheck e build) é o 7, do alias
  `typescript7`. O nome `typescript` aponta para `@typescript/typescript6`
  (binário `tsc6`), que é a API JS que o `typescript-eslint` e o introspector do
  OpenAPI carregam - o 7 não a tem. ponytail: vira um pacote só quando o
  `typescript-eslint` aceitar o 7.
- **`moduleResolution: NodeNext`**, do preset instalado `@adonisjs/tsconfig`, e
  não `bundler` (`tooling.md` §3): o backend roda no Node, sem bundler.
- **Revogação de sessão pela tabela.** `SessionService#revokeAll` apaga direto em
  `auth_access_tokens`, porque o provider do `@adonisjs/auth` não aceita
  transação e a revogação precisa cair junto com a escrita que a motiva.
- **MinIO pelo fork `pgsty/*`.** As imagens `minio/*` saíram do Docker Hub.
  Postgres em 5434 e MinIO em 9004/9005, para conviver com outros projetos.

`database/schema.ts`, `.adonisjs/**` e `openapi.json` são **gerados e commitados**.
Mexeu em migration, rota, controller ou policy, regenere no **mesmo** commit - o CI
roda `--check` e os testes nem compilam sem o registry do Tuyau.

## Comandos

- `pnpm check` - lint, typecheck, `openapi:check`, `pattern:check`, `sync:check` e
  `authz:check` (o que cada um reprova: `backend.md` §10). Isenções e chaves de
  ambiente fora do leitor do `pattern:check` ficam em `scripts/pattern-check.config.json`.
- `pnpm openapi:generate` - reescreve o `openapi.json`.
- `node ace di:check` - constrói todo service e policy pelo container (exige banco).
- `node ace test` - suíte funcional (`app/**/*.spec.ts`) contra Postgres e MinIO reais.
- `pnpm db:seed:demo` - a demonstração (`database/seeders/dev/demo.ts`), com
  `SEED_DEMO_PASSWORD`.
- `pnpm sync:check` compara a régua com o upstream em `../../maiyu-pattern` (ou
  `MAIYU_PATTERN_DIR`); sem ele, avisa e passa. É conferência local: o CI não
  depende do maiyu-pattern.

O `pre-commit` roda `pnpm check && pnpm test`.
