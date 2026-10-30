# dependency-cruiser

> Conferido em 2026-10-14 contra as 6 páginas abaixo (o README e os `doc/*.md` do repositório,
> lidos pelo fonte em `raw.githubusercontent.com/sverweij/dependency-cruiser/main`; `github.com`
> não abre pelo proxy sem anexar o repositório) e contra o pacote publicado
> `dependency-cruiser@18.6.0` (`npm pack`: `package.json`, `types/*.d.mts` e o modelo do `--init`).
> Engines do 18.6: Node `^22 || ^24 || >=26`.

Valida as dependências entre arquivos contra regras escritas por você: direção de camada, ciclo,
módulo órfão, import de devDependency em produção. Na régua, é quem cobra a tabela de camadas de
`architecture.md` §2 (`domain.md` §8, `tooling.md` §7 passo 4).

**O que é:** um analisador que percorre o código (JS, TS, ESM, CommonJS), resolve cada import como
o Node e o TypeScript resolveriam e compara cada aresta com as regras do
`.dependency-cruiser.{js,cjs,mjs,ts,cts,mts,json}`. As regras ficam em `forbidden` (aresta
proibida), `allowed` (lista positiva) e `required` (aresta obrigatória); cada uma tem `from` e `to`
com `path`/`pathNot` em **expressão regular**, não glob. O binário é `depcruise` (também
`dependency-cruiser`).

**Para que serve:** reprovar no CI o import que a arquitetura proíbe e que o compilador aceita:
feature importando model ou outra feature, domínio importando repository, ciclo que no Fastify
faz a injeção chegar `undefined`.

**Como usar:**

```bash
pnpm --filter ./backend add -D dependency-cruiser
pnpm --filter ./backend exec depcruise --init   # gera .dependency-cruiser.cjs comentado
```

```js
// backend/.dependency-cruiser.cjs
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'features-nao-importam-models',
      comment: 'models/ só é importado por repositories/ (architecture.md §2)',
      severity: 'error',
      from: { path: '^app/features/' },
      to: { path: '^app/models/' },
    },
    {
      name: 'feature-nao-importa-outra-feature',
      comment: 'o compartilhado sobe para _shared, domínio ou service (architecture.md §2)',
      severity: 'error',
      from: { path: '^app/features/([^/]+)/' },
      to: { path: '^app/features/', pathNot: ['^app/features/$1/', '^app/features/_shared[.]'] },
    },
  ],
  options: {
    doNotFollow: { path: ['node_modules'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
}
```

```json
// backend/package.json
{ "scripts": { "depcruise": "depcruise app" } }
```

**Quando adotar a biblioteca:** em todo backend, com as regras de camada de `architecture.md` §2 e
`no-circular`, e nada mais até a regra nova provar que reprova um import proibido (`domain.md` §8).

**O que muda a experiência:**

1. **Severidade padrão é `warn`.** Regra sem `severity: 'error'` aparece no relatório e não muda o
   código de saída: o reporter `err` sai com o número de violações **de erro**.
2. **Import só de tipo não aparece por padrão.** Sem `tsPreCompilationDeps: true`, `import type`
   e import não usado somem do grafo, porque não existem no JavaScript compilado. A feature que
   importa um tipo de `models/` passa calada.
3. **Caminho é regex sobre o caminho relativo ao diretório corrente.** Rodar da raiz do workspace
   ou de `backend/` muda o prefixo (`^backend/app/` contra `^app/`); o script roda de dentro do app.
4. **`$1` liga o `to` ao `from`.** Grupo de captura no `from.path` reaparece como `$1` no
   `to.path`/`to.pathNot`: é assim que "uma feature não importa outra" vira uma regra só.
5. **Baseline para entrar em código legado.** `--baseline` grava as violações atuais e
   `--ignore-known` as rebaixa, para a regra valer já no código novo.

**Links:** 6

