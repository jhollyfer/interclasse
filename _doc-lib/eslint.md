# ESLint + typescript-eslint

> Conferido em 2026-10-14 contra as 31 páginas abaixo (HTML de `eslint.org/docs/latest` e de
> `typescript-eslint.io`, nenhum dos dois responde `.md`; os plugins pelo fonte em
> `raw.githubusercontent.com`) e contra o tipo publicado de `eslint@10.12.0`,
> `typescript-eslint@8.71.2`, `eslint-plugin-react-hooks@7.1.1`, `eslint-plugin-jsx-a11y@6.10.2`,
> `eslint-plugin-playwright@2.12.1`, `eslint-plugin-import-x@4.17.1` e
> `@eslint-community/eslint-plugin-eslint-comments@4.8.1` (`npm pack` + `package.json`/`.d.ts`).
>
> **ESLint 10** removeu o `.eslintrc` (só config flat) e procura o `eslint.config.*` a partir da
> pasta de **cada arquivo**, não do diretório corrente. `typescript-eslint@8.71` declara
> `typescript >=4.8.4 <6.1.0`: suporta o TypeScript 6.0 que a régua fixa (`tooling.md` §0) e **não**
> suporta o 7. `eslint-plugin-jsx-a11y@6.10.2` (outubro de 2024) declara peer `eslint` só até `^9`.
> `react.dev` e `eslint-community.github.io` não abrem pelo proxy; as duas páginas foram lidas pelo
> fonte no GitHub, e o link `[doc]` fica o oficial.

Linter de JavaScript (ESLint) e o conjunto que o faz entender TypeScript com informação de tipo
(typescript-eslint). Na régua, é o que transforma regra de escrita em erro de CI.

**O que é:** o ESLint lê um `eslint.config.js` que exporta um **array de objetos de
configuração**; cada objeto pode ter `files`, `ignores`, `languageOptions`, `linterOptions`,
`plugins`, `rules` e `extends`, e os objetos que casam com o mesmo arquivo se mesclam, o de baixo
vencendo. O `typescript-eslint` traz o parser de TypeScript, as regras `@typescript-eslint/*` e os
presets (`recommended`, `strict`, `stylistic` e as variantes `TypeChecked`). Com
`parserOptions.projectService: true`, a regra pede tipo ao mesmo serviço que o editor usa.

**Para que serve:** cobrar automaticamente o que a régua proíbe (`typescript.md`, `tooling.md` §4):
ternário, `any`, `as`, `!`, `interface`, promise solta, `console`, `new` de colaborador, import de
biblioteca fora da casa (`tooling.md` §0.1). Regra que o linter cobra não vira comentário de
revisão (`tooling.md` §10.2).

**Como usar:**

```bash
pnpm add -D eslint typescript-eslint eslint-plugin-import-x @eslint-community/eslint-plugin-eslint-comments
```

```js
// eslint.config.js (um por app; package.json com "type": "module")
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  { ignores: ['build/**', '.output/**', 'src/paraglide/**', '**/routeTree.gen.ts'] },
  ...tseslint.configs.recommendedTypeChecked,
  comments.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      'no-ternary': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    },
  },
])
```

O bloco completo da casa está em `tooling.md` §4.1 e §4.2; este arquivo é o contrato de cada peça.

**Quando adotar a biblioteca:** sempre, em todo app e no `shared/`. Não é escolha de projeto.

**O que muda a experiência:**

1. **`defineConfig` é do ESLint, não do typescript-eslint.** `tseslint.config(...)` está
   **deprecated** a favor de `defineConfig` de `eslint/config`. Exportar o array cru continua
   valendo; `defineConfig` só acrescenta `extends` e tipagem.
2. **Busca de config a partir do arquivo** (ESLint 10): num repositório com `backend/` e
   `frontend/`, cada um com o seu `eslint.config.js`, rodar `eslint` da raiz usa a config do app
   de cada arquivo. Quem dependia do diretório corrente passa `--config`.
3. **Regra com tipo custa um build do TypeScript.** `no-floating-promises` e `no-misused-promises`
   só rodam com `projectService`; arquivo `.js` fora do `tsconfig.json` (o próprio
   `eslint.config.js`) gera erro de parse até entrar em `allowDefaultProject` ou receber
   `tseslint.configs.disableTypeChecked`.
