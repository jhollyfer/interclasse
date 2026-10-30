# Japa

> Conferido em 2026-10-14 contra as 27 páginas de `japa.dev/docs` (HTML baixado e reduzido a texto;
> o site não publica `.md` nem `llms.txt`, todos responderam 404) e contra o tipo publicado de
> `@japa/runner@5.4.0`, `@japa/api-client@3.2.1` e `@japa/plugin-adonisjs@5.2.0` (`npm pack` +
> `.d.ts`, sem rodar código). Versões no npm na mesma data: `@japa/assert@4.2.0`,
> `@japa/expect@3.0.7`, `@japa/snapshot@2.0.10`, `@japa/file-system@3.0.0`,
> `@japa/browser-client@2.3.0`, `@japa/openapi-assertions@0.1.2`, `@japa/expect-type@2.0.4`.
>
> **Aviso de versão:** a página do API client diz que a requisição lança erro quando o status é
> `>= 500`. A nota de release de 12/01/2025 ("Do not throw error for status code >= 500") e o código
> de `@japa/api-client@3.2.1` dizem o contrário: toda resposta HTTP resolve, inclusive 500, e só
> falha de transporte lança. Teste de 500 usa `response.assertStatus(500)`, não `assert.rejects`.

Runner de teste para Node.js, sem transpilador e sem CLI próprio: o arquivo `bin/test.ts` é o
ponto de entrada, configura plugins e suítes e roda os testes. É o runner do AdonisJS.

**O que é:** `@japa/runner` exporta `test`, `configure`, `processCLIArgs` e `run`. Os recursos
entram por plugin, cada um acrescentando uma propriedade ao `TestContext`: `assert`
(`@japa/assert`, Chai), `expect` (`@japa/expect`, Jest expect), `client` (`@japa/api-client`),
`visit`/`browser` (`@japa/browser-client`, Playwright), `fs` (`@japa/file-system`), `expectTypeOf`
(`@japa/expect-type`). No Adonis, `@japa/plugin-adonisjs` liga o runner à aplicação: `route()`,
`swap()` de binding do container, cookies assinados no `client`.

**Para que serve:** os dois níveis de teste do backend AdonisJS da casa, unitário (suíte `unit`,
sem banco nem HTTP) e E2E (suíte `functional`, HTTP real contra banco real), conforme
`architecture.md` §3.2 e §8.

**Como usar:** o starter do Adonis já traz o runner, `@japa/assert`, `@japa/api-client` e
`@japa/plugin-adonisjs` configurados; `node ace test` executa o `bin/test.ts`.

```bash
pnpm add -D @japa/runner @japa/assert @japa/api-client @japa/plugin-adonisjs
```

```ts
// tests/bootstrap.ts (o Adonis lê plugins e hooks daqui)
import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { disallowPinnedTests } from '@japa/runner/plugins'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'

export const plugins: Config['plugins'] = [
  assert(),
  apiClient(),
  pluginAdonisJS(app),
  disallowPinnedTests({ disallow: process.env.CI === 'true' }),
]
```

```ts
// app/features/administrator/teams/create/create.e2e.spec.ts
import { test } from '@japa/runner'

test.group('administrator/teams/create', () => {
  test('cria o time e responde 201', async ({ client }) => {
    const response = await client.post('/administrator/teams').json({ name: 'Time A' })
    response.assertStatus(201)
    response.assertBodyContains({ name: 'Time A' })
  })
})
```

