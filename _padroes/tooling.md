# Padrão de tooling

Ferramental comum a todo projeto TypeScript: gerenciador de pacote, versão de
runtime, flags do compilador, ESLint, Prettier, hooks de commit e portões de
CI. Vale para backend e frontend, Fastify ou Adonis.

---

## 0. Política de versão: sempre a mais nova publicada *(opinião da casa)*

**Regra**: toda dependência — lib de produção, dev tool, o próprio `pnpm`, o
Node e o TypeScript — fica na **última versão publicada** no momento em que
o projeto é tocado, não numa versão "estável conhecida" congelada. Onde dois
projetos da casa divergem de major (gerenciador de pacote, TypeScript, runner de
teste, linter), o padrão é a **mais nova das duas**, e o projeto atrasado migra —
a divergência não é uma escolha registrada, é débito.

**Por quê**: pin em "versão que funciona" é o que acumula quatro minors de
atraso num documento que fala de segurança — exatamente o defeito que uma
tabela de versões redigida à mão produz.
Correção de CVE, de regressão de performance e de type noise do TypeScript
chega só para quem atualiza; quem fixa versão "porque funciona" paga o custo
de migrar tudo de uma vez, mais tarde, sob pressão.

- **Dependabot/Renovate ligado** em todo repositório, PR automático de
  atualização — não descoberta manual de "está desatualizado".
- **Upgrade é revisado, não aceito automaticamente**: changelog da lib (ou
  `npm diff`/`npm pack` + leitura dos `.d.ts` novos quando o changelog não
  cobre o breaking de tipo) antes de merge, principalmente em major.
- **Breaking de major é corrigido no código**, não revertido com downgrade.
  Pin para baixo só é aceitável como medida temporária, com issue aberta e
  prazo — nunca como solução.
- Este documento não fixa número de versão de lib. O número certo é "o que
  `npm view <pkg> version` responde agora".

---

## 1. pnpm *(opinião da casa — `packageManager` fixo)*

Sem workspace (`pnpm-workspace.yaml`) entre backend e frontend — são dois
projetos pnpm independentes, cada um com seu `pnpm-lock.yaml`, mesmo quando
vivem no mesmo repositório Git. Um `package.json` na raiz do monorepo existe
só para script de topo e `devDependencies` de repositório (commitlint, husky
root), nunca para declarar `workspace:*` entre backend e frontend — eles não
compartilham código em runtime, então não há protocolo de workspace para
usar. **Por quê**: os dois lados do mesmo monorepo hoje têm stacks e ciclos
de deploy diferentes (backend sobe sozinho, frontend sobe sozinho); um
workspace linkando os dois criaria uma dependência de build que não existe
de verdade.

`packageManager` fixo no `package.json` (`"packageManager": "pnpm@X.Y.Z"`) em
todo projeto — é o que faz `corepack` instalar a mesma versão em toda
máquina e no CI, sem depender do que está instalado globalmente.

---

## 2. Node *(opinião da casa — piso de versão)*

**Node ≥ 24** (LTS corrente) em todo projeto — `engines.node` no
`package.json` e a mesma major na imagem Docker (`node:24-alpine`). Runtime
mais antigo some de CI silenciosamente até alguém notar um `--experimental`
flag faltando; declarar `engines` faz `pnpm install` recusar antes.

---

## 3. TypeScript — flags estritas

As flags mais estritas disponíveis — adote todas, não o
subconjunto mais permissivo:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUncheckedSideEffectImports": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler"
  }
}
```

- **`noUncheckedIndexedAccess`**: acesso por índice (`arr[i]`, `Record<K,V>`,
  grupo de regex) vira `T | undefined`. **Por quê**: sem a flag, `row[0]` ou
  `users[id]` tipam como `T` mesmo quando o índice não existe — o `undefined`
  em runtime encontra o primeiro `.campo` dele só na produção.
- **`verbatimModuleSyntax`**: import que é só tipo precisa de `import type`
  explícito — o compilador não decide por inferência o que remove no build.
  Onde o projeto usa decorator + `emitDecoratorMetadata` (DI por reflexão,
  perfil Fastify), **confirme caso a caso**: a flag pode forçar `import type`
  numa classe que o decorator precisa ver em runtime, e aí o build remove a
  referência e a injeção quebra silenciosamente — nesse ponto específico,
  `@typescript-eslint/consistent-type-imports` fica desligado e o import
  fica "de valor" de propósito. Fora desse caso, a flag fica ligada.
- **`noUncheckedSideEffectImports`**: import de efeito colateral
  (`import './styles.css'`) que não resolve é erro de tipo, não só erro de
  bundler descoberto em runtime.

---

## 4. ESLint — regras que cobram as flags de cima

Config flat (`eslint.config.js`), não `.eslintrc`. Bloco mínimo copiável:

```js
import tseslint from 'typescript-eslint'

