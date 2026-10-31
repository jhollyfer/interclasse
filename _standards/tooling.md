# Padrão de tooling

Ferramental comum a todo projeto TypeScript: gerenciador de pacote, versão de
runtime, flags do compilador, ESLint, Prettier, hooks de commit, portões de CI,
entrega (Docker e deploy), `.github` e a definição de pronto, revisão e
depuração. Vale para backend, frontend e `shared/`, Fastify ou Adonis.

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
  prazo — nunca como solução. Quando quem quebra é **outra dependência que ainda não aceita o
  major novo** (o `babel-plugin-react-compiler` 1.0 pulando componentes no `@babel/core` 8), o
  pin fica um major atrás com **saída nomeada** no lugar do prazo: a versão ou condição que o
  libera, escrita no `ignore` do Dependabot (§9) com comentário e reconferida a cada rodada de
  versões.
- Este documento não fixa número de versão de lib. O número certo é "o que
  `npm view <pkg> version` responde agora".
- **"Última" quer dizer "última com um dia de publicada".** O pnpm só resolve versão publicada há
  pelo menos `minimumReleaseAge` minutos, 1440 por padrão desde o 11: a versão de hoje entra amanhã
  (_doc-lib/pnpm.md#supply-chain-security). A casa mantém o padrão, que é defesa contra pacote
  comprometido e não contradiz a regra; correção de segurança urgente entra por
  `minimumReleaseAgeExclude`, com o motivo ao lado, nunca zerando a opção.

**Exceções registradas** (`DECISIONS.md` #121). Major que reescreve a API do próprio core da
casa é decisão, não atualização de rotina: o critério é **o código continuar funcionando**.

| Dependência | Regra | Por quê |
|---|---|---|
| TypeScript | fica na **última 6.x** (`typescript@~6`) em todos os apps, inclusive typecheck. Sem TypeScript 7 (`typescript@7`, `typescript-native`, `@typescript/native-preview`), nem como alias só para o typecheck | a API do 7 mudou e a migração quebrou projeto. Volta a ser avaliado quando houver segurança; aí a migração é planejada (mapear o que mudou, aplicar em todo o código de uma vez) e vira decisão nova |
| `mongodb` (driver) e servidor MongoDB | **sempre a última major**, mesmo com mudança de API: mapear o que mudou pelo changelog e pela `_doc-lib/mongodb.md`, ajustar o código e atualizar | é a base de dados do perfil Fastify; ficar para trás no driver custa correção de segurança e recurso novo |
| pré-lançamento que a stack exige (hoje `nitro` 3 beta) | **versão exata** da última beta, subida à mão lendo `docs/migration`; vira `^<major>` quando sair a estável | faixa sobre pré-lançamento só casa outro pré-lançamento do mesmo `[major, minor, patch]` (README do `semver`), então `^` não anda para a beta seguinte; e a API muda entre betas (`_doc-lib/nitro.md`) |

Dependabot ignora major do TypeScript (`ignore` com `update-types: ["version-update:semver-major"]`
para `typescript`) e abre PR de major do `mongodb` normalmente (configuração na §9).

---

## 0.1 Bibliotecas fixas da casa *(decisão do dono, `DECISIONS.md` #195)*

Uma biblioteca por papel, em todo projeto e nos dois lados. A segunda do mesmo papel é desvio e
migra, como a terceira lib de schema (`AGENTS.md`, "Regras que não se negociam"; `DECISIONS.md` #241).

| Papel | Biblioteca | Fora |
|---|---|---|
| data e hora | **Luxon** (`luxon`, `DateTime`) | `date-fns`, `dayjs`, `moment`, `Date` cru em regra de negócio |
| ícones | **Phosphor** (`@phosphor-icons/react`; `"iconLibrary": "phosphor"` no `components.json`, _doc-lib/shadcn.md) | `lucide-react`, `react-icons`, `@tabler/icons-react`, SVG de ícone colado à mão |
| schema | **Zod** (`zod`) em frontend, `shared/` e backend Fastify; **VineJS** (`@vinejs/vine`) só no backend Adonis, onde é nativo (`DECISIONS.md` #241) | `yup`; `@vinejs/vine` fora do backend Adonis |
| texto rico e Markdown | Tiptap (`@tiptap/react`, `@tiptap/static-renderer`, `@tiptap/markdown`) | `react-markdown`, `remark-*`, `rehype-*`, `marked`, `markdown-it` |

- **Luxon**: o Lucid já hidrata coluna de data como `DateTime` do Luxon (Adonis); no Fastify e no
  frontend, a mesma lib. Exibição sai de `DateTime` com `setLocale` do idioma da requisição e zona
  explícita (`frontend.md` §3.5); transporte é ISO 8601 (`toISO()` / `DateTime.fromISO`).
- **Dependência transitiva não conta**: o `react-day-picker` do `calendar` do shadcn traz o
  `date-fns` por dentro; o código da casa não o importa.
- **Cobrança**: ESLint `no-restricted-imports` no bloco comum (§4.1), com `paths` para o nome exato
  de cada pacote da coluna "Fora" **e** `patterns` para o subcaminho (`date-fns/*`, `react-icons/*`,
  `yup/*`, `remark-*`): `paths` com `date-fns` não pega `date-fns/locale`. A regra só vê import
  estático e reexport; `import()` dinâmico escapa e fica para a revisão (§10.2)
  (_doc-lib/eslint.md#docs/latest/rules/no-restricted-imports).
- Contrato de cada lib: `_doc-lib/luxon.md` (zona, locale, validade) e `_doc-lib/phosphor.md`
  (`IconContext`, acessibilidade, migração pelo `shadcn migrate icons`).

## 1. pnpm workspace *(opinião da casa; versão do pnpm em `devEngines.packageManager`)*

Um repositório por produto, com **pnpm workspace** na raiz: `pnpm-workspace.yaml` lista
`backend`, `frontend` e `shared`, e há **um** `pnpm-lock.yaml`, na raiz (`architecture.md` §9,
`DECISIONS.md` #110). Backend e frontend dependem de `"@<projeto>/shared": "workspace:*"`.
**Por quê**: validator, mensagem, enum e tipo de resposta são o mesmo código nos dois lados; com
o pacote compartilhado, a correção acontece num arquivo só e some o espelho + script de paridade.

- `shared/` só tem código puro: nada de banco, HTTP ou framework (`architecture.md` §2).
- **`shared/` nunca se publica**: nem npm, nem registry privado, nem imagem Docker própria. Ele
  chega aos dois apps pelo `workspace:*` no desenvolvimento e dentro da imagem de cada app na
  entrega (§8.2). Imagem só existe para o que roda: backend e frontend. `"private": true` no
  `package.json` dele impede o `pnpm publish` por engano (`DECISIONS.md` #224).
- **`shared/` sai compilado em `dist/`**. O Node recusa arquivo TypeScript dentro de
  `node_modules` (_doc-lib/nodejs.md#api/typescript), e é lá que o `pnpm deploy` põe o pacote na
  imagem do backend. Então o `package.json` do `shared/` aponta `exports` para `dist/` e lista só
  `dist` em `files`, que é o que o `deploy` copia (_doc-lib/pnpm.md#cli/deploy):

  ```json
  {
    "name": "@<projeto>/shared",
    "private": true,
    "type": "module",
    "sideEffects": false,
    "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
    "files": ["dist"],
    "scripts": { "build": "tsc -p tsconfig.build.json", "dev": "tsc -p tsconfig.build.json --watch" }
  }
  ```

  O `pnpm dev` da raiz sobe o `dev` do `shared/` junto com os apps, e o `typecheck` e o build de
  qualquer app rodam com o filtro que inclui as dependências (`--filter "{./backend}..."`), que
  executa na ordem topológica e compila o `shared/` primeiro (_doc-lib/pnpm.md#filtering).
  O frontend não precisa disso em runtime, porque o Vite empacota o `shared/` no bundle, mas
  importa do mesmo `dist/`, para os dois lados lerem o mesmo artefato.
- Cada app continua com o próprio build, Dockerfile e deploy. O Dockerfile constrói a partir da
  raiz do repositório e instala só o app e o `shared/` (`pnpm --filter "{./<app>}..." install`,
  depois `pnpm --filter ./<app> --prod deploy /out`, _doc-lib/pnpm.md#cli/deploy, #docker).
- **Filtro**: um app só é `--filter ./backend`; o app **com** o que ele usa do workspace é
  `--filter "{./backend}..."` (ou o nome, `--filter @<projeto>/backend...`), a forma que a página
  documenta. `./backend...` não aparece lá (_doc-lib/pnpm.md#filtering). No CI, `--fail-if-no-match`
  impede que um caminho errado passe verde sem rodar nada.
- Dependência que precisa de script de build é liberada em `allowBuilds` do
  `pnpm-workspace.yaml` da raiz, cada entrada com o motivo.

Versão do pnpm em `devEngines.packageManager` no `package.json` da raiz, a forma atual da doc; o
campo `packageManager` é o legado (_doc-lib/pnpm.md#package_json). A versão resolvida fica gravada
no `pnpm-lock.yaml` e é a mesma em toda máquina, no CI e na imagem; a faixa é a major atual:

```json
{
  "devEngines": {
    "packageManager": { "name": "pnpm", "version": "^12.0.0", "onFail": "download" }
  }
}
```

**Sem Corepack.** As páginas de instalação e de CI do pnpm deixaram de usá-lo (o shim sobe um Node
a cada chamada); o pnpm se instala pelo caminho da página e troca sozinho para a versão do projeto
no primeiro uso (_doc-lib/pnpm.md#installation, #continuous-integration).

---

## 2. Node *(opinião da casa — piso de versão)*

**Node ≥ 24** (LTS corrente) em todo projeto — `engines.node` no
`package.json` e a mesma major na imagem Docker (`node:24-alpine`). Runtime
mais antigo some de CI silenciosamente até alguém notar um `--experimental`
flag faltando; declarar `engines` faz `pnpm install` recusar antes.

---

## 3. TypeScript: flags estritas *(opinião da casa sobre a referência do `tsconfig`)*

Versão: a última **6.x** em todo app e em `shared/` (§0, `DECISIONS.md` #121). O `latest` do npm já
é o 7: instale sempre com `pnpm add -D typescript@~6`, nunca `typescript` sem faixa
(_doc-lib/typescript.md#download). Esta é a lista única de flags da régua; `typescript.md` §10
aponta para cá. Nome, efeito e default de cada flag conferidos em _doc-lib/typescript.md#tsconfig.

**Piso, igual em todo `tsconfig.json`** (backend, frontend, `shared/`):

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "noUncheckedSideEffectImports": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": []
  }
}
```

**O que muda por perfil** (X14): resolução de módulo, alvo e tipos de ambiente vêm do preset do
framework; o piso acima se soma por cima e nunca é afrouxado.

| Perfil | Base | Resolução | Extra |
|---|---|---|---|
| Backend AdonisJS | `"extends": "@adonisjs/tsconfig/tsconfig.app.json"` | a do preset (`NodeNext`) | alias pelo campo `imports` do `package.json` (`#features/*`) |
| Backend Fastify | sem preset | `"module": "ESNext"`, `"moduleResolution": "bundler"` (o build é `tsup`) | `experimentalDecorators` + `emitDecoratorMetadata` (DI por decorator, _doc-lib/fastify-decorators.md#Services and dependency injection); `"types": ["node"]` |
| Frontend | `"extends": "nitro/tsconfig"` | `"moduleResolution": "bundler"` | `"jsx": "react-jsx"`, `"noEmit": true`, `"types": ["vite/client"]`; alias `#/*` no `package.json#imports` **e** repetido em `compilerOptions.paths`: o runner do Playwright só lê `paths` do tsconfig (_doc-lib/playwright.md#docs/test-typescript) |
| `shared/` | sem preset | `"module": "NodeNext"`, `"moduleResolution": "NodeNext"` | import relativo com extensão: o que compila em `NodeNext` também compila em `bundler`, então o pacote serve aos dois consumidores |

- **`noUncheckedIndexedAccess`**: acrescenta `undefined` ao campo **não declarado**: acesso por index
  signature (`Record<string, V>`, `{ [id: string]: V }`), por índice de array (`arr[i]`) e grupo de
  regex. `Record<'a' | 'b', V>` tem as chaves declaradas e continua `V`. **Por quê**: sem a flag,
  `row[0]` ou `users[id]` tipam como `T` mesmo quando o índice não existe, e o `undefined` encontra
  o primeiro `.campo` só em produção.
- **`verbatimModuleSyntax`**: import sem `type` fica no JS emitido, import com `type` some; o
  compilador não decide por inferência o que remove. Exige `import type` só de símbolo que é **só
  tipo** (`type`, `interface`); classe é valor, e o import dela fica como está. Quem pede
  `import type` numa classe usada só em posição de tipo é a regra `consistent-type-imports` (§4.1),
  não a flag. No perfil Fastify (decorator + `emitDecoratorMetadata`) a regra se cala sozinha em
  arquivo com decorator (_doc-lib/eslint.md#rules/consistent-type-imports), então não há
  desligamento por linha. O cuidado que sobra é de quem escreve: classe injetada nunca entra por
  `import type`, senão o metadado perde a referência e a injeção chega `undefined`.
- **`noUncheckedSideEffectImports`**: `import 'x'` que não resolve é erro de tipo, não erro de
  bundler descoberto em runtime. Vale para módulo de código; asset fica fora da promessa, porque o
  `vite/client` declara `declare module '*.css'` e com ele `import './stlyes.css'` (nome errado)
  compila. Import de CSS com nome errado aparece no build do Vite, não no `tsc`.
- **`types` explícito**: no TypeScript 6 o default passou a ser nenhum pacote `@types` automático;
  quem precisa de `node` ou `vite/client` declara. Declarar evita depender do default de qualquer
  versão.
- **Removido ou depreciado no 6.x, não usar**: `baseUrl` (alias vem do campo `imports` do
  `package.json` ou de `paths`), `moduleResolution: "node"`/`"node10"`, `esModuleInterop: false`,
  `target: "ES5"`, `outFile`. `strict` já é default no 6.x e continua escrito: a flag não pode
  depender do default.

---

## 4. ESLint: regras que cobram a régua

Config flat (`eslint.config.js`), uma por app. Plugins: `typescript-eslint`, `eslint-plugin-import-x`,
`@eslint-community/eslint-plugin-eslint-comments` e, no frontend, `@tanstack/eslint-plugin-query`,
`@tanstack/eslint-plugin-router`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react`,
`eslint-plugin-react-hooks`, `@vitest/eslint-plugin` e `eslint-plugin-playwright`.

**Sem override por diretório** (X3). Não existe bloco `files: ['start/**', 'providers/**',
'config/**']` desligando regra: isenção por diretório é exatamente por onde o `new XService()` de um
callback passa (`backend.md` §2.1). Override só por **tipo de arquivo** com motivo de linguagem
(`*.d.ts`) ou por decisão registrada (`*.unit.spec.ts`, `DECISIONS.md` #116); exceção de `new` é
por **símbolo**, na allowlist.

### 4.1 Bloco comum (backend, frontend, `shared/`)

```js
// eslint.config.js
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import { defineConfig } from 'eslint/config'
import importX from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'

// Allowlist de `new` por símbolo (backend.md §2.1). Só entra classe cujo nome casa com o
// seletor e que a API de uma biblioteca obriga a instanciar; cada entrada com o motivo.
// Vazia, o `:not` vira `^()$`, que não casa com nome nenhum.
const NEW_ALLOWLIST = []

const NEW_SELECTOR =
  'NewExpression[callee.name=/(Service|UseCase|Policy|Controller|Repository|Seeder)$/]' +
  `:not([callee.name=/^(${NEW_ALLOWLIST.join('|')})$/])`

// Uma lib por papel (§0.1). `paths` casa o nome exato; o subcaminho só cai em `patterns`.
const OUTSIDE_THE_HOUSE = [
  { name: 'date-fns', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  { name: 'dayjs', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  { name: 'moment', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  { name: 'lucide-react', message: 'Ícone: @phosphor-icons/react (tooling.md §0.1).' },
  { name: 'react-icons', message: 'Ícone: @phosphor-icons/react (tooling.md §0.1).' },
  { name: '@tabler/icons-react', message: 'Ícone: @phosphor-icons/react (tooling.md §0.1).' },
  { name: 'yup', message: 'Schema: Zod, ou VineJS só no backend Adonis (tooling.md §0.1).' },
  { name: 'react-markdown', message: 'Markdown: Tiptap (tooling.md §0.1).' },
  { name: 'marked', message: 'Markdown: Tiptap (tooling.md §0.1).' },
  { name: 'markdown-it', message: 'Markdown: Tiptap (tooling.md §0.1).' },
]

const OUTSIDE_PATTERNS = [
  {
    group: [
      'date-fns/*', 'dayjs/*', 'moment/*', 'lucide-react/*', 'react-icons/*',
      '@tabler/icons-react/*', 'yup/*', 'remark-*', 'rehype-*',
    ],
    message: 'Biblioteca fora da casa (tooling.md §0.1).',
  },
]

// VineJS só no backend Adonis (tooling.md §0.1). `files` lista o que NÃO é Adonis; o projeto Adonis
// apaga o bloco inteiro e `backend/` fica de fora do glob.
const VINE_PATH = {
  name: '@vinejs/vine',
  message: 'Schema: Zod; VineJS só no backend Adonis (tooling.md §0.1).',
}

export default defineConfig([
  ...tseslint.configs.recommendedTypeChecked,
  comments.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: { parserOptions: { projectService: true } },
    plugins: { 'import-x': importX },
    rules: {
      // sem ternário: `if` clássico ou lookup (typescript.md §13). `??`, `?.` e `&&` seguem livres.
      'no-ternary': 'error',
      // sem `any`: `unknown` e narrowing na fronteira (typescript.md §2.1).
      '@typescript-eslint/no-explicit-any': 'error',
      // sem `as`; `as const` continua permitido pelo `assertionStyle: 'never'`.
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      // sem `!`: narrowing no topo da função.
      '@typescript-eslint/no-non-null-assertion': 'error',
      // sempre `type`, nunca `interface` (declaration merging: override de `*.d.ts` abaixo).
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // autofix de `import type`; convive com `verbatimModuleSyntax` (§3) e se cala sozinha em
      // arquivo com decorator legado, sem desligamento por linha no Fastify.
      '@typescript-eslint/consistent-type-imports': 'error',
      // promise solta é rejeição sem dono; promise onde se espera void é erro silencioso.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // externo → alias interno (`#…`, `@<projeto>/shared`) → relativo, linha em branco entre grupos.
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          // `@<projeto>/shared` resolve por node_modules e seria `external` sem o pathGroup.
          pathGroups: [
            { pattern: '#**', group: 'internal' },
            { pattern: '@<projeto>/**', group: 'internal' },
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      // `eslint-disable` sem motivo ao lado não passa (§10.2).
      '@eslint-community/eslint-comments/require-description': 'error',
      // logger do framework, nunca `console` (backend.md §4.2); pega também o log de depuração
      // esquecido. Script de CLI escreve em `process.stdout`.
      'no-console': 'error',
      // arquivo que cresce além disto pede divisão (opinião da casa). `warn` só reprova porque o
      // script de lint roda com `--max-warnings 0`.
      'max-lines': ['warn', { max: 1000, skipBlankLines: true, skipComments: true }],
      'no-restricted-imports': [
        'error',
        {
          paths: OUTSIDE_THE_HOUSE,
          patterns: OUTSIDE_PATTERNS,
        },
      ],
      // colaborador vem do container, nunca de `new` (backend.md §2.1, backend-fastify.md §3).
      'no-restricted-syntax': [
        'error',
        {
          selector: NEW_SELECTOR,
          message: 'Colaborador vem do container: injete por construtor (backend.md §2.1).',
        },
      ],
      // `.pipe()` não propaga erro nem destrói os streams quando um falha (backend.md §5.6).
      'no-restricted-properties': [
        'error',
        { property: 'pipe', message: 'Use pipeline de node:stream/promises (backend.md §5.6).' },
      ],
      // código vindo de fora só roda no isolated-vm (backend-fastify.md §13).
      'no-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/no-implied-eval': 'error',
    },
  },
  {
    // frontend, `shared/` e backend Fastify: nada de `@vinejs/vine` (nem subpath). O flat config
    // substitui as opções da regra em vez de somá-las, então este bloco repete `paths` e `patterns`.
    files: ['frontend/**/*.{ts,tsx}', 'shared/**/*.ts', 'backend-fastify/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...OUTSIDE_THE_HOUSE, VINE_PATH],
          patterns: [
            ...OUTSIDE_PATTERNS,
            { group: ['@vinejs/vine/*'], message: VINE_PATH.message },
          ],
        },
      ],
    },
  },
  {
    // declaration merging exige `interface`: limite da linguagem, não estilo.
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/consistent-type-definitions': 'off' },
  },
  {
    // o unitário instancia o use-case com a implementação em memória (DECISIONS.md #116).
    files: ['**/*.unit.spec.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
])
```

`defineConfig` vem de `eslint/config`; o `tseslint.config(...)` está depreciado a favor dele e não
entra em config nova (_doc-lib/eslint.md#packages/typescript-eslint). O script de lint de todo app
é `"lint": "eslint . --max-warnings 0"`: o ESLint sai com 0 quando só há aviso, e sem a flag o
`max-lines` não reprova nada (_doc-lib/eslint.md#docs/latest/use/command-line-interface,
#docs/latest/rules/max-lines).

**`@vinejs/vine` por pasta** *(`DECISIONS.md` #241)*: os globs do bloco acima são os do monorepo da
casa; o projeto Fastify aponta o `files` do backend para a pasta real dele. Projeto Adonis mantém só
`frontend/**` e `shared/**`: o `backend/` importa o VineJS por `core/validator.ts`
(`backend.md` §4.4). `zod` não é restrito em lugar nenhum.

**`consistent-type-imports` e `verbatimModuleSyntax` juntas** *(opinião da casa)*: a página da regra
avisa que as duas podem reportar o mesmo import duas vezes e deixa desligar a regra quando o
diagnóstico do `tsc` basta (_doc-lib/eslint.md#rules/consistent-type-imports). A casa mantém as
duas: a flag é a que reprova o build, a regra é a que corrige com `--fix` e a que pega a classe
importada só como tipo, que a flag deixa passar (§3).

`no-restricted-syntax` carrega **só** a regra de `new`: é o que permite desligá-la no
`*.unit.spec.ts` sem soltar outra proibição junto. Proibição nova de sintaxe entra em
`no-restricted-properties` ou numa regra própria.

`Seeder` está no seletor ao lado dos outros cinco papéis: `new XSeeder(...)` fora do container
escapava pelo mesmo motivo que os outros não escapam, só porque o nome não casava com o regex.

**Por que ESLint e não revisão**: `no-ternary` é do núcleo do ESLint (eslint.org/docs/latest/rules/
no-ternary); `no-explicit-any`, `consistent-type-assertions`, `no-non-null-assertion` e
`consistent-type-definitions` são do `typescript-eslint` (typescript-eslint.io/rules). Custo zero de
manutenção. O seletor de `new` existe porque o erro que ele pega (callback com o contexto em mãos
fazendo `new XService()`) passa em revisão sem ninguém ver; o linter sempre olha
(_doc-lib/eslint.md#docs/latest/rules/no-ternary, #rules/no-explicit-any,
#rules/consistent-type-assertions, #rules/no-non-null-assertion, #rules/consistent-type-definitions).

O que o linter não cobra e continua na revisão (§10.2): `Merge<A,B>` no lugar de `A & B`, lookup no
lugar de 3+ `if/else if`, função coesa. Não finja que estão automatizadas.

### 4.2 Frontend: o que soma ao comum

```js
// frontend/eslint.config.js
import pluginQuery from '@tanstack/eslint-plugin-query'
import pluginRouter from '@tanstack/eslint-plugin-router'
import vitest from '@vitest/eslint-plugin'
import { defineConfig } from 'eslint/config'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import playwright from 'eslint-plugin-playwright'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default defineConfig([
  // ...as entradas do bloco comum (§4.1), na mesma ordem
  ...pluginQuery.configs['flat/recommended'],
  ...pluginRouter.configs['flat/recommended'],
  jsxA11y.flatConfigs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { react },
    rules: {
      // queryKey e queryFn soltos, fora da fábrica de queryOptions (frontend.md §2.1).
      '@tanstack/query/prefer-query-options': 'error',
      // HTML cru é XSS: rich text renderiza pelo componente único de components/common/.
      'react/no-danger': 'error',
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'XSS: renderize pelo React.' },
        { property: 'insertAdjacentHTML', message: 'XSS: renderize pelo React.' },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      'vitest/no-focused-tests': 'error',
      // `.skip` só com `eslint-disable-next-line` + motivo + tarefa (§10.1).
      'vitest/no-disabled-tests': 'error',
    },
  },
  {
    files: ['e2e/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'error',
    },
  },
])
```

O `eslint.config.js` do frontend é o bloco da §4.1 com estas entradas somadas no fim. A config não
vai para `shared/`, que é código puro e não exporta ferramenta (`architecture.md` §9).

- `@tanstack/eslint-plugin-query`: instalar junto com a biblioteca; cada regra é um bug que o
  compilador não vê (_doc-lib/tanstack-query.md#eslint/eslint-plugin-query,
  #eslint/prefer-query-options).
- `@tanstack/eslint-plugin-router`: ordem de propriedade da rota que quebra inferência
  (_doc-lib/tanstack-router.md#eslint/eslint-plugin-router, #eslint/create-route-property-order).
- `eslint-plugin-jsx-a11y`: o anti-padrão de acessibilidade que é lintável (rótulo sem controle,
  clique sem teclado, `alt` ausente). A 6.10.2 declara peer `eslint` só até `^9`: com ESLint 10 o
  pnpm avisa peer não satisfeito, e o aviso é conhecido, não motivo de descer o ESLint
  (_doc-lib/eslint.md#jsx-eslint/eslint-plugin-jsx-a11y).
- `eslint-plugin-react-hooks` com as regras do React Compiler, pelo preset flat
  `reactHooks.configs.flat.recommended`. `configs['recommended-latest']` (sem `flat`) é o formato
  `.eslintrc` e quebra a config flat; `flat['recommended-latest']` é o experimental
  (_doc-lib/eslint.md#reference/eslint-plugin-react-hooks).
- Playwright e `@vitest/eslint-plugin`: teste focado, pulado sem motivo e espera fixa reprovam no
  lint, não na revisão (_doc-lib/eslint.md#mskelton/eslint-plugin-playwright). O Japa não tem plugin
  de lint: o `.pin()` esquecido se cobra pelo `disallowPinnedTests` (§10.1).
- `components/ui/` (shadcn) segue as mesmas regras; a variante marcada `// casa:` (`frontend.md` §6)
  não é motivo de relaxar lint.

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

**Sem ponto e vírgula** *(opinião da casa)*, porque é o default do `@adonisjs/prettier-config`:
adotar o config de uma lib oficial reduz a chance de o próximo projeto divergir. Um
`prettier.config.js` por app, igual nos três. Projeto que ainda está com `semi: true` migra na
próxima reformatação em massa (`MIGRATIONS.md`), não num commit avulso. O CI roda
`prettier --check` (§7).

---

## 6. Husky, commitlint e hooks *(opinião da casa)*

**Um Husky, na raiz** (`.husky/`, `architecture.md` §9): `package.json` da raiz com `husky` e
`@commitlint/cli` + `@commitlint/config-conventional` em `devDependencies` e `"prepare": "husky"`.
Nunca `backend/.husky` com `prepare: cd ..`: o hook da raiz cobre os três pacotes e o `commit-msg`.

**`commit-msg`** chama `pnpm exec commitlint --edit "$1"`. `.commitlintrc.json` estende
`@commitlint/config-conventional`: tipo em inglês (`feat`, `fix`, `refactor`), descrição em pt-BR,
assunto no imperativo, em minúscula (o `subject-case` da base reprova sentence case) e sem ponto
final. O cabeçalho tem até 72 caracteres *(opinião da casa)*: a base fixa `header-max-length` em
100, e o `.commitlintrc.json` sobrescreve
(_doc-lib/commitlint.md#conventional-changelog/commitlint/@commitlint/config-conventional):

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": { "header-max-length": [2, "always", 72] }
}
```

Corpo diz o porquê, e é obrigatório em breaking change, correção de segurança, migration de dado e revert. O resto da convenção de
commit está em `backend.md` §9.

**Autor único, cobrado em três camadas** *(regra do dono, `AGENTS.md`; `DECISIONS.md` #214)*: nenhum
commit, PR ou arquivo leva Claude, Anthropic ou outro agente como autor ou coautor. Regra escrita
não basta: ferramenta de agente injeta o trailer por padrão.

1. **Configuração do agente** em `.claude/settings.json` do projeto (commitado, vale para quem clona):
   `"attribution": { "commit": "", "pr": "", "sessionUrl": false }`. É a chave atual do Claude Code
   (`includeCoAuthoredBy` está depreciada); vale em sessão na nuvem: não confirmado, por isso as
   camadas 2 e 3 existem.
2. **Hook `commit-msg`** recusa o commit antes de ele existir:

   ```sh
   # .husky/commit-msg
   pnpm exec commitlint --edit "$1" || exit 1
   if grep -qiE '^(co-authored-by|claude-session):|generated with|noreply@anthropic\.com|anthropic\.com/claude' "$1"; then
     echo "commit-msg: trailer ou marca de agente na mensagem; o autor é só o dono do repositório" >&2
     exit 1
   fi
   author=$(git var GIT_AUTHOR_IDENT)
   case "$author" in
     *"<jhollyfer.fr@gmail.com>"*) ;;
     *) echo "commit-msg: autor fora do permitido: $author" >&2; exit 1 ;;
   esac
   ```

3. **CI no PR** (`main-check-*.yml`, passo antes do lint):
   `git log --format='%an <%ae>%n%B' "origin/<base>..${{ github.event.pull_request.head.sha }}"` (por
   `env:`, nunca interpolado no `run:`) e o mesmo `grep`; achou trailer de agente ou autor diferente,
   o job falha. Até o head do PR, não até o `HEAD`: no `pull_request` o `HEAD` é o merge sintético que
   o GitHub cria com o e-mail noreply do autor e reprovaria todo PR. Pega o commit feito com
   `--no-verify` ou numa máquina sem o hook.

Commit que já entrou com a marca é corrigido reescrevendo o histórico da branch (`git rebase` com
`--exec`/`filter-branch`), nunca deixado para depois; na `main` compartilhada, só com o dono.

**Branch e PR seguem a convenção, sem nome de agente** *(regra do dono; `DECISIONS.md` #244)*:

- **Título do PR** é uma mensagem Conventional Commits válida, como o assunto do commit:
  `feat(orders): reserva o estoque no checkout`, `fix(auth): ...`, `refactor`, `docs`, `test`,
  `chore`, `ci`, `build`, `perf`. O commitlint confere o título também.
- **Nome da branch** é `<tipo>/<escopo>-<assunto-curto>` em minúsculas e hífen, com o mesmo tipo:
  `feat/orders-reserva-estoque`, `fix/auth-cookie-samesite`, `chore/deps-zod-4-6`.
- **Nunca `claude`, `anthropic`, `codex`, `cursor` ou nome de outro agente** no título do PR, no
  nome da branch, no corpo do PR ou no assunto do commit. Branch que a ferramenta cria com prefixo de
  agente (`claude/...`) é renomeada antes do push (`git branch -m`), e o PR sai da branch renomeada.
- **CI no PR** (`commitlint.yml`): título e branch chegam por `env:`, nunca interpolados no `run:`
  (§9), e o job falha se o título não passar no commitlint, se a branch fugir do padrão ou se
  qualquer um dos dois citar agente:

  ```yaml
  - name: Título e branch do PR
    env:
      PR_TITLE: ${{ github.event.pull_request.title }}
      PR_BRANCH: ${{ github.head_ref }}
    run: |
      printf '%s\n' "$PR_TITLE" | pnpm exec commitlint
      printf '%s\n' "$PR_BRANCH" | grep -qE '^(feat|fix|refactor|docs|test|chore|ci|build|perf|style|revert)/[a-z0-9][a-z0-9-]*$' \
        || { echo "branch fora do padrão <tipo>/<escopo>-<assunto>: $PR_BRANCH" >&2; exit 1; }
      if printf '%s\n%s\n' "$PR_TITLE" "$PR_BRANCH" | grep -qiE 'claude|anthropic|codex|cursor'; then
        echo "nome de agente no título ou na branch do PR" >&2; exit 1
      fi
  ```

**`pre-commit`, por app, filtrado por pasta, com o alvo rápido** (X1, `DECISIONS.md` #113 C9): roda
o `check` e a suíte **unitária** só do app que o commit toca. A suíte E2E fica no CI: precisa de
banco e serviços em container e deixaria o hook lento o bastante para ser pulado com `--no-verify`.

```sh
# .husky/pre-commit
staged=$(git diff --cached --name-only)

touches() {
  printf '%s\n' "$staged" | grep -q "^$1/"
}

if touches shared; then
  pnpm --filter ./shared check && pnpm --filter ./shared test:unit || exit 1
fi
if touches backend || touches shared; then
  pnpm --filter ./backend check && pnpm --filter ./backend test:unit || exit 1
fi
if touches frontend || touches shared; then
  pnpm --filter ./frontend check && pnpm --filter ./frontend test:unit || exit 1
fi
```

Nome dos scripts, igual nos três pacotes: `check` (o de `backend.md` §10 no backend; Paraglide +
lint + typecheck no frontend; lint + typecheck no `shared/`), `test:unit`, `test:e2e`. Mexer em
`shared/` testa os dois consumidores, porque é o contrato deles.

**Autoria**: autor e committer de todo commit são `Jhollyfer Rodrigues <jhollyfer.fr@gmail.com>`
(`git config user.name/user.email` no clone). Nenhum agente aparece como autor ou coautor: mensagem
sem `Co-Authored-By`, `Claude-Session` ou "Generated with"; PR sem rodapé de ferramenta. Commit que
entrou assim é reescrito (autor + mensagem) e a branch recebe `--force-with-lease`.

**Conflito de merge** se resolve pela intenção dos dois lados (commit e PR de cada um), nunca por
`--abort` nem escolhendo um lado inteiro; depois, `check` e testes antes do commit de merge.

**Guarda do agente** (`.claude/settings.json`, hook `PreToolUse`): bloqueia `git reset --hard`,
`git clean -f`, `git branch -D`, `git checkout .`, `git restore .` e `git push --force` sem
`--with-lease`. `git push` comum e `--force-with-lease` passam: o fluxo da casa empurra branch.

---

## 7. Portões de CI *(opinião da casa)*

Todo passo falha o job. Ordem pensada para reprovar cedo: o que é barato vem antes do que sobe
container. **O CI nunca chama o `maiyu-pattern`**: nem clone, nem `sync:check`, nem script de lá
(`backend.md` §11). A cópia da régua commitada no projeto basta.

**Comum a todo job**: `actions/checkout`, `pnpm/setup` (instala o pnpm na versão de
`devEngines.packageManager` **e** o Node pelo `runtime`, sem `actions/setup-node`; `cache: true`
guarda o store) e `pnpm install --frozen-lockfile` na raiz, explícito (`install: false` na action)
para o passo aparecer no log (_doc-lib/pnpm.md#continuous-integration). Action pinada por SHA (§9).
A v3 instala o pnpm travado no `pnpm-lock.yaml` quando o `devEngines` dá faixa; a v2 baixava o último
da faixa e reprovava a própria conferência quando o pnpm trocava para a versão do lock. Lockfile desincronizado é erro de CI, nunca resolvido por um install que reescreve o lock.

```yaml
- uses: pnpm/setup@fa36a5ef7dcdefc3a7cb25655c122e00cf6e636e # v3.1.2
  with:
    runtime: node@24
    cache: true
    install: false
- run: pnpm install --frozen-lockfile
```

Filtro de app nos passos abaixo com `--fail-if-no-match` (§1): sem ele, caminho errado não casa com
projeto nenhum e o passo sai verde sem rodar nada.

**Backend** (`main-check-backend.yml`):

1. `pnpm --filter ./backend lint`
2. `pnpm --filter ./backend typecheck`
3. `pnpm --filter ./backend pattern:check && pnpm --filter ./backend authz:check` (`backend.md` §10)
4. `pnpm --filter ./backend depcruise`: direção das camadas e ciclo (`domain.md` §8)
5. `openapi:check` (`openapi:generate --check --strict`): documento commitado desatualizado ou
   operação sem resposta reprova (`openapi.md`)
6. `pnpm --filter ./backend test:unit`
7. serviços de pé: banco (Postgres ou Mongo) e Redis como `services:` com `--health-cmd`; o que
   precisa de `command` (MinIO) sobe por `docker run` num passo, e a espera é pelo **estado** (o
   bucket existe e responde), não por `sleep`
8. `pnpm --filter ./backend test:e2e`, contra esses serviços, nunca contra ambiente compartilhado
9. `pnpm --filter ./backend di:check` (boota a aplicação; fica no job que já tem os serviços)
10. `pnpm --filter ./backend build`: typecheck de dev e build de produção usam configs diferentes o
    bastante para um passar e o outro falhar

**Frontend** (`main-check-frontend.yml`; no `main.yml`, `main-build-frontend.yml` repete estes
passos e publica o `.output` como artifact):

1. Paraglide compila as mensagens (`src/paraglide/` não é versionado, `i18n.md`), antes de tudo que
   lê tipo. O compilador baixa os plugins declarados em `modules` do `project.inlang/settings.json`,
   que são URLs do jsDelivr: o job precisa de rede para `cdn.jsdelivr.net`, e cada URL leva a versão
   fixada, nunca `@latest` (_doc-lib/paraglide.md#/file-formats). Atualizar o plugin é PR como
   qualquer dependência (§0)
2. `npx @inlang/cli check --project ./project.inlang` (versão da devDependency, por `pnpm exec`):
   tradução faltando, variável e plural faltando, mensagem sem uso (`i18n.md` §4)
3. `lint`
4. `typecheck`: o `tsc --noEmit` do frontend inclui `e2e/` no `include` do `tsconfig.json`. O runner
   do Playwright não checa tipo e roda o teste mesmo com erro de compilação
   (_doc-lib/playwright.md#docs/test-typescript)
5. `prettier --check .`
6. `test:unit` (Vitest, `src/**/*.test.{ts,tsx}`, `architecture.md` §8)
7. `build`, e depois `node scripts/check-chunk-cycles.mjs`, que lê `.output/server` e reprova ciclo
   de chunk que quebra o SSR
8. **Playwright** (`test:e2e`) num job próprio, depois do build, com o backend em container
   (imagem do próprio commit, banco e serviços como no job do backend):
   `pnpm exec playwright install --with-deps chromium`, sem cache de navegador (a doc não
   recomenda); `pnpm exec playwright test --workers=1 --add-reporter=github`; relatório HTML como
   artifact com `if: ${{ !cancelled() }}`, para chegar também quando o teste falha
   (_doc-lib/playwright.md#docs/ci, #docs/ci-intro)

`playwright.config.ts` da casa (_doc-lib/playwright.md#docs/test-configuration):
`forbidOnly: Boolean(process.env.CI)`, `retries: 0` (padrão da biblioteca; retry sem condição
transforma teste quebrado em intermitente, _doc-lib/playwright.md#docs/test-retries; teste instável
é bug com tarefa), `globalTimeout` sempre definido (sem ele a execução não tem teto, e o job morto
pelo provedor não gera relatório; `timeout-minutes` do job, se houver, fica acima dele,
_doc-lib/playwright.md#docs/test-timeouts), `trace: 'retain-on-failure'`,
`screenshot: 'only-on-failure'`, `baseURL` e credenciais por env sem default (`E2E_OWNER_PASSWORD`,
como o seeder), `webServer` com `reuseExistingServer: !process.env.CI`, reporter
`[['html', { open: 'never' }]]`. Fluxo crítico roda `@axe-core/playwright` e reprova violação séria
ou crítica (_doc-lib/playwright.md#docs/accessibility-testing).

- **`workers` no CI** *(opinião da casa sobre a doc)*: `--workers=1` no passo, como a doc recomenda
  para runner hospedado; a config fica sem ternário (`typescript.md` §13). Paralelismo maior vem por
  shard, não por worker.
- **Shard** só quando o job passar do tempo aceitável: cada shard com reporter `blob` e um job final
  com `merge-reports`; o `github` sai nesse caso, porque com matriz a anotação se multiplica
  (_doc-lib/playwright.md#docs/test-sharding, #docs/test-reporters).

**`shared/`**: `check` + `test:unit` no mesmo workflow do backend, antes dele.

**Repositório inteiro** (`ci.yml`):

- `pnpm audit --prod --audit-level=high` reprova vulnerabilidade alta em dependência de produção;
  dev tool fica fora do portão. Correção é atualização revisada (§0), nunca `audit fix` automático.
- Varredura de segredo no diff (secret scanning do GitHub ou `gitleaks`). *Sem `_doc-lib`.*
- `commitlint` em workflow próprio (`commitlint.yml`), gatilho `pull_request`, `fetch-depth: 0`,
  `--from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }}`,
  versão da devDependency (`pnpm exec`, nunca `npx commitlint@N`). Mensagem inválida não espera
  nem bloqueia a suíte.
- Vitrine pública (opcional): Lighthouse CI em workflow próprio contra 2 ou 3 URLs, como o
  commitlint, para não segurar o build.

**ENV no passo, não no job.** Variável de placeholder que só um passo precisa (o `openapi:check`
boota a aplicação e valida `start/env.ts`) vai no `env:` **daquele passo**. No job inteiro ela
venceria o `.env.test` dos passos seguintes, porque variável de processo tem precedência sobre
arquivo, e a suíte apontaria para um banco que não existe. Segredo real vem de `secrets.*`, só no
passo que o usa. Valor de segredo nunca aparece escrito no workflow, nem como default de
placeholder que funcione em produção (chave de teste do provedor, senha de seed).

**CI vermelho**: ler o log do job (`gh run view <id> --log`), achar o trecho que falhou, e só então
mexer. Nunca re-run cego, nunca ramo `if (process.env.CI)` para passar.

**Hook `SessionStart`** do agente (sessão na nuvem), quando o projeto tiver: idempotente, não
interativo, e validado rodando lint num arquivo e um teste.

---

## 8. Entrega *(opinião da casa)*

### 8.1 Workflows

```
.github/workflows/
├── ci.yml                    # pull_request → main: chama main-check-backend e main-check-frontend
├── commitlint.yml            # pull_request
├── main.yml                  # push em main: orquestra os reutilizáveis
├── main-check-backend.yml    # workflow_call (§7)
├── main-check-frontend.yml   # workflow_call (§7)
├── main-build-frontend.yml   # workflow_call: §7 + carimbo de revisão + artifact .output
├── main-docker-backend.yml   # workflow_call
├── main-docker-frontend.yml  # workflow_call
└── main-deploy-coolify.yml   # workflow_call
```

`main.yml`: `check-backend` ∥ `build-frontend` → `docker-backend` ∥ `docker-frontend` → `deploy`.
O deploy espera as **duas** imagens: implantar o frontend contra uma API que não passou é publicar
meia versão. O PR e o push chamam o **mesmo** reutilizável de check: o PR não passa por uma régua
diferente da do deploy.

### 8.2 Imagem Docker

`Dockerfile-production` em cada app, **construído a partir da raiz do workspace** (para enxergar
`shared/` e o lockfile único): `docker build -f backend/Dockerfile-production .`.

- Multi-stage sobre `node:24-alpine`, fixado por digest (`node:24-alpine@sha256:<digest>`) e atualizado
  pelo Dependabot (§9), porque tag móvel muda o que foi auditado sem commit (skill `security-audit`,
  SUPPLY-CHAIN-AND-RELEASE.md); o pnpm entra pelo caminho da página de instalação, sem
  Corepack (`npx get-pnpm`), e troca para a versão de `devEngines.packageManager` no primeiro uso,
  a mesma do CI (_doc-lib/pnpm.md#installation, #docker). A doc também aceita partir da imagem
  `ghcr.io/pnpm/pnpm`; a casa fica com a imagem do Node *(opinião da casa)*, uma base só para os
  dois estágios.
- Estágio de build: copia `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (carrega o
  `allowBuilds`) e os `package.json` dos pacotes; `pnpm --filter "{./backend}..." install
  --frozen-lockfile`; copia o código; `pnpm --filter "{./backend}..." run build` (compila o
  `shared/` antes do app, pela ordem topológica); `pnpm --filter ./backend --prod deploy /out` (só o
  app e o `dist/` do `shared/` no `node_modules`, sem dev tool, _doc-lib/pnpm.md#cli/deploy). É assim
  que o `shared/` entra em produção: dentro da imagem do app, nunca como imagem ou pacote próprio
  (§1).
- Variável que o build exige só para validar o schema de ENV entra como placeholder **no estágio de
  build**; segredo de placeholder (`APP_KEY`) vai inline no `RUN`, nunca em `ENV`, que vira
  metadado da imagem.
- Estágio final: só o artefato; o servidor roda como `node` (ou `nitro`), nunca root;
  `HEALTHCHECK CMD curl -fsS http://127.0.0.1:<porta>/health-check` (`architecture.md` §7).
  Sem volume persistente gravável, `USER node` direto.
- **Imagem com volume persistente gravável** (disco local de arquivos): `ENTRYPOINT` que sobe
  como root, só acerta o dono do volume (`chown -R node:node <pasta>`) e troca de usuário com
  `exec su-exec node "$@"`; `CMD` segue só iniciando o servidor. O Docker só copia o dono da imagem
  para um volume **vazio** (docs.docker.com/engine/storage/volumes, "Populate a volume using a
  container"): volume que veio de outra versão ou de outro uid fica com o dono antigo, e a plataforma
  (Coolify) não dá acesso ao host para o `chown`. O `su-exec` faz `exec` direto, e o servidor vira
  o PID 1 como `node` (github.com/ncopa/su-exec). Nada além disso roda como root: nem migration,
  nem seed (regra abaixo).
- **Sem `ENTRYPOINT` que migra**: migration roda como comando de pré-deploy da plataforma
  (`node ace migration:run --force`, _doc-lib/adonisjs.md#deployment), para que subir réplica não
  seja o mesmo evento que alterar schema. `CMD` só inicia o servidor.
- Nunca `--inspect`, `--insecure-http-parser` ou `insecureHTTPParser` em `CMD`, `NODE_OPTIONS` ou
  config de produção.
- Frontend: Nitro com preset node (_doc-lib/nitro.md#deploy/runtimes/node); a imagem empacota o
  `.output` do artifact do build.
- Publicação (`docker/build-push-action`): multi-arch `linux/amd64,linux/arm64`, cache
  `type=gha` com `scope` por app, tags `latest` **e** o SHA do commit. A tag SHA é o que torna o
  rollback um redeploy, não um rebuild. `context: .` (a raiz) e `file: backend/Dockerfile-production`:
  com o contexto na pasta do app o Docker não enxerga `shared/` nem o lockfile.
- **`.dockerignore` na raiz**, um para as duas imagens, com a lista da página do pnpm
  (_doc-lib/pnpm.md#docker): `node_modules`, `.git`, `.gitignore`, `*.md`, `dist`, mais `.output`,
  `coverage` e `.env*`. O `dist` fica de fora para a imagem compilar o `shared/` do código, e não
  levar um `dist/` velho da máquina de quem rodou o build.
- **Coolify que constrói do Git** (em vez de puxar a imagem do CI): *Base Directory* `/` e
  *Dockerfile Location* `/backend/Dockerfile-production` (ou `/frontend/...`). O Coolify usa a
  *Base Directory* como contexto do build e lê o Dockerfile relativo a ela; com `/backend` ali, o
  `COPY shared/` falha. Em *Watch Paths*, `backend/**`, `shared/**`, `pnpm-lock.yaml` e
  `pnpm-workspace.yaml`, para mudança no `shared/` redeployar os dois apps e mudança só no
  frontend não redeployar a API. *(Doc do Coolify, `coollabsio/coolify-docs@3b7c416`:
  `applications/builds/dockerfile`, `applications/configuration/general`,
  `applications/deployments/automatic-deployments`; sem entrada em `_doc-lib/` ainda.)*

### 8.3 Deploy e prova de revisão

- Disparo do Coolify por `curl -fsS -X POST .../api/v1/deploy` (`-f` reprova 4xx/5xx; `GET`
  responde 405) e a resposta **precisa** conter `deployment_uuid`: sem ele o pedido foi aceito e
  nada foi enfileirado (uuid errado ou sem alcance pelo token).
- O disparo é assíncrono, então o job termina num **smoke test**: a API responde `200` em
  `/health-check`, e o app serve `/revision.txt` com corpo **igual a `GITHUB_SHA`**. Conferência pelo
  corpo, nunca pelo status: o catch-all de SSR responde `200` com HTML para arquivo ausente.
  Tentativas com intervalo e teto (dois minutos), imprimindo tipo e primeiros bytes da resposta
  errada.
- `revision.txt` é carimbado **antes** do build, em `frontend/public/`; o Nitro serve `public/` por
  um manifesto congelado no build, e arquivo escrito depois cai no catch-all
  (_doc-lib/nitro.md#docs/assets). O build confere a entrada no manifesto
  (`grep '"/revision.txt"' .output/server/index.mjs`) e reprova sem ela.
- **Rollback decidido antes do deploy.** Toda entrega com migration registra no PR (ou na linha de
  `docs/TASKS.md`) o gatilho de rollback e o passo: redeploy da tag SHA anterior. Isso só funciona se
  a migration for compatível com a imagem anterior (expandir, migrar, contrair); passo destrutivo
  (apagar coluna, tabela) é deploy à parte, depois que a versão nova se provou.
- O que a plataforma faz e o repositório não (pré-deploy, `COOKIE_DOMAIN`, worker de fila,
  healthcheck do painel, CORS do bucket, compressão do proxy) mora em `docs/ARCHITECTURE.md`,
  seção Ambientes (`documentation.md`).

- **Banco e Redis sem porta pública.** Postgres, Mongo e Redis no Coolify ficam só na rede interna;
  Redis com senha no `REDIS_URL`; `docs/ARCHITECTURE.md` lista cada porta pública e o motivo
  (skill `security-audit`, CLOUD-AND-DEPLOYMENT.md).

### 8.4 `docker-compose.yml`

Só infraestrutura local (banco, Redis, MinIO, SMTP de teste), em `backend/`. A aplicação roda
fora dele (`pnpm dev`). Portas próprias por projeto, para dois projetos subirem juntos na mesma
máquina; nome de container e volume prefixado com o projeto; imagem mantida (nada de imagem extinta
ou sem tag de versão).

**MinIO só para teste; produção é S3 ou R2** *(decisão do dono; `DECISIONS.md` #209 e #210)*

- **MinIO jamais vai para produção.** Ele existe só no `backend/docker-compose.yml`, para dev e para
  os testes e2e (máquina, sessão de agente e CI). Produção usa **S3** ou **R2**, pelo driver da
  FlyDrive (`_doc-lib/flydrive.md#services/s3`, `#services/r2`). `Dockerfile-production`, compose de
  produção, workflow de deploy e `docs/ENV.md` de produção nunca citam MinIO; o `pattern:check`
  reprova `minio` fora de `backend/docker-compose.yml` e `backend/infra/minio/`.
- **Agente e teste sobem o compose antes dos e2e**: `docker compose -f backend/docker-compose.yml up -d`
  e só então `test:e2e` do backend e do frontend; os endpoints de upload (`create`, `parts`,
  `complete`, leitura assinada) são exercitados contra ele. Na sessão de nuvem o `scripts/cloud-setup.sh`
  da régua inicia o `dockerd`.
- **A imagem é compilada do código-fonte numa release fixa.** O repositório comunitário do MinIO
  está sem manutenção e só distribui código-fonte (README oficial em
  `raw.githubusercontent.com/minio/minio/master/README.md`, conferido em 2026-10-14), e a imagem
  `minio/minio` saiu do Docker Hub (`pull access denied ... repository does not exist`, testado em
  2026-10-14). **Validado em 2026-10-14**: `minio` e `mc` compilados das releases abaixo, imagem
  montada, setup rodado e as regras de `backend.md` §5.4 provadas contra ele (resultado na tabela de
  lá). O build precisa de `proxy.golang.org`, `sum.golang.org` e `storage.googleapis.com` na rede.

```dockerfile
# backend/infra/minio/Dockerfile — teste local e CI; nunca produção
FROM golang:1.24-alpine AS build
ARG MINIO_RELEASE=RELEASE.2025-10-15T17-29-55Z
ARG MC_RELEASE=RELEASE.2025-08-13T08-35-41Z
RUN apk add --no-cache git
ENV CGO_ENABLED=0
RUN git clone --depth 1 --branch "$MINIO_RELEASE" https://github.com/minio/minio /src/minio \
 && cd /src/minio && go build -trimpath -o /out/minio .
RUN git clone --depth 1 --branch "$MC_RELEASE" https://github.com/minio/mc /src/mc \
 && cd /src/mc && go build -trimpath -o /out/mc .

FROM alpine:3.22
COPY --from=build /out/minio /out/mc /usr/local/bin/
ENTRYPOINT ["minio"]
```

```yaml
# backend/docker-compose.yml (trecho)
services:
  minio:
    build: ./infra/minio
    image: <projeto>-minio-test:2025-10-15
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_API_CORS_ALLOW_ORIGIN: ${APP_URL}
      MINIO_API_STALE_UPLOADS_EXPIRY: 24h            # multipart abandonado some sozinho
      MINIO_API_STALE_UPLOADS_CLEANUP_INTERVAL: 6h
    healthcheck:
      test: ['CMD', 'wget', '-q', '-O', '/dev/null', 'http://127.0.0.1:9000/minio/health/live']
      interval: 5s
      retries: 10
  minio-setup:
    image: <projeto>-minio-test:2025-10-15
    depends_on: { minio: { condition: service_healthy } }
    entrypoint: ['/bin/sh', '/setup/minio-setup.sh']
    env_file: .env
    volumes: ['./infra/minio:/setup:ro']
```

`backend/infra/minio/minio-setup.sh` (rodado e conferido em 2026-10-14; a limpeza de multipart do MinIO
é por ENV, `MINIO_API_STALE_UPLOADS_*` em `internal/config/api/api.go`, não por `mc ilm`):

```sh
#!/bin/sh
set -eu
mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mb --ignore-existing "local/$S3_BUCKET"
mc anonymous set none "local/$S3_BUCKET"
cat > /tmp/app-policy.json <<JSON
{ "Version": "2012-10-17", "Statement": [{ "Effect": "Allow",
  "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:AbortMultipartUpload","s3:ListMultipartUploadParts"],
  "Resource": ["arn:aws:s3:::$S3_BUCKET/*"] }] }
JSON
mc admin policy create local app-rw /tmp/app-policy.json || true
mc admin user add local "$S3_ACCESS_KEY" "$S3_SECRET_KEY"
mc admin policy attach local app-rw --user "$S3_ACCESS_KEY" || true
```

- A aplicação usa `S3_ACCESS_KEY`/`S3_SECRET_KEY` (usuário de escopo mínimo), nunca o root; o root
  só existe para o setup. Valores de teste no `.env.test`, nunca credencial real.
- No CI o MinIO sobe por `docker run` da imagem compilada (com cache da camada de build) e o `mc` roda
  o mesmo script; a espera é pelo bucket existir (§7, passo 7).
- CORS: no MinIO é global (`MINIO_API_CORS_ALLOW_ORIGIN`); no R2 e no S3 é por bucket, com `ETag` em
  `ExposeHeaders`. O teste local prova o fluxo; o CORS de produção fica conferido em `docs/SECURITY.md`.

---

## 9. `.github` *(opinião da casa)*

- **Action pinada por SHA**, com a versão em comentário: `uses: actions/checkout@<sha> # v4`. Tag
  móvel (`@v4`) muda de conteúdo sem mudar de nome. A mesma major da mesma action em todos os
  workflows.
- **`permissions`** declaradas no topo de cada workflow, mínimas (`contents: read`); só o job que
  precisa ganha mais.
- **`concurrency`** em todo workflow de PR e de push:

  ```yaml
  concurrency:
    group: ${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
  ```

- **Dependabot** (`.github/dependabot.yml`): um bloco `npm` por pacote do workspace e um
  `github-actions`; semanal, `open-pull-requests-limit: 5`, um grupo para patch. Major do
  TypeScript ignorada (§0); major do `mongodb` passa normalmente. *Comportamento do Dependabot com
  pnpm workspace: página oficial não conferida.*

  ```yaml
  version: 2
  updates:
    - package-ecosystem: npm
      directories: [/backend, /frontend, /shared, /]
      schedule: { interval: weekly }
      open-pull-requests-limit: 5
      groups:
        patches: { update-types: [patch] }
      ignore:
        - dependency-name: typescript
          update-types: [version-update:semver-major]
    - package-ecosystem: github-actions
      directory: /
      schedule: { interval: weekly }
    - package-ecosystem: docker
      directories: [/backend, /frontend]
      schedule: { interval: weekly }
  ```

- **Workflow sem injeção** *(skill `security-audit`, SUPPLY-CHAIN-AND-RELEASE.md)*: `pull_request_target`
  não entra; `${{ github.event.* }}` nunca é interpolado dentro de `run:`, só passa por `env:`. O CI
  confere as duas coisas com `grep` nos próprios workflows.

- **`.gitignore` na raiz**, obrigatório, cada bloco com um comentário dizendo o motivo. Ignora
  `node_modules/`, `build/`, `.output/`, `.env` (o `.env.example` e o `.env.test` são versionados,
  `backend.md` §6), `src/paraglide/`, relatório de teste e de Playwright, e o que a árvore declara
  fora dela: `.idea/`, `.vscode/`, `.claude/worktrees/`, pastas de resultado, e
  `CLAUDE-SECURITY-*/` (relatório de varredura com cenário de exploração não vai para o histórico,
  §10.4).
- **Artefato gerado é commitado e conferido por `--check`**: `openapi.json` e
  `schema.generated.ts` (`openapi:check`), `authz-baseline.json` (`authz:check`),
  `routeTree.gen.ts` (o CI roda o build e reprova `git diff --exit-code` no arquivo). Saída de
  compilador que todo build regenera (`src/paraglide/`, `.output/`, `build/`) não é commitada.

---

## 10. Pronto, revisão e depuração *(opinião da casa)*

Processo das etapas 5 a 7 do `AGENTS.md`. As skills (`systematic-debugging`,
`verification-before-completion`, `code-review`) executam; esta seção diz o que conta como feito.

### 10.1 Definição de pronto

- **Pronto é prova executada no `HEAD` atual.** Cada critério de aceite tem um teste ou comando,
  rodado depois da última mudança, com o comando e o resultado mostrados. Resultado anterior só vale
  se o repositório não mudou desde então.
- **Quatro estados por portão** (lint, typecheck, `pattern:check`, unit, e2e, build): passou,
  falhou, não executado, bloqueado. "Não executado" exige a tentativa registrada (comando + erro,
  como `docker ps` sem daemon); sem tentativa, o portão está não verificado e "pronto" não se diz.
  Falha que já existia fora do diff vira nota com referência, não bloqueio.
- **E2E só na fase final do plano** *(decisão do dono, `DECISIONS.md` #212)*: numa sessão que executa um plano (aplicar o padrão, migração, feature em várias fases), as
  fases constroem padrão, organização e arquitetura com **unitário** (TDD, `domain.md` §6), lint,
  typecheck, `pattern:check` e `depcruise`; o compose de teste não sobe e o `test:e2e` não roda. A
  **última fase do plano** sobe o compose (`docker compose -f backend/docker-compose.yml up -d`, §8.4),
  escreve ou ajusta os E2E que faltam (tabela de `backend.md` §5.4 inclusive) e roda `test:e2e` do
  backend e do frontend sobre o todo. Falha ali volta como tarefa da fase dona, não como remendo no
  teste. **Exceção da fase 0** (`DECISIONS.md` #242): plano que mexe em código que já existe
  (aplicar o padrão, migração, refatoração) abre com uma fase 0 que sobe o compose uma vez, escreve
  ou confere os E2E de caracterização dos fluxos críticos que o plano toca (cadastro, login,
  dinheiro, permissão, webhook) e registra o resultado como linha de base. As fases do meio seguem
  só com unitário; a final roda tudo e compara com a linha de base. O CI continua rodando E2E em todo PR (§7): a regra é do ritmo da sessão, não do portão.
- **Verificar não amplia escopo**: ao verificar não se edita produto nem se acrescenta teste fora do
  critério. Achado vira linha em `docs/TASKS.md`.
- **Atalho de teste é proibido** e cobrado (§4, §7): `.only`, `.skip` ou `test.fixme` sem motivo e
  tarefa, `.pin()` do Japa esquecido, asserção afrouxada, `--no-verify`, `if (process.env.CI) return`.
  Enfraquecer teste para passar é a regra de `domain.md` §10.
- **Japa**: `tests/bootstrap.ts` registra `disallowPinnedTests({ disallow: Boolean(process.env.CI) })`
  (de `@japa/runner/plugins`) em `plugins`. Com `.pin()` esquecido, o runner roda só o teste fixado
  e o CI fica verde sem a suíte; o plugin reprova (_doc-lib/japa.md#docs/filtering-tests).
- Entrega sem `// TODO` sem dono, sem `// ...` e sem stub no lugar do que foi pedido.

### 10.2 Revisão de código

- **Ferramenta primeiro, olho depois**: `check` e os testes do diff rodam antes da leitura. O que
  lint, typecheck, `pattern:check` e `authz:check` pegam não vira comentário; achado determinístico
  (padrão proibido, nome) vira regra de lint ou de `pattern:check` no mesmo ciclo.
- **Duas trilhas, dois relatórios**: régua (`_standards/`, `docs/RULES.md`, `code-pattern`) e spec
  (`.specs/features/<f>/spec.md` ou a linha de `docs/TASKS.md`), sem fundir nem reordenar. Sem spec,
  a trilha diz "sem spec".
- **Evidência ou silêncio**: achado interno cita `arquivo:linha` relido; achado sobre biblioteca cita
  a entrada da `_doc-lib` e a página oficial (`DECISIONS.md` #114).
- **Decisão sem contrato é bloqueador**: uso de biblioteca novo ou mudado no diff (API, opção,
  padrão) sem a página oficial citada no commit, no PR ou no comentário de "por quê" volta para o
  autor. O revisor abre a mesma página antes de aprovar. Duplicação cita os dois lugares.
  Afirmação de PR ("corrige a corrida") sem teste que falha antes e passa depois vira pergunta.
- **Ordem de leitura**: correção e dado, segurança, manutenção, desempenho, estilo.
- **Segurança**: injeção (SQL, NoSQL, comando), XSS, CSRF, falha de autenticação e de autorização
  (posse do recurso, 404 quando a existência é segredo, `backend.md` §4.6), segredo ou credencial
  no código, desserialização insegura, path traversal em nome de arquivo do storage, SSRF em URL
  vinda do usuário, upload sem teto de tamanho e tipo.
- **Desempenho**: N+1 (relação lida em laço sem `preload`), consulta ou laço sem limite (listagem
  sempre paginada), índice ausente para o filtro novo, recurso que não é liberado.
- **Correção**: entrada vazia, nula e no limite; corrida e concorrência (idempotência por índice
  único, não por `find` antes do `insert`); erro propagado como `Either`, nunca engolido.
- **Bypass que o revisor procura**: `eslint-disable` e `@ts-expect-error` sem motivo ao lado,
  `as unknown as`, `!`, `catch` que engole, `.skip`, retry em volta de bug determinístico, número ou
  texto mágico de regra de negócio, `TODO` sem dono, código comentado.
- **Severidade e veredito**: bloqueador (perda de dado, auth, dinheiro, migration irreversível, PII
  em log) pede mudança; "deve corrigir" comenta; detalhe tem no máximo 5 comentários inline, o resto
  contado; problema pré-existente só no resumo. Rodada 1 completa; a seguinte só confere a correção
  e o que ela introduziu; a terceira fecha (corrigido, tarefa ou fora da thread). Aprova-se quando o
  diff melhora o código, mesmo imperfeito.
- **Voz**: primeira linha diz problema e local (`arquivo:linha: problema. correção.`); correção
  mais barata primeiro (helper do projeto, stdlib, plataforma, dependência instalada, código novo);
  sem elogio, sem emoji, em pt-BR.

### 10.3 Depuração

- **Sem laço vermelho, sem hipótese.** Antes de ler código para teorizar, existe um comando já
  executado que reproduz o sintoma exato: determinístico, em segundos, sem humano. Ordem de
  costura: teste na camada (unitário do use-case com repository em memória, E2E da ação, spec
  Playwright), `curl` contra o servidor de dev, script de replay, `git bisect run`.
- **Minimizar, depois 3 a 5 hipóteses falsificáveis** ("se X é a causa, mudar Y faz sumir"),
  mostradas ao dono antes de testar; uma variável por vez.
- **Log temporário com prefixo único** (`[DEBUG-a4f2]`), removido por `grep` antes do commit; o
  `no-console` (§4) pega o esquecido. Saída mostrada é redigida: segredo vira `<REDACTED>`.
- **Teste de regressão antes do fix, na costura certa**: bug de costura (middleware, policy,
  serialização) no E2E da ação; bug de regra no unitário da entidade ou do use-case. Sem costura que
  reproduza o padrão real, é achado de arquitetura (`docs/TASKS.md`), não teste raso.
- O commit `fix(...)` diz a causa confirmada no corpo.
- **Regressão de desempenho**: medir antes (baseline com `performance.now`, `EXPLAIN`, trace do
  navegador), bisect depois. Log não mede.


### 10.4 Varredura de segurança com `claude-security` *(opinião da casa)*

Plugin oficial `claude-security@claude-plugins-official` (`AGENTS.md`, "Plugins obrigatórios").
Roda dentro da sessão, com as permissões dela; serve para código da casa, não para repositório de
terceiro.

- **Ao entrar num projeto** para aplicar o padrão: "Scan codebase" do repositório inteiro, esforço
  `medium` ou mais. Cada achado confirmado vira linha em `_findings/<projeto>.md` no upstream (seção
  de segurança, com a severidade do relatório) e, no projeto, linha de prioridade Alta em
  `docs/TASKS.md`.
- **Antes do PR**, "Scan changes" em `high` quando o diff toca a borda: rota, middleware, sessão ou
  cookie, policy, validator, upload, webhook, ENV, SQL ou consulta crua, dependência nova. O resto
  do diff fica com a revisão de §10.2.
- **Patch sugerido não se aplica como veio**: entra pelo fluxo normal, com teste que falha antes e
  passa depois (`superpowers:test-driven-development`), `code-pattern` e `check`. A forma da
  correção é a da régua (`backend.md` §4.10, §5.4, §5.5), não a do patch.
- **Relatório fica fora do git**: `CLAUDE-SECURITY-<timestamp>/` está no `.gitignore` (§9). O que
  sobrevive é a linha em `docs/TASKS.md` ou `docs/SECURITY.md`, com arquivo e linha, nunca o
  cenário de exploração nem valor de segredo.
- Falso positivo sai com motivo, como em `_findings/README.md` (`descartado: <motivo>`).

### 10.5 Modelo por etapa: Opus planeja, Sonnet executa *(opinião da casa)*

Todo planejamento é do **Opus 5.5** (`claude-opus-5-5`): brainstorming, spec, design, plano, quebra em
tarefas, decisão de arquitetura e replanejamento quando a execução sai do plano. Toda execução do
plano é do **Sonnet 5.5** (`claude-sonnet-5-5`): implementar tarefa, escrever teste, corrigir lint ou
CI, migrar arquivo. Revisão final do diff (etapa 7) volta para o Opus, porque é o mesmo julgamento do
plano. Etapas: 1 e 3 Opus; 4 a 6 Sonnet; 7 Opus (`AGENTS.md`, fluxo).

Como se cobra:

- **Sessão:** modelo `opusplan`, que usa Opus no modo de plano e Sonnet fora dele. Por projeto, no
  `.claude/settings.json`; o dono cola, porque o agente não edita esse arquivo:

  ```json
  "model": "opusplan",
  "env": {
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-5-5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-5-5",
    "CLAUDE_CODE_SUBAGENT_MODEL": "claude-sonnet-5-5"
  }
  ```

  `opusplan` usa o alias `opus` no modo de plano e `sonnet` fora dele. Na API da Anthropic os dois
  apontam hoje para Opus 5.5 e Sonnet 5.5, mas alias acompanha a versão nova sozinho: as duas
  `ANTHROPIC_DEFAULT_*` fixam a versão, e trocar de versão vira decisão registrada. Pede Claude
  Code v2.1.284 ou mais novo (Sonnet 5.5; Opus 5.5 pede v2.1.280). Na sessão em nuvem, as mesmas
  variáveis entram nas variáveis de ambiente do ambiente.
- **Subagente:** executor (implementador de tarefa, `superpowers:subagent-driven-development`,
  `tlc-implement`, `dispatching-parallel-agents` de execução) roda em Sonnet: a variável vale para
  o subagente que não recebe modelo de outro jeito. Ordem da doc: modelo passado na chamada >
  `model` da definição do subagente (inclusive `inherit`) > `CLAUDE_CODE_SUBAGENT_MODEL` > modelo da
  conversa. Então subagente de planejamento ou de revisão final recebe `model: "opus"` na própria
  chamada. Os embutidos `Plan` e `Explore` herdam o modelo da conversa (não leem a variável sem o
  `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, que a casa não usa): no modo de plano do `opusplan` eles rodam
  em Opus, que é o desejado.
- Sem `opusplan` disponível, o agente diz qual modelo está rodando antes de planejar e pede a troca
  (`/model`) em vez de planejar no modelo de execução.

Conferido em 2026-10-26: `_doc-lib`-equivalente ainda não existe para o Claude Code; as páginas
usadas foram `https://code.claude.com/docs/en/model-config.md` (aliases, `opusplan`, versões, fixar
versão) e `https://code.claude.com/docs/en/sub-agents.md` ("Choose a model", embutidos).
