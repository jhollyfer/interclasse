# Playwright

> Conferido em 2026-10-14 contra as 72 páginas de `playwright.dev/docs` (HTML extraído; o site não
> publica `.md`, `llms.txt` nem `llms-full.txt`, todos 404) e contra o tipo publicado de
> `@playwright/test@1.64.0` / `playwright@1.64.0` / `playwright-core@1.64.0` (`npm pack` + `.d.ts`,
> sem rodar código). A doc lida é a da 1.64 (release notes no topo, imagem Docker `v1.64.0-noble`).
>
> **1.64 quebra duas coisas** que pegam config antiga: `...devices['Desktop Chrome']` agora repassa
> `screen` (media query vê a tela emulada; `screen: undefined` desliga), e JSX em arquivo de teste
> segue o `tsconfig.json`. `--update-snapshots=missing` passou a deixar a execução verde.

Runner de teste ponta a ponta com navegador de verdade (Chromium, Firefox, WebKit), asserção que
espera sozinha, isolamento por contexto e rastreamento (trace) do que aconteceu em cada passo.

**O que é:** `@playwright/test` é o runner (`test`, `expect`, fixtures, config, reporters) sobre a
biblioteca `playwright` (o controle do navegador). O pacote `@playwright/test` só reexporta e
depende de `playwright` na mesma versão; o tipo do runner mora em `playwright/types/test.d.ts` e o
da API de página em `playwright-core/types/types.d.ts`.

**Para que serve:** o E2E do frontend TanStack Start da casa, em `frontend/e2e/<fluxo>.spec.ts`,
contra o app buildado e o backend real em container (`architecture.md` §8, `frontend.md` §11.2).
Componente isolado e hook continuam no Vitest + Testing Library (`frontend.md` §11.1); o teste de
componente do Playwright existe, mas a casa não o adota.

**Como usar:**

```bash
pnpm add -D @playwright/test @axe-core/playwright
pnpm exec playwright install --with-deps chromium
```

```ts
// frontend/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  globalTimeout: 30 * 60 * 1000,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/owner.json' }, dependencies: ['setup'] },
  ],
  webServer: {
    command: 'node .output/server/index.mjs',
    cwd: '..',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

No CI: `pnpm exec playwright test --workers=1 --add-reporter=github`. Flag em vez de ternário na
config, porque a régua não aceita ternário e a CLI já cobre os dois casos (`test-cli`).

**Quando adotar a biblioteca:** todo frontend da casa tem E2E (`architecture.md` §8). Não serve
para teste unitário de hook ou de função de `lib/` (Vitest) nem para teste de API do backend
(Japa ou Vitest do próprio backend; o `request` do Playwright só prepara dado para o E2E).

**O que muda a experiência:**

- **A asserção espera, o valor lido não.** `await expect(locator).toHaveText(x)` tenta de novo até
  o timeout de `expect` (5 s); `expect(await locator.textContent()).toBe(x)` lê uma vez e é
  intermitente. `waitForTimeout` e `networkidle` são marcados no próprio `.d.ts` como "Never wait
  for timeout in production" e **DISCOURAGED**.
- **SSR e hidratação.** O Playwright clica no instante em que o botão aparece; com SSR o HTML chega
  antes do React ligar os eventos, e o clique se perde ou o texto digitado some (`navigations`,
  "Hydration"). A correção que a doc indica é no app (controle desabilitado até hidratar), não
  espera no teste.
- **`page.route` só vê o que o navegador pede.** O loader que roda no servidor Nitro durante o SSR
  não passa por ele; para provocar erro nesse caminho é o backend em container que responde.
- **O runner não checa tipo.** Ele transpila e roda mesmo com erro de TypeScript, e do
  `tsconfig.json` só lê `allowJs`, `baseUrl`, `paths`, `jsx*`, `references` e `extends`
  (`test-typescript`). O `typecheck` do frontend precisa incluir `e2e/`.
- **Retry esconde teste instável.** O modelo do `init` traz `retries: process.env.CI ? 2 : 0` e
  trace `on-first-retry`; a casa usa `retries: 0` e por isso trace `retain-on-failure`, senão a
  falha não grava trace nenhum.

**Links:** 72

**Skills:** `maiyu-frontend`, `playwright-skill`, `superpowers:test-driven-development`,
`web-accessibility`, `chrome-devtools` (depurar a página que o teste abriu), `code-pattern`

---

## Getting Started

#### docs/intro
[doc](https://playwright.dev/docs/intro)
**O que é:** instalação por `pnpm create playwright`, que pergunta pasta de teste (`tests`, ou `e2e`
se `tests` já existe), workflow do GitHub Actions e instalação dos navegadores.
**Para que serve:** saber o que o scaffold cria (`playwright.config.ts`, `tests/example.spec.ts`) e
que, por padrão, roda headless, em paralelo, nos três navegadores.
**Quando usar:** ao ligar o E2E num frontend novo. Na casa a pasta é `frontend/e2e/` e o workflow
gerado não entra: o passo de CI é o de `tooling.md` §7.

#### docs/writing-tests
[doc](https://playwright.dev/docs/writing-tests)
**O que é:** primeiro teste: `page.goto`, ação por localizador, asserção web-first, hooks e o
isolamento por teste.
**Para que serve:** a regra base: a ação espera o elemento ficar acionável e a asserção descreve um
estado que **vai** acontecer, sem espera manual.
**Quando usar:** referência do formato de todo `e2e/<fluxo>.spec.ts`.

```ts
import { expect, test } from './support/test'
import { m } from '../src/paraglide/messages'