export default [
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // sem ternário de controle/atribuição — `if` clássico.
      // `??`, `?.` e o short-circuit `&&` continuam livres (não são ternário).
      'no-ternary': 'error',

      // sem `any` desnecessário — `unknown` + narrow.
      '@typescript-eslint/no-explicit-any': 'error',

      // sem `as` — `satisfies` ou corrigir o tipo na origem.
      // `as const` continua permitido (assertionStyle 'never' não o bloqueia).
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],

      // sempre `type`, nunca `interface` — exceto declaration merging,
      // que exige `interface` (ver override de `**/*.d.ts` abaixo).
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],

      // colaborador vem do container, nunca de `new` — ver _padroes/backend.md
      // §2.1 e _padroes/backend-fastify.md §3 para o porquê.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'NewExpression[callee.name=/(Service|UseCase|Policy|Controller|Repository|Seeder)$/]',
          message:
            'Colaborador vem do container, não de `new`. Injete por construtor. ' +
            'Composition root de verdade: mova para lá com um override de `files`.',
        },
      ],
    },
  },
  {
    // declaration merging exige `interface` — limite da linguagem, não estilo.
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/consistent-type-definitions': 'off' },
  },
  {
    // composition root nomeado: único lugar onde `new X()` de colaborador é correto.
    files: ['start/**/*.ts', 'providers/**/*.ts', 'config/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]
```

`Seeder` entrou no seletor ao lado de `Service|UseCase|Policy|Controller|Repository`: um
`new XSeeder(...)` fora do container escapava do lint pelo mesmo motivo que os outros
cinco não escapam, e só não era pego porque o nome da classe não casava com o regex antigo.

**Por quê cada uma é ESLint e não revisão**: as quatro primeiras são nativas — `no-ternary`
do núcleo do ESLint (eslint.org/docs/latest/rules/no-ternary); `no-explicit-any`,
`consistent-type-assertions` e `consistent-type-definitions` do `typescript-eslint`
(typescript-eslint.io/rules) — zero custo de manutenção, zero plugin próprio. O `no-restricted-syntax` de `new *Service|UseCase|Policy|Controller|Repository`
existe porque a violação que ele pega — um callback pegando `new
XService()` tendo o contexto em mãos para pedir ao container — é
exatamente o tipo de erro que passa review sem ninguém notar; um linter
sempre olha.

Regras que dependem de tipo (`no-floating-promises`, `no-misused-promises`)
usam `projectService: true` no `languageOptions.parserOptions` — pegam
promise solta (rejeição sem dono, a causa mais comum de processo caindo sem
log) e promise onde se espera void.

Regra que cobraria `Merge<A,B>` no lugar de `A & B` e lookup object no lugar
de 3+ `if/else-if` dependia de plugin local removido do ecossistema — hoje
são regra de revisão humana (ou de skill de review), não de linter; não
finja que estão automatizadas se o plugin não está instalado.

**Ordem de import** *(opinião da casa)*: externo → alias interno (`#…` / `@/…`) → relativo, com
linha em branco entre grupos, cobrada por `import-x/order` (eslint-plugin-import-x). Diff de import
deixa de ser ruído e conflito de merge em bloco de import some.

---

## 5. Prettier

```js
/** @type {import('prettier').Config} */
export default {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
}
```

**Padrão: sem ponto-e-vírgula** *(opinião da casa)*, porque é o default do
`@adonisjs/prettier-config` — adotar o config de uma lib oficial em vez de uma
escolha arbitrária reduz a chance de o próximo projeto divergir. Projeto que
ainda está com `semi: true` migra na próxima reformatação em massa
(`MIGRACOES.md`), não num commit avulso.

---

## 6. Husky + commitlint

Hook `commit-msg` chamando `commitlint --edit "$1"`, commitlint
configurado para **Conventional Commits em pt-BR** no corpo da mensagem
(tipo em inglês — `feat`, `fix`, `refactor` — descrição em português). CI
roda o mesmo commitlint contra o range do PR
(`--from base.sha --to head.sha`), não só no hook local — hook é
contorná vel com `--no-verify`, o passo de CI não é.

Hook `pre-commit`/`pre-push` roda lint + typecheck no que mudou (nunca o
projeto inteiro) — é o que mantém o hook rápido o suficiente para não ser
pulado por impaciência.

---

## 7. Portões de CI *(opinião da casa)*

Pipeline de backend, nesta ordem, cada passo falhando o job:

1. **Install** com `--frozen-lockfile` — lockfile desincronizado é erro de
   CI, nunca resolvido silenciosamente numa instalação que reescreve o lock.
2. **Lint** (`pnpm lint`).
3. **Typecheck** (`pnpm typecheck` / `tsc --noEmit`).
4. **`pattern:check` + `sync:check`**: árvore e nomes de `arquitetura.md` §6, e
   cópia local de `_padroes/`/`_doc-lib/`/skills igual ao upstream
   (`node <upstream>/scripts/sync-to-project.mjs . --check`) — `backend.md` §10.
5. **OpenAPI `--check`**: documento de API é artefato commitado, gerado de
   rota + schema reais; o passo reprova quem mexeu numa rota e não regerou o
   documento. Sem isto, a doc de API mente sozinha a partir do primeiro PR
   esquecido.
6. **Test** (unit + e2e, glob `app/**/*.spec.ts`) — banco e serviços externos (Mongo/Postgres, Redis,
   storage) sobem como `services:`/container no próprio job, nunca
   apontando para um ambiente compartilhado.
7. **Build** (`tsc --noEmit && <bundler>`), confirmando que o artefato de
   produção compila — typecheck de dev e build de produção usam configs
   diferentes o suficiente para um passar e o outro falhar.

Frontend roda o mesmo lint + typecheck + test + build; troca o passo de
OpenAPI por nenhum (consumidor, não dono do contrato). Teste do frontend é Vitest com glob
`src/**/*.test.ts`, arquivo ao lado do módulo que cobre (`lib/bulk.ts` → `lib/bulk.test.ts`)
*(opinião da casa; config em _doc-lib/vitest.md#guide)*.

`commitlint` roda em workflow próprio, gatilho `pull_request`, independente
do pipeline de build — mensagem de commit inválida não deveria bloquear nem
esperar o resto da suíte.