4. **`warn` não reprova o CI.** O ESLint sai com 0 quando só há aviso; `max-lines` como `warn`
   (`tooling.md` §4.1) só cobra com `--max-warnings 0`.
5. **Plugin de preset legado quebra a config flat.** `reactHooks.configs['recommended-latest']`
   é o formato `.eslintrc` (`plugins: string[]`); na config flat o caminho é
   `reactHooks.configs.flat[...]`.

**Links:** 31

**Skills:** `code-pattern` (as regras que o lint cobra), `maiyu-backend`, `maiyu-frontend`,
`superpowers:verification-before-completion` (lint é portão de pronto), `web-accessibility`
(jsx-a11y), `playwright-skill` (plugin de e2e). Dispare junto com a leitura da entrada; a entrada é
o contrato, a skill executa (`SKILLS-MAP.md`).

---

## ESLint: configuração

#### docs/latest/use/configure/configuration-files
[doc](https://eslint.org/docs/latest/use/configure/configuration-files)
**O que é:** o formato flat: nomes aceitos (`eslint.config.js|mjs|cjs|ts|mts|cts`), objeto de
configuração, `files`/`ignores`, mescla em cascata, `linterOptions`, `extends` e a resolução do
arquivo de config. `reportUnusedDisableDirectives` tem default `"warn"`; `"error"` reprova.
`eslint.config.ts` exige `jiti >= 2.2.0` (ou flag experimental do Node).
**Para que serve:** montar o `eslint.config.js` da régua e entender por que o objeto de baixo
vence o de cima.
**Quando usar:** ao criar ou mexer no `eslint.config.js` de um app. A doc recomenda `files` sempre
que houver `extends`, para o preset não vazar para outro tipo de arquivo. Override por diretório
continua proibido na casa (`tooling.md` §4); override por **tipo** de arquivo (`**/*.d.ts`,
`**/*.unit.spec.ts`) é o uso que a página descreve como cascata.

```js
{
  linterOptions: { reportUnusedDisableDirectives: 'error' },
}
```

#### docs/latest/use/configure/rules
[doc](https://eslint.org/docs/latest/use/configure/rules)
**O que é:** severidade (`"off"`/`"warn"`/`"error"`), configuração de regra em arquivo e em
comentário, regra de plugin (`plugin/regra`) e desligamento por comentário. Comentário aceita
descrição depois de `--`: `// eslint-disable-next-line no-console -- motivo`.
**Para que serve:** a sintaxe que a regra `require-description` cobra e que a revisão procura
(`tooling.md` §10.2).
**Quando usar:** ao desligar regra numa linha. Na casa: sempre `-next-line`, sempre com `-- motivo`
e, para `.skip`, com a tarefa (`tooling.md` §10.1).

#### docs/latest/use/configure/plugins
[doc](https://eslint.org/docs/latest/use/configure/plugins)
**O que é:** `plugins: { nome: objetoDoPlugin }` e o uso das regras como `nome/regra`; plugin
local e virtual; processador; linguagem.
**Para que serve:** registrar `import-x`, `react`, `vitest` e afins com o prefixo que as regras
da régua usam.
**Quando usar:** ao somar plugin sem preset (o `react` e o `vitest` do `tooling.md` §4.2). O nome
da chave em `plugins` vira o prefixo da regra.

#### docs/latest/use/configure/language-options
[doc](https://eslint.org/docs/latest/use/configure/language-options)
**O que é:** `languageOptions` (`ecmaVersion`, `sourceType`, `globals`, `parser`,
`parserOptions`), incluindo `ecmaFeatures.jsx`.
**Para que serve:** onde mora o `parserOptions.projectService` do typescript-eslint e as globais
de ambiente.
**Quando usar:** ao ligar regra com tipo (`projectService`) ou ao declarar global de ambiente. O
preset do typescript-eslint já registra o parser.

#### docs/latest/use/configure/ignore
[doc](https://eslint.org/docs/latest/use/configure/ignore)
**O que é:** `globalIgnores([...])` (ou objeto só com `ignores`), padrões default
`**/node_modules/` e `.git/`, desfazer ignore com `!`, e `includeIgnoreFile` para ler o
`.gitignore`.
**Para que serve:** tirar do lint o que é saída de compilador ou arquivo gerado.
**Quando usar:** em todo app: `build/`, `.output/`, `src/paraglide/` e `routeTree.gen.ts` (gerados,
`tooling.md` §9) ficam fora. Objeto que tem **só** `ignores` vale para a config inteira; com outra
chave junto, vale só para aquele objeto.

#### docs/latest/use/command-line-interface
[doc](https://eslint.org/docs/latest/use/command-line-interface)
**O que é:** a CLI: `--fix`, `--max-warnings`, `--cache`/`--cache-location`, `--config`,
`--report-unused-disable-directives`, `--concurrency` (threads; default `off`), `--inspect-config`.
**Para que serve:** o script `lint` de cada app e o passo de CI (`tooling.md` §7).
**Quando usar:** no `package.json`: `"lint": "eslint . --max-warnings 0"` para que aviso também
reprove; `--cache` só local, nunca no CI que parte de checkout limpo.

#### docs/latest/use/migrate-to-10.0.0
[doc](https://eslint.org/docs/latest/use/migrate-to-10.0.0)
**O que é:** o que quebrou no 10: Node `>=20.19`/`>=22.13`/`>=24`; `.eslintrc` e
`ESLINT_USE_FLAT_CONFIG` removidos; busca de config a partir do arquivo virou o default; três
regras novas em `eslint:recommended` (`no-unassigned-vars`, `no-useless-assignment`,
`preserve-caught-error`); comentário `eslint-env` vira erro.
**Para que serve:** migrar projeto que ainda está no 9 (`tooling.md` §0: projeto atrás migra).
**Quando usar:** ao subir a major. Codemods `@eslint/v9-to-v10` e `@eslint/v9-to-v10-config`.

#### docs/latest/extend/selectors
[doc](https://eslint.org/docs/latest/extend/selectors)
**O que é:** a linguagem de seletor de AST: tipo de nó, atributo (`[callee.name="x"]`), regex em
atributo (`[name=/^foo/]`), negação `:not(...)`, filho, descendente.
**Para que serve:** é a gramática do `NEW_SELECTOR` de `tooling.md` §4.1
(`NewExpression[callee.name=/(Service|...)$/]:not([callee.name=/^(...)$/])`).
**Quando usar:** ao mexer na allowlist de `new` ou ao escrever proibição nova por seletor. A `/`
dentro do regex precisa de escape.

## ESLint: regras do núcleo

#### docs/latest/rules/no-ternary
[doc](https://eslint.org/docs/latest/rules/no-ternary)
**O que é:** proíbe o operador ternário. Sem opções. A regra está **congelada** (não recebe
pedido de recurso).
**Para que serve:** cobra o "sem ternário" de `typescript.md` §13.
**Quando usar:** sempre, `'no-ternary': 'error'` no bloco comum. Confirmado: é do núcleo, não de
plugin. A troca é `if` clássico ou lookup object.

#### docs/latest/rules/no-console
[doc](https://eslint.org/docs/latest/rules/no-console)
**O que é:** proíbe chamada e atribuição a métodos de `console`; opção `allow` com a lista de
métodos liberados.
**Para que serve:** logger do framework, nunca `console` (`backend.md` §4.2), e pegar o log de
depuração esquecido (`tooling.md` §10.3).
**Quando usar:** `'no-console': 'error'` sem `allow`. Script de CLI escreve em `process.stdout`.

#### docs/latest/rules/max-lines
[doc](https://eslint.org/docs/latest/rules/max-lines)
**O que é:** teto de linhas por arquivo; opções `max` (default 300), `skipBlankLines`,
`skipComments`.
**Para que serve:** sinal de arquivo que pede divisão.
**Quando usar:** como a régua define (`warn`, 1000, sem linha em branco nem comentário). Lembre que
`warn` só reprova com `--max-warnings 0`.

#### docs/latest/rules/no-restricted-syntax
[doc](https://eslint.org/docs/latest/rules/no-restricted-syntax)
**O que é:** proíbe sintaxe descrita por seletor de AST, com `message` opcional por seletor.
**Para que serve:** a proibição de `new XService()` fora do container (`backend.md` §2.1).
**Quando usar:** só para a regra de `new`, como `tooling.md` §4.1 manda: assim o
`*.unit.spec.ts` desliga a regra sem soltar outra proibição junto.

#### docs/latest/rules/no-restricted-properties
[doc](https://eslint.org/docs/latest/rules/no-restricted-properties)
**O que é:** proíbe propriedade de objeto (`object` + `property`), com `message`; sem `object`, a
propriedade fica proibida em qualquer objeto; `allowObjects`/`allowProperties` abrem exceção.
**Para que serve:** o bloqueio de `innerHTML` e `insertAdjacentHTML` do frontend (`tooling.md`
§4.2).
**Quando usar:** proibição de API por nome de propriedade. Confirmado: omitir `object` vale para
todo objeto, que é o uso da régua.

#### docs/latest/rules/no-restricted-imports
[doc](https://eslint.org/docs/latest/rules/no-restricted-imports)
**O que é:** proíbe import estático (e reexport) de módulo. Duas opções: `paths` (nome **exato**
do módulo, com `message`, `importNames`, `allowImportNames` e `allowTypeImports`) e `patterns`
(padrão estilo gitignore em `group`, ou `regex`, com `message`). A página diz que `paths` com
`import-foo` **não** pega `import-foo/bar`; para o subcaminho, `patterns`. Não cobre `import()`
dinâmico.
**Para que serve:** a cobrança de `tooling.md` §0.1: Luxon é a única lib de data, Phosphor a única
de ícone, VineJS a única de schema.
**Quando usar:** no bloco comum (§4.1), igual nos três pacotes. `paths` para o nome do pacote e
`patterns` para os subcaminhos (`date-fns/locale`, `react-icons/fa`, `zod/v4`), que `paths` deixa
passar.

```js
const FORA_DA_CASA = [
  { name: 'date-fns', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  { name: 'dayjs', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  { name: 'moment', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  { name: 'lucide-react', message: 'Ícone: @phosphor-icons/react (tooling.md §0.1).' },
  { name: 'react-icons', message: 'Ícone: @phosphor-icons/react (tooling.md §0.1).' },
  { name: 'zod', message: 'Schema: VineJS (tooling.md §0.1).' },
]

// dentro de rules:
'no-restricted-imports': [
  'error',
  {
    paths: FORA_DA_CASA,
    patterns: [
      {
        group: ['date-fns/*', 'dayjs/*', 'moment/*', 'react-icons/*', 'lucide-react/*', 'zod/*'],
        message: 'Subcaminho de biblioteca fora da casa (tooling.md §0.1).',
      },
    ],
  },
],
```

## typescript-eslint

#### getting-started
[doc](https://typescript-eslint.io/getting-started)
**O que é:** instalação (`eslint @eslint/js typescript typescript-eslint`) e a config mínima com
`defineConfig`, `files` e `extends: [js.configs.recommended, tseslint.configs.recommended]`.
**Para que serve:** o ponto de partida sem tipo; `strict` e `stylistic` como próximos passos.
**Quando usar:** só como referência de instalação; a casa parte direto do preset com tipo.

#### getting-started/typed-linting
[doc](https://typescript-eslint.io/getting-started/typed-linting)
**O que é:** como ligar regra com informação de tipo: trocar o preset pelo `...TypeChecked` e pôr
`languageOptions.parserOptions.projectService: true`; ligar regra com tipo avulsa sem trocar o
preset; custo de desempenho.
**Para que serve:** é o que faz `no-floating-promises` e `no-misused-promises` funcionarem.
**Quando usar:** em todo app. Na config flat a página não pede `tsconfigRootDir`; o parser o
deduz do arquivo de config.

#### packages/typescript-eslint
[doc](https://typescript-eslint.io/packages/typescript-eslint)
**O que é:** o pacote de entrada: `configs`, `parser`, `plugin`, `extensions`, `globs`
(`globs.ts`, `globs.tsDeclaration` = `**/*.{d.ts,d.*.ts}`) e o `config(...)`, agora
**deprecated** a favor de `defineConfig` do ESLint.
**Para que serve:** saber o que importar de `typescript-eslint`.
**Quando usar:** ao escrever o override de declaração: `files: [tseslint.globs.tsDeclaration]` pega
também `*.d.css.ts`. Não use `tseslint.config(...)` em config nova.

#### users/configs
[doc](https://typescript-eslint.io/users/configs)
**O que é:** os presets: `recommended`, `recommended-type-checked`, `strict`,
`strict-type-checked`, `stylistic`, `stylistic-type-checked`, `all`, `base`,
`disable-type-checked`, `eslint-recommended`. `strict*` e `all` não seguem semver: regra muda fora
de major.
**Para que serve:** escolher o preset e saber em qual cada regra da régua já vem.
**Quando usar:** a régua usa `recommendedTypeChecked` e liga à mão o que é dela. `no-explicit-any`
já vem no `recommended`; `no-non-null-assertion` só no `strict`; `consistent-type-assertions` e
`consistent-type-definitions` só no `stylistic`, por isso a régua os declara.

#### packages/parser
[doc](https://typescript-eslint.io/packages/parser)
**O que é:** opções do parser: `projectService` (usa o `tsconfig.json` mais próximo de cada
arquivo, o mesmo serviço do editor), `allowDefaultProject` (globs sem `**`, para arquivo de config
fora do `tsconfig`), `defaultProject`, `tsconfigRootDir` (default: pasta do arquivo de config).
**Para que serve:** resolver "parsing error: file not included in project".
**Quando usar:** quando `eslint.config.js` ou outro `.js` da raiz do app não estiver no
`tsconfig.json`: `projectService: { allowDefaultProject: ['*.js'] }`. Cada arquivo nesse caminho
custa desempenho; a doc pede uso parcimonioso.

## typescript-eslint: regras da régua

#### rules/no-explicit-any
[doc](https://typescript-eslint.io/rules/no-explicit-any)
**O que é:** proíbe `any` escrito; opções `fixToUnknown` e `ignoreRestArgs`. Está no
`recommended`.
**Para que serve:** `unknown` e narrowing na fronteira (`typescript.md` §2.1).
**Quando usar:** sempre, `'error'`. Confirmado no preset, a régua o declara mesmo assim.

#### rules/consistent-type-assertions
[doc](https://typescript-eslint.io/rules/consistent-type-assertions)
**O que é:** padroniza asserção de tipo. `assertionStyle: 'never'` proíbe toda asserção;
asserção `const` (`as const`, `<const>`) é **sempre** permitida. Está no `stylistic`.
**Para que serve:** o "sem `as`, exceto `as const`" do `AGENTS.md`.
**Quando usar:** `['error', { assertionStyle: 'never' }]`. Confirmado: é exatamente a semântica da
régua. `satisfies` não é asserção e não é pego.

#### rules/no-non-null-assertion
[doc](https://typescript-eslint.io/rules/no-non-null-assertion)
**O que é:** proíbe o `!` pós-fixo. Sem opções. Está no `strict`.
**Para que serve:** narrowing no topo da função em vez de afirmar ao compilador.
**Quando usar:** sempre, `'error'`, declarado à mão porque a casa não usa `strict`.

#### rules/consistent-type-definitions
[doc](https://typescript-eslint.io/rules/consistent-type-definitions)
**O que é:** escolhe entre `interface` e `type` para tipo de objeto; default `'interface'`.
`'type'` reporta `interface`. A FAQ da página registra o que só `interface` faz: merging.
**Para que serve:** o "sempre `type`, nunca `interface`".
**Quando usar:** `['error', 'type']`, com o override de `*.d.ts` (declaration merging) que a régua já
prevê.

#### rules/consistent-type-imports
[doc](https://typescript-eslint.io/rules/consistent-type-imports)
**O que é:** exige `import type` para import que só é tipo. Com `experimentalDecorators` e
`emitDecoratorMetadata` ligados, a regra **não reporta nada** em arquivo que tem decorator (deduz
do `tsconfig` com lint de tipo). A página compara com `verbatimModuleSyntax`: as duas juntas podem
dar relatório **duplicado ou conflitante** no mesmo import.
**Para que serve:** autofix de `import type` que o `tsc` não faz.
**Quando usar:** a régua liga as duas (`tooling.md` §3 e §4.1). Mantê-la é escolha pelo autofix;
o desligamento por linha no perfil Fastify é desnecessário para esta regra, porque ela já se cala
em arquivo com decorator. Quem reclama ali é o `verbatimModuleSyntax`.

#### rules/no-floating-promises
[doc](https://typescript-eslint.io/rules/no-floating-promises)
**O que é:** promise criada e não tratada (`await`, `.then` com rejeição, `.catch`, `void` com
`ignoreVoid`). Exige informação de tipo. Está no `recommended-type-checked`.
**Para que serve:** promise solta é rejeição sem dono.
**Quando usar:** sempre. Disparo intencional sem esperar leva `void` explícito (permitido pelo
default `ignoreVoid: true`) e um comentário do porquê.

#### rules/no-misused-promises
[doc](https://typescript-eslint.io/rules/no-misused-promises)
**O que é:** promise onde não cabe: condição (`checksConditionals`), espalhamento
(`checksSpreads`) e função async onde se espera retorno `void` (`checksVoidReturn`). Exige tipo.
**Para que serve:** pega o `onClick={async () => ...}` e o callback async de API que ignora o
retorno.
**Quando usar:** sempre, com os defaults. Handler async de evento React vai por função nomeada que
trata o erro.

## Plugins que a régua soma

#### reference/eslint-plugin-react-hooks
[doc](https://react.dev/reference/eslint-plugin-react-hooks)
**O que é:** o plugin oficial do React: `rules-of-hooks`, `exhaustive-deps` e as regras do React
Compiler (`purity`, `refs`, `immutability`, `set-state-in-effect`, `static-components`, `use-memo`…)
no preset `recommended`. Página lida pelo fonte (`reactjs/react.dev`) e pelo README do pacote;
`react.dev` não abre pelo proxy.
**Para que serve:** pegar violação das regras do React em build, com ou sem o Compiler ligado.
**Quando usar:** no frontend. O README do pacote (7.1.1) manda, na config flat,
`reactHooks.configs.flat.recommended`; `configs.flat['recommended-latest']` é o "bleeding edge
experimental". O `.d.ts` confirma: `configs['recommended-latest']` (sem `flat`) tem
`plugins: string[]`, formato `.eslintrc`.

```js
import reactHooks from 'eslint-plugin-react-hooks'

export default [reactHooks.configs.flat.recommended]
```

#### jsx-eslint/eslint-plugin-jsx-a11y
[doc](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
**O que é:** regras estáticas de acessibilidade em JSX. Config flat por `flatConfigs.recommended`
ou `flatConfigs.strict`; os presets **não** definem `files` nem `globals`.
**Para que serve:** o anti-padrão lintável (rótulo sem controle, clique sem teclado, `alt`
ausente).
**Quando usar:** no frontend, `jsxA11y.flatConfigs.recommended` com `files` do `src/`. Atenção:
a 6.10.2 declara peer `eslint` só até `^9`; com ESLint 10 o pnpm avisa peer não satisfeito.

#### mskelton/eslint-plugin-playwright
[doc](https://github.com/mskelton/eslint-plugin-playwright)
**O que é:** regras para teste Playwright; preset flat `configs['flat/recommended']`, a ser
aplicado só aos arquivos de teste via `files`. `no-focused-test`, `no-skipped-test`,
`no-wait-for-timeout` e `no-networkidle` estão no `recommended`. Peer `eslint >=8.40.0`.
**Para que serve:** teste focado, pulado e espera fixa reprovam no lint.
**Quando usar:** no frontend, `files: ['e2e/**/*.ts']`. A forma da régua (espalhar o preset no
objeto com `files` e somar `rules`) é equivalente ao `extends` da página.

#### eslint-plugin-eslint-comments/rules/require-description
[doc](https://eslint-community.github.io/eslint-plugin-eslint-comments/rules/require-description.html)
**O que é:** exige descrição depois de `--` em todo comentário diretivo (`eslint-disable`,
`eslint-enable`, `global`…); opção `ignore`. Config flat do plugin em
`@eslint-community/eslint-plugin-eslint-comments/configs` (`comments.recommended`). Lida pelo fonte
no GitHub; o site `github.io` não abre pelo proxy.
**Para que serve:** `eslint-disable` sem motivo não passa (`tooling.md` §10.2).
**Quando usar:** sempre, `'error'`, no bloco comum.

#### un-ts/eslint-plugin-import-x/docs/rules/order
[doc](https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/order.md)
**O que é:** ordem de import por grupo (`builtin`, `external`, `internal`, `parent`, `sibling`,
`index`, `object`, `type`), `pathGroups` por padrão minimatch, `newlines-between`, `alphabetize`.
Um import só é `internal` se casar com `import-x/internal-regex` ou com um `pathGroup`; pacote em
`node_modules` é `external`.
**Para que serve:** externo, depois alias interno, depois relativo, como `tooling.md` §4.1 pede.
**Quando usar:** sempre. O `@<projeto>/shared` resolve por `node_modules` (link do workspace) e cai
em `external`, não em `internal`: para ficar no grupo interno, entra num `pathGroup`
(`{ pattern: '@<projeto>/**', group: 'internal' }`) ou em `settings['import-x/internal-regex']`.