test('arquiva a notícia', async ({ page }) => {
  await page.goto('/posts')
  await page.getByRole('button', { name: m.posts_archive() }).click()
  await expect(page.getByRole('status')).toHaveText(m.posts_archived())
})
```

#### docs/codegen-intro
[doc](https://playwright.dev/docs/codegen-intro)
**O que é:** `playwright codegen <url>` grava ações e asserções e sugere o localizador, priorizando
papel, texto e test id.
**Para que serve:** descobrir o localizador que o Playwright considera único na tela real.
**Quando usar:** para achar o `getByRole` de um elemento difícil; o código gravado não entra como
está (string literal no lugar de `m.*()`, sem fixture da casa).

#### docs/running-tests
[doc](https://playwright.dev/docs/running-tests)
**O que é:** rodar tudo, um arquivo, por título (`-g`), por projeto (`--project`), em modo headed
(`--headed`), UI mode (`--ui`) e debug (`--debug`); `show-report` abre o relatório HTML.
**Para que serve:** o ciclo local de escrever e depurar um spec.
**Quando usar:** no dia a dia: `pnpm exec playwright test e2e/posts.spec.ts --ui`.

#### docs/trace-viewer-intro
[doc](https://playwright.dev/docs/trace-viewer-intro)
**O que é:** como gravar e abrir o trace (linha do tempo, DOM antes e depois de cada ação, rede,
console). O modelo grava `on-first-retry` com `retries: 2` no CI.
**Para que serve:** entender a falha do CI sem reproduzir local.
**Quando usar:** em toda falha de E2E no CI. Com o `retries: 0` da casa, o modo é
`retain-on-failure` (ver `test-use-options`).

#### docs/ci-intro
[doc](https://playwright.dev/docs/ci-intro)
**O que é:** o workflow do GitHub Actions que o `init` gera: instala dependência, navegadores com
`--with-deps`, roda e sobe `playwright-report/` como artifact com `if: ${{ !cancelled() }}`.
**Para que serve:** o esqueleto do job; a doc avisa que não põe `timeout-minutes` no job e manda
usar `globalTimeout` na config, para o relatório sair mesmo quando a execução estoura.
**Quando usar:** ao escrever o job `test:e2e` de `tooling.md` §7; o upload com `!cancelled()` é o
que faz o relatório chegar quando o teste falha.

#### docs/getting-started-vscode
[doc](https://playwright.dev/docs/getting-started-vscode)
**O que é:** a extensão oficial do VS Code: rodar, depurar, gravar e escolher localizador no editor.
**Para que serve:** ferramenta de quem escreve teste; não muda o projeto.
**Quando usar:** opcional, por pessoa. Nada de config de editor entra no repositório por causa dela.

#### docs/release-notes
[doc](https://playwright.dev/docs/release-notes)
**O que é:** notas por versão. Na 1.64: `locator.within()`, `testProject.default`, `--shuffle`,
`lock` em `describe.configure`, cookies no `APIRequestContext`, WebMCP, vídeo com `fps`; quebra em
`screen` dos devices e JSX pelo tsconfig.
**Para que serve:** saber o que muda antes de subir a versão (a régua pede sempre a última).
**Quando usar:** em todo bump de `@playwright/test`, junto com `playwright install` (cada versão
fixa a versão dos navegadores, `browsers`).

#### docs/canary-releases
[doc](https://playwright.dev/docs/canary-releases)
**O que é:** build diário na dist tag `@next`; `beta` sai uma semana antes da estável.
**Para que serve:** testar recurso ainda não lançado.
**Quando usar:** não na casa. A régua usa a última **publicada** (`latest`), nunca `next`.

## Playwright Test

#### docs/test-agents
[doc](https://playwright.dev/docs/test-agents)
**O que é:** três agentes (planner, generator, healer) instalados por
`playwright init-agents --loop=claude|vscode|codex|opencode`; o planner escreve um plano em
`specs/*.md` a partir de um `seed.spec.ts`, o generator transforma em teste e o healer conserta o
que quebra.
**Para que serve:** gerar cobertura E2E a partir de um fluxo descrito em texto.
**Quando usar:** com cuidado. Os diretórios que ele cria (`specs/`, `tests/`, `.github/`) não estão
na árvore de `architecture.md` e o `specs/` colide com `.specs/` da casa; e o healer "conserta"
teste, o que pode mascarar bug do app. Se adotado, decisão em `docs/DECISIONS.md` e saída movida
para `e2e/`.

#### docs/test-annotations
[doc](https://playwright.dev/docs/test-annotations)
**O que é:** `test.only`, `test.skip` (com condição), `test.fail`, `test.fixme`, `test.slow`
(triplica o timeout), tags (`{ tag: '@slow' }` ou `@tag` no título) e `annotation` livre.
**Para que serve:** filtrar (`--grep @tag`) e marcar exceção no relatório.
**Quando usar:** `only` e `skip` sem motivo reprovam no lint (`tooling.md` §4,
`playwright/no-focused-test`, `no-skipped-test`) e no runner (`forbidOnly`). `test.fixme` com
motivo e tarefa é a forma honesta de teste que ainda não passa.

#### docs/test-cli
[doc](https://playwright.dev/docs/test-cli)
**O que é:** todas as flags de `playwright test`: `--forbid-only`, `--fail-on-flaky-tests`,
`--last-failed`, `--only-changed [ref]`, `--add-reporter` (soma ao da config), `--reporter`
(substitui), `--workers`, `--shard`, `--shuffle`, `--debug`, `--ui`.
**Para que serve:** ajustar a execução por ambiente sem lógica condicional na config.
**Quando usar:** no CI, `--workers=1 --add-reporter=github`; local, `--last-failed` e
`--only-changed` para iterar rápido.

#### docs/test-configuration
[doc](https://playwright.dev/docs/test-configuration)
**O que é:** opções de topo do runner (`testDir`, `fullyParallel`, `forbidOnly`, `retries`,
`workers`, `globalTimeout`, `reporter`, `projects`, `webServer`, `testMatch`, `outputDir`,
`timeout` de 30 s) e de `expect` (timeout 5 s, `toHaveScreenshot`). Opção do runner fica no topo,
nunca dentro de `use`.
**Para que serve:** o `playwright.config.ts` inteiro.
**Quando usar:** confere `forbidOnly` (`!!process.env.CI` na doc, `Boolean(process.env.CI)` na
casa, mesmo efeito) e `webServer.reuseExistingServer: !process.env.CI`. O padrão de `testMatch`
é `**/*.@(spec|test).?(c|m)[jt]s?(x)`: com `testDir: 'e2e'` o Vitest (`*.test.ts`, em `src/`)
não é pego.

#### docs/test-use-options
[doc](https://playwright.dev/docs/test-use-options)
**O que é:** o bloco `use`: `baseURL`, `storageState`, emulação (`locale`, `timezoneId`,
`colorScheme`, `viewport`), rede (`extraHTTPHeaders`, `offline`), gravação (`trace`, `video`,
`screenshot`) e `testIdAttribute`. Tabela dos modos de trace e vídeo: `retain-on-failure` grava
toda execução e guarda a que falhou; `on-first-retry` só grava em retry.
**Para que serve:** a escolha de modo de trace coerente com a política de retry.
**Quando usar:** com `retries: 0` só `retain-on-failure` (ou `on`) produz trace da falha.
`reducedMotion: 'reduce'` é opção de `use` (no `.d.ts`), o que dá o caso de movimento reduzido de
`frontend.md` §11.2 com `test.use({ reducedMotion: 'reduce', viewport: { width: 320, height: 640 } })`.

#### docs/emulation
[doc](https://playwright.dev/docs/emulation)
**O que é:** `devices[...]`, viewport, `isMobile`, locale e fuso, permissões, geolocalização,
`colorScheme`, `page.emulateMedia`, user agent, offline, JavaScript desligado.
**Para que serve:** testar o fluxo em celular, tema escuro, outro fuso.
**Quando usar:** caso de 320 px e tema escuro do fluxo crítico; `locale: 'pt-BR'` e
`timezoneId: 'America/Manaus'` no projeto quando a tela formata data ou número.

#### docs/test-fixtures
[doc](https://playwright.dev/docs/test-fixtures)
**O que é:** `test.extend<T>()` cria fixture com setup antes de `await use(valor)` e limpeza
depois; escopo de teste ou de worker, `{ auto: true }`, `{ box: true }`, `mergeTests` para juntar
fixtures de módulos.
**Para que serve:** ator, sessão, coleta de erro de console e helpers de domínio sem repetir código
nem depender de ordem.
**Quando usar:** `e2e/support/test.ts` reexporta o `test` estendido e o `expect`; o fixture
automático de erros é `{ auto: true }`. A página da doc ilustra com Page Object instanciado por
`new` dentro do fixture; a casa não usa Page Object (`frontend.md` §11.2).

```ts
// e2e/support/test.ts
import { expect, test as base } from '@playwright/test'