**Skills:** `maiyu-backend` (camadas), `coupling-analysis` e `modular-decomposition` (diagnóstico
antes de escrever regra), `setup-ts-deep-modules` (dependency-cruiser por camada, `SKILLS-MAP.md`).
Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`).

---

## Começo

#### sverweij/dependency-cruiser
[doc](https://github.com/sverweij/dependency-cruiser)
**O que é:** o README: instalação como devDependency, `--init` para gerar a config, a regra de
exemplo (`forbidden` com `from.pathNot` e `to.path`), `depcruise src` para validar no formato de
linter e a saída `dot` para grafo.
**Para que serve:** o mapa do que a ferramenta faz e onde está cada referência.
**Quando usar:** primeira leitura. Desde o 13 o arquivo de config é achado sem `--config`.

## Uso

#### doc/cli.md
[doc](https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md)
**O que é:** a linha de comando: argumentos (arquivos, pastas, globs), `--output-type` (`err`
padrão, `err-long`, `dot`, `archi`, `mermaid`, `html`, `markdown`, `json`, `baseline`), `--config`
(nomes padrão `.dependency-cruiser.{js,cjs,mjs,ts,cts,mts,json}`), `--no-config`, `--init`,
`--baseline` e `--ignore-known` (arquivo `.dependency-cruiser-known-violations.json`),
`--ts-pre-compilation-deps`, `--ts-config`, `--cache`. O reporter `err` sai com 0 sem violação e,
com violação, com o número de violações de severidade `error`.
**Para que serve:** o script `depcruise` do app e o passo 4 do CI de backend.
**Quando usar:** `"depcruise": "depcruise app"` no `package.json` do backend; CI chama
`pnpm --filter ./backend depcruise`. Opção antes da pasta exige `--` quando ambígua
(`depcruise --config -- app`). `--cache` só local.

#### doc/rules-tutorial.md
[doc](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-tutorial.md)
**O que é:** o passo a passo de escrever regra (nome, severidade, apertar o `from`/`to`) e as
receitas: isolar pastas irmãs (`from: { path: '(^features/)([^/]+)/' }`,
`to: { path: '^$1', pathNot: '$1$2' }`), "must use", módulo compartilhado, módulo não usado,
dependente novo de módulo depreciado. `from: {}` é mais rápido que `from: { path: '.+' }`.
**Para que serve:** a receita exata de "uma feature não importa outra".
**Quando usar:** ao escrever a regra de feature contra feature e qualquer regra de camada nova. A
receita crua também reprova o `_shared.<tema>.ts` da raiz de `app/features/`; a versão do cabeçalho
acrescenta esse caminho ao `pathNot`.

```js
{
  name: 'feature-nao-importa-outra-feature',
  severity: 'error',
  from: { path: '(^app/features/)([^/]+)/' },
  to: { path: '^$1', pathNot: '$1$2' },
}
```

## Referência

#### doc/rules-reference.md
[doc](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
**O que é:** a estrutura da config (`forbidden`, `allowed`, `allowedSeverity`, `required`,
`extends`, `options`), a de cada regra (`name`, `comment`, `severity` com padrão `warn`, `from`,
`to`, `scope`) e as condições: `path`/`pathNot` em regex (com `$1`, `$2` no `to`), array de regex,
`orphan`, `reachable`, `circular` com `via`/`viaOnly`, `dependencyTypes`/`dependencyTypesNot`
(`type-only`, `npm-dev`…), `preCompilationOnly`, `couldNotResolve`, `license`. Config em JS
exporta o objeto.
**Para que serve:** é o contrato da regra de camada.
**Quando usar:** ao escrever regra. Confirmado: a regra de camada é `forbidden` com
`from: { path }` e `to: { path }` (ou `pathNot`), em regex sobre o caminho a partir do diretório
corrente. `no-circular` com `from: {}` e `to: { circular: true }`; para aceitar ciclo que só existe
por `import type`, `viaOnly: { dependencyTypesNot: ['type-only'] }`. A casa proíbe ciclo de
qualquer tipo, então fica sem `viaOnly`.

```js
{
  name: 'dominio-nao-conhece-persistencia',
  comment: 'domain/ importa só core e shared (architecture.md §2)',
  severity: 'error',
  from: { path: '^app/domain/' },
  to: { path: '^app/(models|repositories|services|features|middleware|policies)/' },
}
```

#### doc/options-reference.md
[doc](https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md)
**O que é:** as opções: filtros (`doNotFollow`, `includeOnly`, `exclude`, `focus`, `reaches`,
`collapse`, `maxDepth`), `tsPreCompilationDeps` (`true` ou `"specify"`), `tsConfig` (só lê
`compilerOptions`, entende `extends`), `combinedDependencies` (monorepo, padrão `false`),
`enhancedResolveOptions` (`exportsFields`, `conditionNames`, `extensions`), `baseline` (`mode`,
`staleEntriesSeverity`), opções de reporter.
**Para que serve:** fazer a ferramenta ver o que o TypeScript vê.
**Quando usar:** sempre `tsPreCompilationDeps: true` e `tsConfig` apontando para o `tsconfig.json`
do app, para o alias (`#features/*` do campo `imports`, `paths`) resolver e o `import type` contar.
`combinedDependencies` fica `false`: cada app do workspace tem o próprio `package.json`.

#### doc/faq.md
[doc](https://github.com/sverweij/dependency-cruiser/blob/main/doc/faq.md)
**O que é:** perguntas frequentes: dependência de TypeScript que não aparece (resposta:
`tsPreCompilationDeps: true`), diretiva de três barras, grafo grande demais (`archi`, `ddot`,
filtros), import dinâmico, ESM puro, instalar local em vez de global ou `npx`, tipo de pacote
externo que não resolve.
**Para que serve:** diagnóstico de "a regra não pegou".
**Quando usar:** quando um import proibido passa. Primeiro suspeito: `tsPreCompilationDeps`
desligado; segundo: alias sem `tsConfig`. Instalação local, como devDependency, é a recomendação
da página e a da casa.