**Quando adotar a biblioteca:** em todo backend AdonisJS (`architecture.md` §8, `DECISIONS.md`
#107). No Fastify e no frontend o runner é Vitest (`_doc-lib/vitest.md`); Japa não entra lá.

**O que muda a experiência:**

1. **Função de limpeza devolvida pelo `setup`**, não `teardown` solto: se um `setup` falha, só as
   limpezas dos que rodaram executam. Com `teardown`, todos rodam e quebram sobre estado que nunca
   existiu (`docs/lifecycle-hooks`).
2. **Sem grupo aninhado.** Japa recusa `test.group` dentro de `test.group` por desenho; a
   organização é por pasta, que é como a casa já põe o spec ao lado da ação.
3. **`.pin()` é o `.only` do Japa** e passa em silêncio pelo CI se ninguém cobrar: o plugin
   `disallowPinnedTests` (embutido em `@japa/runner/plugins`) reprova a execução no CI.
4. **Testes rodam em série.** Paralelismo é por suíte em processos separados ou por `--shard`, e
   shards na mesma máquina dividem o mesmo banco: a suíte `functional` só paraleliza com banco
   isolado por shard.
5. **Dataset tipado só com `.with([...]).run(cb)`**: na forma `test(title, cb).with([...])` o
   TypeScript não infere o segundo argumento do callback.

**Links:** 27

**Skills:** `maiyu-backend` (spec ao lado da ação, matriz de E2E de `backend.md` §7),
`superpowers:test-driven-development`, `playwright-skill` (só se a suíte `browser` for adotada).
Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`).

---

## Guides

#### docs/introduction
[doc](https://japa.dev/docs/introduction)
**O que é:** a apresentação do Japa: runner só para backend, sem transpilador (roda com `node`,
inclusive `.ts` com o suporte nativo do Node), sem CLI próprio, plugins oficiais para assert,
expect, snapshot, API client com OpenAPI e browser com Playwright.
**Para que serve:** entender por que o Adonis não usa Vitest: nada de Vite no caminho do teste de
backend, boot mais rápido e depuração sobre o código real.
**Quando usar:** primeira leitura antes de escrever o primeiro spec de um backend Adonis.

#### docs/installation
[doc](https://japa.dev/docs/installation)
**O que é:** `pnpm create japa@latest .` e o arquivo `bin/test.ts` com `processCLIArgs`,
`configure` e `run`; suítes declaradas em `configure({ suites })`; execução por
`node bin/test.ts <suíte>`. Exige Node >= 18 e ESM.
**Para que serve:** saber o que o Adonis já montou: no Adonis, `bin/test.ts` lê
`tests/bootstrap.ts` e as suítes vêm do `adonisrc.ts`.
**Quando usar:** só ao montar Japa fora do starter (pacote isolado, script). No backend Adonis da
casa, as suítes são `unit` (`app/**/*.unit.spec.ts`, `scripts/**/*.unit.spec.ts`) e `functional`
(`app/**/*.e2e.spec.ts`), em `adonisrc.ts` (`architecture.md` §3.2), não em `tests/unit/`.

#### docs/testing-async-code
[doc](https://japa.dev/docs/testing-async-code)
**O que é:** teste assíncrono por `async/await` (recomendado) e `.waitForDone()` com o callback
`done(error?)` para evento e callback; receitas com `promisify`, `timers/promises`, `p-event` e
`get-stream`.
**Para que serve:** não marcar como passou um teste cuja promessa não foi aguardada.
**Quando usar:** sempre `await`. `.waitForDone()` só para evento sem forma de promessa (SSE,
socket, fila); prefira `once(emitter, 'evento')` de `node:events`, que dispensa dependência.

#### docs/grouping-tests
[doc](https://japa.dev/docs/grouping-tests)
**O que é:** `test.group(title, (group) => ...)`, configuração em lote (`group.each.timeout`),
hooks por grupo, `group.tap` para alterar cada teste, e a recusa explícita de grupo aninhado.
**Para que serve:** um grupo por arquivo de spec, com o setup comum (truncar tabela, criar ator).
**Quando usar:** em todo spec de ação. O título do grupo é o caminho da ação
(`administrator/teams/create`), que é o filtro de `--groups`.

#### docs/lifecycle-hooks
[doc](https://japa.dev/docs/lifecycle-hooks)
**O que é:** `setup`/`teardown` no teste, `group.each.setup`/`group.each.teardown` em cada teste do
grupo, `group.setup`/`group.teardown` uma vez por grupo, e a função de limpeza devolvida pelo
`setup`, que recebe `(hasError, test)`.
**Para que serve:** criar e desfazer estado sem vazar entre testes.
**Quando usar:** transação global por teste no E2E (`_doc-lib/adonisjs.md#guides/testing/resetting-state-between-tests`)
sempre como limpeza devolvida pelo `setup`:

```ts
test.group('administrator/teams/create', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
})
```

#### docs/datasets
[doc](https://japa.dev/docs/datasets)
**O que é:** `.with(array | () => Promise<array>)` roda o teste uma vez por linha; título com
interpolação `{campo}`, `{$i}` (a partir de 1) e `{$self}`.
**Para que serve:** a matriz de casos de um validator ou de uma policy sem repetir o teste.
**Quando usar:** matriz papel × ação da policy e casos de 422 por campo (`architecture.md` §8).
Use a forma `.with(...).run(cb)`, que tipa a linha:

```ts
test('{role} recebe {status} em teams.create')
  .with([
    { role: 'ADMINISTRATOR', status: 201 },
    { role: 'REGISTERED', status: 403 },
  ] as const)
  .run(async ({ client }, { role, status }) => {
    const actor = await ActorFactory.merge({ role }).create()
    const response = await client.post('/administrator/teams').json({ name: 'A' }).loginAs(actor)
    response.assertStatus(status)
  })
```

#### docs/test-macros
[doc](https://japa.dev/docs/test-macros)
**O que é:** `test.macro((t, ...args) => valor)`: função presa ao ciclo do teste corrente, que
registra `t.cleanup(...)` e devolve um recurso (arquivo, servidor) sem hook de grupo.
**Para que serve:** recurso de teste reutilizável com limpeza garantida.
**Quando usar:** quando o mesmo recurso aparece em vários specs (servidor HTTP falso de um
fornecedor, arquivo temporário). Mora em `tests/` como helper de teste, um por arquivo.

#### docs/exceptions
[doc](https://japa.dev/docs/exceptions)
**O que é:** `assert.throws`/`assert.rejects`, `expect(...).toThrow`/`.rejects`, e a asserção de
ordem alta `test(...).throws(mensagem | regex)`. Avisa que `try/catch` no teste dá falso positivo
quando nada lança.
**Para que serve:** asserir exceção sem `try/catch`.
**Quando usar:** pouco na casa: falha de negócio é `left(HTTPException)`, não `throw`, então o
unitário de use-case assere o `Either` (`isLeft()` e o código). `assert.rejects` sobra para
infraestrutura (constraint do banco, driver).

#### docs/test-suites
[doc](https://japa.dev/docs/test-suites)
**O que é:** `suites: [{ name, files, configure(suite) }]`, `suite.setup` com limpeza,
`suite.onTest`/`suite.onGroup`, e paralelismo de suítes com `concurrently`. Com `suites`, a
propriedade `files` da raiz não se usa.
**Para que serve:** separar o que sobe servidor e banco do que não sobe.
**Quando usar:** as duas suítes da casa. A `functional` sobe o servidor HTTP no `configure`; a
`unit` nunca, e o sufixo `.unit.spec.ts`/`.e2e.spec.ts` garante que um glob não pega o outro
(`architecture.md` §8).

#### docs/filtering-tests
[doc](https://japa.dev/docs/filtering-tests)
**O que é:** filtro por suíte, `--files`, `--tags` (com `~` para negar e `--match-all`),
`--groups` e `--tests` (título exato), `.pin()` com `--list-pinned`, o plugin
`disallowPinnedTests`, `--failed` e `--shard=atual/total`.
**Para que serve:** rodar só o que o diff toca durante o ciclo TDD.
**Quando usar:** `node ace test functional --files="teams/create"` no ciclo; `disallowPinnedTests`
sempre no `tests/bootstrap.ts`, porque `.pin()` esquecido faz o CI rodar só o teste fixado e ficar
verde. `--shard` só com banco isolado por shard.

#### docs/skipping-tests
[doc](https://japa.dev/docs/skipping-tests)
**O que é:** `.skip(boolean | () => boolean, motivo?)` e teste sem callback, que vira *todo*.
**Para que serve:** desligar um teste com motivo registrado, ou listar cenários antes de
implementar.
**Quando usar:** `.skip` só com motivo e tarefa (`tooling.md` §10.1); `.skip(process.env.CI ...)`
é o atalho proibido. *Todo* serve para escrever os cenários EARS do spec antes do código, e não
pode sobrar no commit de entrega.

#### docs/bail-mode
[doc](https://japa.dev/docs/bail-mode)
**O que é:** `--bail` para parar na primeira falha, com `--bail-layer=suite|group`.
**Para que serve:** feedback rápido localmente.
**Quando usar:** só local. No CI, a suíte inteira roda para o relatório mostrar todas as falhas.

#### docs/test-reporters
[doc](https://japa.dev/docs/test-reporters)
**O que é:** reporters `spec` (padrão), `dot`, `ndjson` e `github` (anotações, ativado sozinho no
GitHub Actions); `--reporters`; reporter próprio estendendo `BaseReporter` de
`@japa/runner/core`, com `runner.getSummary()`. Definir `reporters` na config apaga os padrões.
**Para que serve:** saída legível no terminal e anotação na linha do PR.
**Quando usar:** não mexa em `reporters` sem necessidade: sobrescrever desliga o `github`
automático do CI. Reporter próprio só para ferramenta que lê formato fixo (como o TAP do
simple-hub), e então registre também o `github`.

#### docs/coverage
[doc](https://japa.dev/docs/coverage)
**O que é:** cobertura com `c8` ou `nyc` em volta do comando (`c8 node bin/test.ts`).
**Para que serve:** medir cobertura sem plugin do Japa.
**Quando usar:** `c8` (cobertura nativa do V8, sem instrumentar), no script de teste do backend
quando o projeto define meta de cobertura.

## Plugins

#### docs/plugins/assert
[doc](https://japa.dev/docs/plugins/assert)
**O que é:** `@japa/assert`, a API de assert do Chai exposta como `ctx.assert` (`equal`,
`deepEqual`, `containSubset`, `properties`, `rejects`, `plan`...). Não é cópia exata do Chai; a
página é a referência.
**Para que serve:** a biblioteca de asserção padrão do Adonis, e a que habilita as asserções do
`response` do API client.
**Quando usar:** sempre no backend Adonis. Prefira `strictEqual`/`deepEqual` a `equal` (que compara
com `==`), e `containSubset` para comparar só os campos que importam do corpo.

#### docs/plugins/openapi-assertions
[doc](https://japa.dev/docs/plugins/openapi-assertions)
**O que é:** `@japa/openapi-assertions` (versão 0.x): `openapi({ schemas: [URL] })` e
`assert.isValidApiResponse(response)`, que reprova caminho não documentado, status não documentado,
corpo e cabeçalho fora do schema. Depende de `@japa/assert`.
**Para que serve:** provar que a resposta real bate com o `openapi.json` commitado.
**Quando usar:** no E2E da ação, junto com `response.assertAgainstApiSpec()` do API client, para
cobrar `openapi.md`: o documento gerado e a resposta real não podem divergir. Pacote ainda 0.x:
fixe a versão.

#### docs/plugins/expect
[doc](https://japa.dev/docs/plugins/expect)
**O que é:** `@japa/expect`, o `expect` do Jest como `ctx.expect`.
**Para que serve:** quem prefere a API do Jest.
**Quando usar:** não na casa: o backend Adonis usa `@japa/assert`, e dois estilos de asserção no
mesmo projeto é duplicidade.

#### docs/plugins/api-client
[doc](https://japa.dev/docs/plugins/api-client)
**O que é:** `@japa/api-client`: `ctx.client.get/post/put/patch/delete(url)` com `.json()`,
`.form()`, `.file()` + `.fields()` (multipart), `.qs()`, `.header()`, `.cookie()`, `.dump()`;
`ApiClient.setup/teardown` globais; asserções no `response` (`assertStatus`, `assertBody`,
`assertBodyContains`, `assertHeader`, `assertCookie`, `assertAgainstApiSpec`, `assertCreated`,
`assertUnprocessableEntity`...); rotas tipadas por registro (`client.visit('users.show', params)`
com `unsafeJson`/`unsafeQs` para payload inválido); extensão por `macro`/`getter`.
**Para que serve:** o E2E de toda ação do backend Adonis (`architecture.md` §8).
**Quando usar:** em todo `<ação>.e2e.spec.ts`, cobrindo a matriz de `backend.md` §7. O cliente não
guarda cookie entre requisições: cada chamada parte limpa, e a sessão vem de `loginAs`
(`_doc-lib/adonisjs.md#guides/testing/api-tests`). Teste de 422 usa `unsafeJson` em vez de
`@ts-expect-error`.

```ts
const response = await client.post('/administrator/teams').unsafeJson({ name: '' }).loginAs(actor)
response.assertUnprocessableEntity()
response.assertBodyContains({ errors: [{ field: 'name' }] })
```

#### docs/plugins/browser-client
[doc](https://japa.dev/docs/plugins/browser-client)
**O que é:** `@japa/browser-client` sobre Playwright: `visit(url)`, contexto novo por teste,
classes de página, asserções (`assertPath`, `assertTextContains`, `assertVisible`...), flags
`--headed`, `--slow`, `--trace`, `--browser`. Exige suíte própria (`runInSuites: ['browser']`).
**Para que serve:** teste de navegador dentro do Japa.
**Quando usar:** não na casa: o E2E de navegador é do frontend, com Playwright direto em
`frontend/e2e/` (`architecture.md` §8). Só entraria em backend que renderiza página (Edge,
Inertia), o que a stack não tem.

#### docs/plugins/file-system
[doc](https://japa.dev/docs/plugins/file-system)
**O que é:** `@japa/file-system`: `ctx.fs` (`create`, `createJson`, `cleanup`...) num diretório
temporário apagado ao fim do teste, e asserções `fileExists`, `fileContains`, `hasFiles`,
`dirIsEmpty`.
**Para que serve:** testar código que gera ou lê arquivo.
**Quando usar:** em unitário de comando `ace` ou script que escreve arquivo (gerador de
`openapi.json`, `pattern:check`). Upload de usuário não: esse vai pelo Drive fake do Adonis
(`_doc-lib/adonisjs.md#guides/testing/test-doubles`).

#### docs/plugins/expect-type
[doc](https://japa.dev/docs/plugins/expect-type)
**O que é:** `@japa/expect-type`, wrapper do `expect-type`: `expectTypeOf(x).toEqualTypeOf<T>()`,
`toMatchTypeOf`, `.returns`, `.resolves`, `.parameters`, `.not`, `.exclude`, `.extract`. Não tem
efeito em runtime; o erro aparece no typecheck.
**Para que serve:** travar um tipo público contra regressão.
**Quando usar:** em tipo que outro pacote consome e que nenhum teste de runtime pega (o
`Infer<typeof …Response>` de `shared/`, o tipo de `ctx.actor`). Só cobra se o `tsc` rodar sobre os
specs, o que o `typecheck` do `pnpm check` já faz.

#### docs/plugins/snapshot
[doc](https://japa.dev/docs/plugins/snapshot)
**O que é:** `@japa/snapshot`: `assert.snapshot(x).match()`/`.matchInline()` e
`expect(x).toMatchSnapshot()`, arquivo em `tests/__snapshots__/`, atualização com `-u`.
**Para que serve:** congelar saída grande.
**Quando usar:** raramente: snapshot vira asserção afrouxada quando é atualizado com `-u` sem
leitura (`tooling.md` §10.1). Aceitável para artefato gerado (o `openapi.json`), nunca para corpo
de resposta, que se assere campo a campo.

## Reference

#### docs/reference/test
[doc](https://japa.dev/docs/reference/test)
**O que é:** a API da classe `Test`: `skip`, `fails` (teste de regressão que deve falhar),
`timeout`, `disableTimeout`, `resetTimeout`, `tags` (com `replace|append|prepend`), `retry`,
`waitForDone`, `pin`, `with`, `setup`, `teardown`, `options`, `dataset`, `isPinned`, e extensão
por `Test.macro` com `declare module '@japa/runner/core'`.
**Para que serve:** a referência de cada modificador.
**Quando usar:** `.fails('motivo')` é o jeito de commitar o teste que reproduz um bug antes da
correção (`superpowers:systematic-debugging`). `.retry(n)` não: retry em volta de teste instável
esconde bug (`tooling.md` §10.1).

#### docs/reference/test-context
[doc](https://japa.dev/docs/reference/test-context)
**O que é:** o `TestContext`, instância isolada por teste, com o que cada plugin acrescenta
(`assert`, `expect`, `fs`, `expectTypeOf`, `client`, `browser`, `visit`, `cleanup`) e extensão por
`TestContext.macro` + `declare module '@japa/runner/core' { interface TestContext {...} }`.
**Para que serve:** saber de onde vem cada propriedade desestruturada no callback.
**Quando usar:** ao acrescentar helper de contexto. O `interface` do `declare module` é a exceção
que a casa admite (`backend.md` regra 5): declaration merging exige `interface`.

#### docs/reference/runner-config
[doc](https://japa.dev/docs/reference/runner-config)
**O que é:** as opções de `configure`: `files`, `suites`, `exclude`, `plugins`, `reporters`,
`filters` (inclusive `shard`), `timeout` (padrão 2000 ms; 0 desliga), `forceExit`, `importer`,
`refiner`.
**Para que serve:** a referência do `bin/test.ts`.
**Quando usar:** `forceExit` não: a doc recomenda fechar conexão aberta, e processo que não sai é
sintoma de banco, fila ou servidor que o teardown não fechou. Timeout maior vai por teste
(`.timeout()`), não global.

#### docs/reference/plugins
[doc](https://japa.dev/docs/reference/plugins)
**O que é:** plugin é uma função que recebe `{ emitter, runner, cliArgs, config }` e roda antes
dos testes: pode mudar config, ler flag, registrar hook e estender classes.
**Para que serve:** escrever um plugin próprio.
**Quando usar:** quase nunca; o caso legítimo é cobrança que o projeto quer no runner (como o TAP
do simple-hub). Antes, confira se um plugin oficial ou `@japa/runner/plugins` já resolve.

## More

#### docs/releases
[doc](https://japa.dev/docs/releases)
**O que é:** a tabela de releases por pacote. Marcos: `@japa/runner` com listagem de pinados e
falha por pinado (ago/2025), `getActiveTestOrFail` (jul/2025), reporter `github` (jan/2025),
macros e bail (jan/2025, com quebras); `@japa/assert` sobre Chai 5 (mar/2024);
`@japa/openapi-assertions` separado de `@japa/assert` (dez/2024); `@japa/api-client` deixou de
lançar em status `>= 500` (jan/2025).
**Para que serve:** saber o que mudou antes de atualizar.
**Quando usar:** na atualização de versão (a régua pede sempre a última). A tabela não lista a
versão do `@japa/plugin-adonisjs` 5 nem do runner 5.x: confira no npm.