type Fixtures = { errors: string[] }

export const test = base.extend<Fixtures>({
  errors: [async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await use(errors)
    expect(errors).toEqual([])
  }, { auto: true, box: true }],
})

export { expect }
```

#### docs/test-global-setup-teardown
[doc](https://playwright.dev/docs/test-global-setup-teardown)
**O que é:** duas formas de preparar antes de tudo: projeto de setup com `dependencies`
(recomendada: aparece no relatório, grava trace, usa fixtures e a config) ou `globalSetup`
(função solta, sem trace, ignora `use`).
**Para que serve:** login uma vez, semente de dado global.
**Quando usar:** sempre o projeto `setup` (`*.setup.ts`), como em `frontend.md` §11.2.
`globalSetup` não entra: perde trace e não tem casa pela regra de função solta.

#### docs/test-parallel
[doc](https://playwright.dev/docs/test-parallel)
**O que é:** workers como processos isolados, `fullyParallel`, `describe.configure({ mode })`,
serial, `lock` (1.64), dado único por teste com `testInfo.testId`, `outputPath`, `--max-failures`,
`workerIndex`/`parallelIndex`.
**Para que serve:** a regra de isolamento: cada teste cria o próprio dado e nunca conta com outro
ter rodado antes.
**Quando usar:** prefixo + `testInfo.testId` no nome do registro criado (confere com o
isolamento de `frontend.md` §11.2). Modo `serial` não entra: cria dependência de ordem.

#### docs/test-parameterize
[doc](https://playwright.dev/docs/test-parameterize)
**O que é:** teste gerado por `forEach` sobre uma lista, projeto parametrizado por opção de
fixture, variável de ambiente e `.env` com `dotenv`, teste a partir de CSV.
**Para que serve:** mesmo fluxo com entradas diferentes sem copiar o spec.
**Quando usar:** os quatro tempos do formulário crítico. O `.env` com `dotenv` da página não entra:
credencial do E2E vem do ambiente do job, sem default (`tooling.md` §7).

#### docs/test-projects
[doc](https://playwright.dev/docs/test-projects)
**O que é:** `projects` para navegador, dispositivo, ambiente ou fatia de testes; `dependencies`,
`teardown`, filtro por `--project`; `testProject.default: false` (1.64) deixa o projeto na config
sem rodar por padrão.
**Para que serve:** separar `setup`, navegador e variações (ex.: logado e deslogado).
**Quando usar:** projeto `setup` + `chromium`; Firefox/WebKit, se o projeto quiser, com
`default: false` e rodados à parte.

#### docs/test-reporters
[doc](https://playwright.dev/docs/test-reporters)
**O que é:** reporters `list`, `line`, `dot` (padrão no CI), `html` (abre sozinho na falha; `open`
`always|never|on-failure`; pasta `playwright-report`), `blob` (para juntar shards), `json`,
`junit`, `github` (anotação no PR) e reporter próprio.
**Para que serve:** o que o CI mostra e guarda.
**Quando usar:** `html` com `open: 'never'` na config e `github` somado no CI. A doc desaconselha o
`github` com matriz (shard): a anotação se multiplica.

#### docs/test-retries
[doc](https://playwright.dev/docs/test-retries)
**O que é:** sem retry por padrão; com retry o resultado vira passed, flaky ou failed;
`testInfo.retry`; retry por grupo; modo serial; reuso de página entre testes.
**Para que serve:** decidir política de instabilidade.
**Quando usar:** a casa fica no padrão da biblioteca (`retries: 0`): teste instável é bug com
tarefa. O modelo do `init` liga 2 retries no CI; isso é escolha do modelo, não regra da doc.

#### docs/test-sharding
[doc](https://playwright.dev/docs/test-sharding)
**O que é:** `--shard=x/y`, balanceamento, reporter `blob` e `merge-reports` para juntar o
relatório, exemplo de matriz no GitHub Actions.
**Para que serve:** dividir a suíte entre jobs.
**Quando usar:** só quando o job de E2E passar do tempo aceitável; aí `blob` no shard e
`merge-reports` num job final.

#### docs/test-timeouts
[doc](https://playwright.dev/docs/test-timeouts)
**O que é:** timeout de teste (30 s, inclui fixture e `beforeEach`), de `expect` (5 s), global
(sem padrão), de ação e navegação (0, sem limite), de fixture; como mudar por teste e por hook.
**Para que serve:** saber qual relógio estourou.
**Quando usar:** `globalTimeout` na config (a doc de CI pede "always"). Subir timeout de teste
para "resolver" lentidão é sintoma: a causa é a tela ou o dado.

#### docs/test-typescript
[doc](https://playwright.dev/docs/test-typescript)
**O que é:** TypeScript sem configuração; o runner **não checa tipo** e só lê do tsconfig `allowJs`,
`baseUrl`, `paths`, `jsx*`, `references`, `extends`; `--tsconfig` ou `tsconfig` na config.
**Para que serve:** saber que flag estrita e alias fora de `paths` não valem para o runner.
**Quando usar:** `tsc --noEmit` do frontend precisa cobrir `e2e/` (`tooling.md` §3). Alias `#/*`
precisa estar em `paths` para o runner resolver.

#### docs/test-ui-mode
[doc](https://playwright.dev/docs/test-ui-mode)
**O que é:** `playwright test --ui`: linha do tempo, escolher localizador, console, rede, modo watch;
`--ui-host=0.0.0.0` para container.
**Para que serve:** escrever e depurar spec localmente.
**Quando usar:** desenvolvimento local. O UI mode não roda o projeto `setup` por padrão: a sessão
gravada em `playwright/.auth` precisa existir (rodar o setup antes).

#### docs/test-webserver
[doc](https://playwright.dev/docs/test-webserver)
**O que é:** `webServer` sobe o app antes dos testes: `command`, `url` (pronto em 2xx, 3xx, 400 a
403), `reuseExistingServer` ("commonly set to `!process.env.CI`"), `timeout` (60 s), `env`,
`gracefulShutdown`, `wait` por regex na saída; aceita vários servidores.
**Para que serve:** não depender de alguém ter subido o app antes.
**Quando usar:** confere a régua (`reuseExistingServer: !process.env.CI`). No CI o comando sobe o
build (`node .output/server/index.mjs`), não o `dev`; o backend fica no container do job.

## Guides

#### docs/library
[doc](https://playwright.dev/docs/library)
**O que é:** a diferença entre a biblioteca `playwright` (você abre e fecha navegador, sem
asserção web-first) e o runner `@playwright/test`.
**Para que serve:** saber que para E2E a doc manda usar o runner.
**Quando usar:** só `@playwright/test` no frontend. A biblioteca pura serve a script (gerar
imagem, raspagem), fora do escopo de teste.

#### docs/accessibility-testing
[doc](https://playwright.dev/docs/accessibility-testing)
**O que é:** `@axe-core/playwright`: `new AxeBuilder({ page }).analyze()`, `include`, `exclude`,
`withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])`, `disableRules`, snapshot de violação
conhecida, anexo do resultado e fixture `makeAxeBuilder`.
**Para que serve:** pegar o que é detectável automaticamente (contraste, controle sem rótulo, id
duplicado). A doc avisa que muito problema só aparece em avaliação manual.
**Quando usar:** fluxo crítico (`frontend.md` §11.2), por fixture. A doc compara
`violations` com `[]` (qualquer impacto); a casa filtra `serious` e `critical`, escolha dela.

```ts
const results = await makeAxeBuilder().analyze()
const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
expect(blocking).toEqual([])
```

#### docs/input
[doc](https://playwright.dev/docs/input)
**O que é:** `fill`, `check`, `selectOption`, `click` (com `force` e clique programático),
`pressSequentially`, `press`, `setInputFiles`, `focus`, `dragTo`, scroll.
**Para que serve:** a ação certa para cada controle.
**Quando usar:** `fill` sempre; `pressSequentially` só onde o campo trata tecla a tecla (máscara de
`use-mask-input`). `force: true` desliga a checagem de acionabilidade e esconde bug de
sobreposição: não entra sem comentário de motivo.

#### docs/test-assertions
[doc](https://playwright.dev/docs/test-assertions)
**O que é:** asserções que tentam de novo (`toBeVisible`, `toHaveText`, `toHaveURL`,
`toHaveAccessibleName`, `toHaveCount`, `toMatchAriaSnapshot`…), as que não tentam (`toBe`,
`toEqual`), `expect.soft`, `expect.poll`, `expect.toPass`, `expect.extend`.
**Para que serve:** a base do "sem espera fixa".
**Quando usar:** sempre a que tenta de novo sobre localizador; `expect.poll` para estado que só a
API mostra (registro gravado), nunca `waitForTimeout`.

#### docs/api-testing
[doc](https://playwright.dev/docs/api-testing)
**O que é:** fixture `request` (`APIRequestContext`) e `playwright.request.newContext`, para
testar API ou preparar e conferir estado de dentro do teste de UI; `request.storageState`.
**Para que serve:** criar o dado pela API quando a tela não é o alvo.
**Quando usar:** preparação e limpeza do E2E (`frontend.md` §11.2). Teste de API do backend não é
aqui: é do runner do backend. O exemplo da doc guarda o contexto em `let` de módulo; na casa o
contexto vem por fixture.

#### docs/auth
[doc](https://playwright.dev/docs/auth)
**O que é:** sessão gravada em `playwright/.auth/*.json` por um projeto `setup` e reaproveitada
por `storageState`; conta por worker quando o teste muda estado do servidor; login por API;
vários papéis; `sessionStorage` não é salvo.
**Para que serve:** não logar em todo teste.
**Quando usar:** confere `frontend.md` §11.2. `playwright/.auth` vai no `.gitignore` (a doc diz que
o arquivo carrega cookie que se passa pelo usuário). Login por API do backend (cookie de sessão)
é mais rápido que pela tela.

#### docs/actionability
[doc](https://playwright.dev/docs/actionability)
**O que é:** antes de cada ação o Playwright espera o elemento ser único, visível, estável (sem
animação), receber evento (não coberto) e habilitado/editável.
**Para que serve:** explicar o timeout de uma ação: qual checagem não passou.
**Quando usar:** ao ler erro de ação no trace. Animação longa de Motion atrasa o "estável"; o caso
`reducedMotion: 'reduce'` também acelera isso.

#### docs/best-practices
[doc](https://playwright.dev/docs/best-practices)
**O que é:** testar o que o usuário vê, isolar cada teste, não testar terceiro (simular com
`route.fulfill`), preferir atributo visível a CSS/XPath, asserção web-first, trace no CI em vez de
vídeo, instalar só o navegador usado, `no-floating-promises` e `tsc --noEmit`.
**Para que serve:** o resumo que sustenta `frontend.md` §11.2.
**Quando usar:** confere localizador por papel, sem espera manual, lint e Chromium só no CI. Diverge
em dois pontos (ver relatório da régua): a doc recomenda testar em todos os navegadores e simular
API de terceiro com `route.fulfill`.

#### docs/browsers
[doc](https://playwright.dev/docs/browsers)
**O que é:** `playwright install [navegador]`, `install-deps`, canais (Chrome, Edge), proxy e
espelho de download, onde ficam os binários e a limpeza deles.
**Para que serve:** cada versão do Playwright exige a sua versão de navegador.
**Quando usar:** CI com `install --with-deps chromium`; depois de todo bump do pacote.

#### docs/chrome-extensions
[doc](https://playwright.dev/docs/chrome-extensions)
Fora da stack: teste de extensão de navegador (contexto persistente no Chromium). A casa não
publica extensão.

#### docs/clock
[doc](https://playwright.dev/docs/clock)
**O que é:** `page.clock`: `setFixedTime` (recomendado, só congela `Date`), `install` +
`pauseAt`/`fastForward`/`runFor`/`resume`, `setSystemTime`; instalar antes do `goto`.
**Para que serve:** testar expiração de sessão, contagem regressiva, texto relativo ("há 2 min").
**Quando usar:** confere "`page.clock` para tempo" de `frontend.md` §11.2. Só controla o relógio do
navegador; o do servidor (SSR, backend) segue o real.

#### docs/test-components
[doc](https://playwright.dev/docs/test-components)
**O que é:** o novo modelo de teste de componente (1.62): story `*.story.tsx` ao lado do
componente, uma galeria servida pelo dev server em `playwright/gallery/` e o fixture `mount()`;
substitui os pacotes `@playwright/experimental-ct-*`.
**Para que serve:** componente em navegador real, com layout e regressão visual.
**Quando usar:** não na casa. Componente é Vitest + Testing Library (`frontend.md` §11.1); a
galeria e as stories criariam pastas fora de `architecture.md`. Adotar exige decisão.

#### docs/debug
[doc](https://playwright.dev/docs/debug)
**O que é:** depurador do VS Code, Playwright Inspector (`--debug`, `PWDEBUG=1`), trace, DevTools
do navegador, log verboso (`DEBUG=pw:api`), modo headed com `slowMo`.
**Para que serve:** passo a passo de um teste que falha.
**Quando usar:** local, junto com `superpowers:systematic-debugging`. `slowMo` não vai para a config.

#### docs/dialogs
[doc](https://playwright.dev/docs/dialogs)
**O que é:** `alert`/`confirm`/`prompt`/`beforeunload` são dispensados sozinhos; `page.on('dialog')`
para aceitar, e o handler **precisa** resolver o diálogo ou a ação trava.
**Para que serve:** diálogo nativo do navegador.
**Quando usar:** raro: confirmação na casa é `AlertDialog` do Base UI, que é DOM e se testa por
`getByRole('alertdialog')`. Sobra o `beforeunload` de formulário sujo.

#### docs/downloads
[doc](https://playwright.dev/docs/downloads)
**O que é:** `page.waitForEvent('download')` criado antes do clique, `download.saveAs`,
`suggestedFilename`; o arquivo some quando o contexto fecha.
**Para que serve:** testar exportação (CSV, PDF).
**Quando usar:** fluxo de exportação; salvar em `testInfo.outputPath()` para não colidir em paralelo.

#### docs/evaluating
[doc](https://playwright.dev/docs/evaluating)
**O que é:** `page.evaluate` roda função no navegador com argumento serializado; `addInitScript`
roda antes do script da página.
**Para que serve:** ler ou preparar estado que não tem tela.
**Quando usar:** pouco. Ler estado interno pelo `evaluate` foge de "testar o que o usuário vê";
`addInitScript` serve a mock de API de navegador (`mock-browser-apis`).

#### docs/events
[doc](https://playwright.dev/docs/events)
**O que é:** `waitForRequest`, `waitForEvent('popup')`, `page.on`/`off`/`once`; a promessa de espera
é criada **antes** da ação, sem `await`.
**Para que serve:** esperar fato de rede ou janela nova sem relógio.
**Quando usar:** `waitForResponse` para fato de rede (`frontend.md` §11.2): crie a promessa, faça a
ação, depois `await`.

#### docs/extensibility
[doc](https://playwright.dev/docs/extensibility)
**O que é:** motor de seletor próprio com `selectors.register()`.
**Para que serve:** seletor que não é papel, texto nem test id.
**Quando usar:** não na casa: a ordem de localizador de `frontend.md` §11.2 não deixa espaço para
seletor próprio.

#### docs/frames
[doc](https://playwright.dev/docs/frames)
**O que é:** `page.frameLocator(...)` e `page.frame()` para conteúdo em `iframe`.
**Para que serve:** checkout embutido, player, mapa.
**Quando usar:** só quando a tela tem iframe; dentro dele vale a mesma ordem de localizador.

#### docs/handles
[doc](https://playwright.dev/docs/handles)
**O que é:** `JSHandle` e `ElementHandle`, ciclo de vida e a diferença para `Locator`.
**Para que serve:** entender código antigo.
**Quando usar:** nunca em spec novo: `ElementHandle` aponta para um nó fixo e não acompanha
re-render; `Locator` resolve de novo a cada ação.

#### docs/browser-contexts
[doc](https://playwright.dev/docs/browser-contexts)
**O que é:** cada teste ganha um `BrowserContext` novo (cookies, storage, cache isolados);
vários contextos num teste para vários usuários.
**Para que serve:** a base do isolamento e do teste com dois atores (dono e convidado).
**Quando usar:** `browser.newContext({ storageState })` para o segundo ator. Como o contexto morre
no fim do teste, a rota criada por `page.route` some com ele.

#### docs/locators
[doc](https://playwright.dev/docs/locators)
**O que é:** os localizadores recomendados (`getByRole`, `getByText`, `getByLabel`,
`getByPlaceholder`, `getByAltText`, `getByTitle`, `getByTestId` com `data-testid` padrão),
filtro (`filter({ hasText, has })`), operadores (`and`, `or`, `within` na 1.64), listas e
strictness (ação em localizador que casa com mais de um elemento falha).
**Para que serve:** a regra de seletor.
**Quando usar:** confere `frontend.md` §11.2: a doc prioriza atributo visível e `getByRole`,
desaconselha CSS e XPath, e `data-testid` é o padrão sem configuração. A doc chama test id de "o
mais resiliente" e aceita a "metodologia de test id"; a casa só o usa sem papel e nome estáveis.

#### docs/mock
[doc](https://playwright.dev/docs/mock)
**O que é:** `page.route` com `route.fulfill({ json })`, `route.fetch()` para modificar a resposta
real, HAR (`routeFromHAR`) e mock de WebSocket.
**Para que serve:** forçar resposta que o servidor não dá sob demanda.
**Quando usar:** só para 5xx, latência e offline (`frontend.md` §11.2). Sucesso simulado não; HAR
não, porque congela o contrato do backend.

#### docs/mock-browser-apis
[doc](https://playwright.dev/docs/mock-browser-apis)
**O que é:** mock de API do navegador sem automação nativa (ex.: bateria) com `addInitScript`
antes do carregamento, e verificação das chamadas.
**Para que serve:** API de navegador experimental.
**Quando usar:** só se o app usar uma dessas APIs; clipboard e geolocalização têm opção própria
(`permissions`, `geolocation`).

#### docs/navigations
[doc](https://playwright.dev/docs/navigations)
**O que é:** `goto` espera o `load`; depois disso a ação já espera o elemento; seção de
hidratação; `waitForURL` quando um clique causa várias navegações; BFCache.
**Para que serve:** entender SSR + Playwright.
**Quando usar:** em todo app TanStack Start: clique que "não faz nada" logo após o `goto` é
hidratação. A doc manda corrigir no app (controle desabilitado até hidratar); no teste, asserção
sobre o resultado, nunca espera fixa nem `networkidle`.

#### docs/network
[doc](https://playwright.dev/docs/network)
**O que é:** eventos `request`/`response`, `waitForResponse` com glob, regex ou predicado,
`route` para modificar, abortar ou responder, padrão glob, WebSocket, e o aviso de que Service
Worker (MSW) esconde a requisição do `route` (`serviceWorkers: 'block'`).
**Para que serve:** observar e provocar rede do navegador.
**Quando usar:** `waitForResponse` para confirmar que um duplo clique gerou uma requisição só.
`route` só alcança o que o navegador pede; fetch do SSR no servidor não passa por ele.

#### docs/other-locators
[doc](https://playwright.dev/docs/other-locators)
**O que é:** CSS (com `:visible`, `:has-text()`), `nth=`, pai por `..`, XPath, seletor legado de
texto, `id`/`data-testid`/`data-test-id`/`data-test`, encadeamento com `>>`.
**Para que serve:** o que existe além dos recomendados.
**Quando usar:** não em spec novo (`frontend.md` §11.2 proíbe CSS de classe/id e XPath).
`data-test-id` existe como seletor, mas a casa usa só `data-testid`.

#### docs/pages
[doc](https://playwright.dev/docs/pages)
**O que é:** página como aba, várias páginas no contexto, `context.waitForEvent('page')` e popup.
**Para que serve:** link que abre nova aba.
**Quando usar:** link com `target="_blank"`: espera o evento antes do clique.

#### docs/pom
[doc](https://playwright.dev/docs/pom)
**O que é:** Page Object Model: classe por tela com os localizadores e ações, instanciada com
`new` no teste.
**Para que serve:** organizar suíte grande.
**Quando usar:** não na casa. `frontend.md` §11.2 troca Page Object por fixture e helper em
`e2e/support/<tema>.ts`. A doc apresenta POM como "uma das abordagens", não como regra.

#### docs/screenshots
[doc](https://playwright.dev/docs/screenshots)
**O que é:** `page.screenshot` (arquivo, página inteira, buffer) e de elemento.
**Para que serve:** captura avulsa.
**Quando usar:** o da falha vem do `screenshot: 'only-on-failure'` da config; captura manual só
para anexar evidência com `testInfo.attach`.

#### docs/service-workers
[doc](https://playwright.dev/docs/service-workers)
**O que é:** Service Worker só no Chromium; desligar com `serviceWorkers: 'block'`, esperar
ativação, rotear requisição feita pelo próprio worker.
**Para que serve:** PWA e cache offline.
**Quando usar:** só em app com Service Worker; senão, nada.

#### docs/aria-snapshots
[doc](https://playwright.dev/docs/aria-snapshots)
**O que é:** `toMatchAriaSnapshot` compara a árvore de acessibilidade com um modelo YAML (papel,
nome, nível, regex no texto); gerado pelo codegen ou por `--update-snapshots`.
**Para que serve:** travar a estrutura acessível de uma região (menu, cabeçalho de tabela).
**Quando usar:** região estável com muitos papéis; o nome no YAML é literal, o que choca com
`m.*()`. Para texto traduzido, asserção pontual com `getByRole` e `m.*()`.

#### docs/codegen
[doc](https://playwright.dev/docs/codegen)
**O que é:** gravação no VS Code ou no Inspector, emulação na gravação (`--device`, `--viewport-size`,
`--color-scheme`, `--lang`, `--timezone`), `--save-storage`/`--load-storage`, `page.pause()` para
gravar a partir de um setup próprio.
**Para que serve:** gravar logado e no idioma certo.
**Quando usar:** `--load-storage=playwright/.auth/owner.json --lang=pt-BR` para achar localizador de
tela privada.

#### docs/touch-events
[doc](https://playwright.dev/docs/touch-events)
**O que é:** gesto de toque legado (pan, pinch) por `locator.dispatchEvent` com `TouchEvent`;
`isTrusted` fica falso.
**Para que serve:** componente que trata toque à mão (mapa, carrossel).
**Quando usar:** raro; toque simples é `tap()` com `hasTouch`.

#### docs/trace-viewer
[doc](https://playwright.dev/docs/trace-viewer)
**O que é:** `show-trace`, `trace.playwright.dev` (abre no navegador, sem enviar o arquivo),
ações, DOM, console, rede, fonte, anexos; gravar com a opção `trace` ou `--trace`.
**Para que serve:** a ferramenta principal de falha no CI.
**Quando usar:** baixar o artifact do job e abrir o `trace.zip` da falha. O trace guarda o que a
tela mostrou, inclusive dado de teste: não publicar fora do CI.

#### docs/videos
[doc](https://playwright.dev/docs/videos)
**O que é:** opção `video` com os mesmos modos do trace; gravado ao fechar o contexto, em
`test-results`.
**Para que serve:** ver a falha em movimento.
**Quando usar:** desligado na casa; o trace cobre (a doc também prefere trace a vídeo no CI,
`best-practices`).

#### docs/test-snapshots
[doc](https://playwright.dev/docs/test-snapshots)
**O que é:** `toHaveScreenshot` gera a referência na primeira execução e compara nas seguintes;
`--update-snapshots`, `maxDiffPixels`, `threshold`, `stylePath`, snapshot de texto. A doc avisa que
a renderização muda com SO, versão e hardware.
**Para que serve:** regressão visual.
**Quando usar:** só se o projeto decidir ter regressão visual; aí a referência é gerada no mesmo
ambiente do CI (imagem Docker oficial), nunca na máquina de alguém.

#### docs/webview2
[doc](https://playwright.dev/docs/webview2)
Fora da stack: automação de WebView2 (controle do Windows via CDP). A casa não tem app desktop.

## Migration

#### docs/protractor
[doc](https://playwright.dev/docs/protractor)
Fora da stack: migração de Protractor (Angular). A casa não tem suíte Protractor.

#### docs/puppeteer
[doc](https://playwright.dev/docs/puppeteer)
Fora da stack: migração de Puppeteer. A casa não tem suíte Puppeteer; o único ponto útil é o
aviso de que `ElementHandle` dá lugar a `Locator` e asserção web-first.

#### docs/testing-library
[doc](https://playwright.dev/docs/testing-library)
Fora da stack: troca do Testing Library pelo teste de componente do Playwright (story + `mount`).
A casa mantém o Testing Library no Vitest (`frontend.md` §11.1); a tabela de equivalência de
consultas (`getByRole` igual nos dois) ajuda quem vem de um para o outro.

## Integrations

#### docs/docker
[doc](https://playwright.dev/docs/docker)
**O que é:** imagem `mcr.microsoft.com/playwright:v1.64.0-noble` com navegadores e dependências
(sem o pacote npm); `--ipc=host` recomendado; root aceitável para E2E de código confiável.
**Para que serve:** ambiente de CI e de regressão visual igual para todos.
**Quando usar:** se o job de E2E rodar em container; a tag da imagem acompanha a versão do
`@playwright/test` do lockfile.

#### docs/ci
[doc](https://playwright.dev/docs/ci)
**O que é:** os três passos de CI, `workers: 1` recomendado no CI, `globalTimeout` "sempre",
exemplos por provedor (GitHub Actions, Docker, Azure, CircleCI, Jenkins, GitLab…), cache de
navegador **não** recomendado, depuração de lançamento.
**Para que serve:** o job de E2E.
**Quando usar:** `tooling.md` §7: `--workers=1` no passo (ou sharding), `globalTimeout` na config,
sem cache de navegador.

#### docs/selenium-grid
[doc](https://playwright.dev/docs/selenium-grid)
Fora da stack: conexão experimental a Selenium Grid 4 (Chrome e Edge via CDP). A casa roda o
navegador no próprio job.

#### docs/languages
[doc](https://playwright.dev/docs/languages)
Fora da stack: Playwright para Python, Java e .NET. A casa usa só o de Node.js com o runner próprio.
