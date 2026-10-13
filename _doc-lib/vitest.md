# Vitest

> Conferido contra `vitest@5.0.3` (última publicada no npm). **Um projeto ainda na v4 e outro já na
> v5 divergem no padrão de `clearMocks`** (`false` na v4, `true` na v5 — ver `config/clearmocks`
> abaixo): o mesmo teste copiado de um projeto para o outro pode passar num e vazar estado no
> outro. v5 também exige Vite >= 6.4 e Node >= 22.12.

Framework de teste movido a Vite, que reaproveita a configuração da aplicação em vez de manter uma
segunda.

**O que é:** um test runner construído sobre o Vite. Ele lê o `vite.config.*` do projeto e usa o
servidor de desenvolvimento do Vite para transformar os arquivos durante o teste, então plugins,
aliases, JSX, TypeScript e PostCSS já funcionam sem configuração extra. A API de asserção é
compatível com a do Jest (`expect`, `describe`, `test`, snapshots, mocks), o que o torna, nas
palavras da própria doc, "a compatible API that allows you to use it as a drop-in replacement in most
projects". A versão corrente é a **5.0.1**, e ela exige **Vite ≥ 6.4.0 e Node ≥ 22.12.0**.

**Para que serve:** eliminar o pipeline duplicado. Antes do Vitest, um projeto Vite carregava uma
configuração para rodar e outra, paralela e sempre um pouco desatualizada, para testar. O Vitest
resolve isso no nível da ferramenta: uma configuração, um grafo de módulos, e o modo watch que
"smartly searches the module graph and only reruns the related tests", como o HMR faz no navegador.

**Como usar:**

```bash
npm install -D vitest        # pnpm add -D vitest / yarn add -D vitest vite
```

```ts
// src/sum.ts
export function sum(a: number, b: number) {
  return a + b
}

// src/sum.test.ts
import { expect, test } from 'vitest'
import { sum } from './sum.js'

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})
```

```json
{ "scripts": { "test": "vitest", "test:ci": "vitest run --coverage" } }
```

**Quando usar a biblioteca:** em **todo** projeto da stack React × Node que já tenha Vite em algum
lugar — e, numa stack assim, o frontend sempre tem. A pergunta "Vitest ou Jest?" só é honesta quando
não há Vite no repositório; havendo, manter o Jest significa manter uma segunda cadeia de transforms
(babel-jest ou ts-jest, `moduleNameMapper` duplicando os aliases do Vite, `transformIgnorePatterns`
para os pacotes ESM) que precisa ser atualizada toda vez que a do Vite muda. O backend Node puro
também cabe: `environment: 'node'` é o padrão e nada obriga a ter navegador na jogada.

O ponto em que o Vitest **não** é a escolha óbvia é o projeto Node sem Vite nenhum e sem TypeScript,
onde `node --test` já resolve sem instalar nada.

**O que mudou da v3 para a v5** — quem lê isto pode estar em qualquer uma das duas, e algumas dessas
mudanças quebram em silêncio:

| Mudança | v3 | v5 |
|---|---|---|
| `clearMocks` | `false` | **`true`** — histórico de chamada é limpo antes de cada teste |
| Configuração de monorepo | `vitest.workspace.ts` | `test.projects` no config raiz (renomeado na 3.2; o arquivo saiu na v4) |
| `test.sequential` | existe | removido; use `{ concurrent: false }` |
| `-t` / `testNamePattern` | nomes separados por espaço | nomes unidos por `' > '` |
| `bench` | import de topo (`import { bench } from 'vitest'`) | fixture do test context (`test('x', async ({ bench }) => …)`) |
| Asserção assíncrona sem `await` | passava despercebida | **falha o teste** (`.resolves`, `.rejects`, `toMatchFileSnapshot`) |
| `expect.poll()` no timeout | resolvia tarde em silêncio | rejeita |
| Provider do browser mode | string (`provider: 'playwright'`) | objeto de `@vitest/browser-playwright` (mudou na v4) |
| `deps.inline` / `deps.external` | topo de `test` | `test.server.deps.*` (mudou na v4) |
| `coverage.all` | existia | removido na v4; declare `coverage.include` |
| Artefatos gerados | espalhados | centralizados em `.vitest/` |
| `VITEST_WORKER_ID` | começa em `0` | começa em `1` |
| Tipos de matcher customizado | `Assertion<T>` | `Assertion<R, T>` / `Matchers<R, T>` |

Requisito novo da v5 que costuma travar o `install` antes de qualquer teste rodar: quem usa **Yarn**
precisa declarar `vite` explicitamente como dependência, e o Node tem de ser ≥ 22.12.

**O detalhe que economiza horas:** o padrão de `pool` é **`forks`**, não threads. Isso é escolha de
compatibilidade — `threads` usa `worker_threads`, onde `process.chdir()` não existe, módulos nativos
(Prisma, bcrypt, canvas) podem estourar segfault, `process.env.TZ` não afeta o `Date`, e o `fetch` do
Node provoca o erro "Failed to terminate worker". Quase todo relato de "o Vitest quebrou com meu
driver de banco" é alguém que trocou para `threads` atrás de velocidade. O caminho certo para ganhar
velocidade é `isolate: false`, não trocar de pool — e, na v5, `vitest doctor` mede as alternativas em
vez de chutar.

**Links:** 50.

**Skills:** `tdd`, `test-driven-development`; e2e: `playwright-skill`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

---

## Fundamentos

#### guide
[doc](https://vitest.dev/guide/)

**O que é:** a página de partida: instalação, o primeiro teste, como rodar, e os requisitos de versão
(Vite ≥ 6.4.0, Node ≥ 22.12.0).
**Para que serve:** sair do zero até um `npm run test` verde.
**Quando usar:** no primeiro dia. **`vitest` entra em modo watch fora de CI e em modo run dentro**;
não invente flag para isso, a detecção já existe.

```ts
// vitest.config.ts — só é preciso quando o vite.config não serve como está
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

```bash
vitest          # watch em dev, run em CI
vitest run      # execução única, sempre
```

```json
// errado: nada força execução única — alguns CIs ficam pendurados em watch
{ "scripts": { "test": "vitest" } }

// certo: o script de CI chama "run" explicitamente
{ "scripts": { "test": "vitest", "test:ci": "vitest run" } }
```

#### why
[doc](https://vitest.dev/guide/why)

**O que é:** a justificativa do projeto: o Jest foi "created in a different context" e obriga a manter
um segundo pipeline de transformação ao lado do Vite.
**Para que serve:** ter o argumento pronto quando alguém propuser manter o Jest "porque já está lá".
**Quando usar:** ao decidir a ferramenta de teste de um projeto novo, ou ao defender uma migração.

```ts
// O argumento inteiro cabe aqui: este arquivo serve dev, build E teste.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],            // o mesmo plugin que o app usa
  resolve: { alias: { '@': '/src' } }, // o mesmo alias, sem moduleNameMapper
  test: { environment: 'jsdom' },
})
```

#### features
[doc](https://vitest.dev/guide/features)

**O que é:** o inventário do que vem na caixa: watch inteligente, execução paralela, filtros,
`concurrent`, snapshot, Chai + `expect` do Jest, mocks via `vi`, cobertura v8 ou istanbul, in-source
testing, benchmark, teste de tipo, sharding e carregamento de `.env`.
**Para que serve:** descobrir que um recurso existe antes de instalar um pacote para ele.
**Quando usar:** antes de trazer dependência nova para a suíte. Boa parte do que se instala ao lado do
Jest (`jest-extended`, runners de benchmark, tipos) já está aqui.

```ts
import { expect, test } from 'vitest'

// concurrent: só ajuda quando o teste ESPERA (rede, timer, I/O).
// Teste síncrono não fica mais rápido — ele bloqueia a thread do mesmo jeito.
test.concurrent('fetches user profile', async () => {
  const user = await fetchUser(1)
  expect(user.name).toBe('Alice')
})
```

#### cli
[doc](https://vitest.dev/guide/cli)

**O que é:** os comandos (`run`, `watch`, `related`, `bench`, `list`, `doctor`, `init`) e as flags.
**Para que serve:** compor os scripts do `package.json` e os passos de CI.
**Quando usar:** ao montar o pipeline. **`vitest related` é o que faz o pre-commit valer a pena**: roda
só os testes que cobrem os arquivos alterados, e combina direto com `lint-staged`.

```bash
vitest run --coverage                   # CI
vitest related src/services/user.ts     # só o que cobre esse arquivo
vitest src/user.test.ts:42              # um teste pela linha (desde a v3)
vitest list --json                      # inventário dos testes, sem executar
vitest doctor                           # mede configurações alternativas
```

```jsonc
// package.json — flags aceitam camelCase e kebab-case, e booleanas negam com "no-"
{
  "lint-staged": { "*.{ts,tsx}": ["vitest related --run"] }
}
```

```bash
# errado: roda a suíte inteira no pre-commit — PR trava minutos num diff de 1 arquivo
vitest run

# certo: só os arquivos que o diff cobre, que é o que o lint-staged já filtra
vitest related --run
```

#### filtering
[doc](https://vitest.dev/guide/filtering)

**O que é:** as formas de rodar menos: por nome de arquivo, por `-t`, por linha, por `.only`/`.skip`/
`.todo`, por `skipIf`/`runIf` e por `tags`.
**Para que serve:** encurtar o ciclo enquanto se escreve um teste.
**Quando usar:** o tempo todo em dev. **Atenção:** o filtro é aplicado *por arquivo* — "Vitest still
has to run each file to discover which tests match" —, então `-t` sozinho ainda carrega tudo.
Combine com o caminho do arquivo.

```bash
vitest run src/user.test.ts -t "creates a team"   # rápido: arquivo + nome
vitest run -t "creates a team"                    # lento: percorre todos os arquivos
```

```ts
import { describe, test } from 'vitest'

// O nome que o -t enxerga é "Team > creates a team" — na v5 os segmentos são
// unidos por ' > ', e não mais por espaço. Padrão antigo de CI para de casar.
describe('Team', () => {
  test('creates a team', () => {})
  test.skipIf(process.platform === 'win32')('uses posix paths', () => {})
})
```

```ts
// errado: if solto esconde o teste pulado do relatório — some em vez de aparecer "skipped"
test('uses posix paths', () => {
  if (process.platform === 'win32') return
})

// certo: skipIf aparece no relatório como pulado, não como ausente
test.skipIf(process.platform === 'win32')('uses posix paths', () => {})
```

#### projects
[doc](https://vitest.dev/guide/projects)

**O que é:** vários projetos de teste num processo só, cada um com ambiente, plugins e aliases
próprios. Substitui o antigo `vitest.workspace.*`, "deprecated since version 3.2".
**Para que serve:** monorepo, e também o caso mais comum fora de monorepo: unidade em `node` e
componente em `jsdom` no mesmo repositório.
**Quando usar:** quando dois conjuntos de teste precisam de ambientes diferentes. **Cobertura,
reporters e `resolveSnapshotPath` só valem na raiz** — declarar dentro do projeto não tem efeito.

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: { provider: 'v8' }, // só aqui na raiz funciona
    projects: [
      { test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] } },
      { test: { name: 'dom', environment: 'jsdom', include: ['src/**/*.test.tsx'] } },
    ],
  },
})

// Na v5, projeto inline herda o config raiz por padrão (extends: true).
// Na v3 isso era opt-in, então um projeto que "perdeu" os plugins ganhou-os de volta.
```

```bash
vitest --project unit
vitest --project 'unit*' --project '!unit (browser)'
```

```ts
// errado: coverage dentro de um project — a doc é clara: só a raiz é lida
projects: [{ test: { name: 'unit', coverage: { provider: 'v8' } } }]

// certo: coverage e reporters na raiz; o project só declara environment/include
projects: [{ test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] } }]
```

#### common-errors
[doc](https://vitest.dev/guide/common-errors)

**O que é:** o catálogo dos erros que mais aparecem, com causa e correção — módulo não encontrado,
"Failed to terminate worker", segfault em módulo nativo, `process.env.TZ` ignorado, pacote que carrega
no app e falha no teste.
**Para que serve:** encurtar a caçada quando a mensagem é genérica.
**Quando usar:** **antes de abrir issue**. Metade da lista tem a mesma resposta: saia de
`pool: 'threads'` para `pool: 'forks'`.

```ts
// "Failed to terminate worker" com fetch, segfault em módulo nativo,
// TZ que não muda -> todos são o mesmo sintoma de worker_threads.
export default defineConfig({ test: { pool: 'forks' } })

// Pacote com ESM inválido que funciona no app e quebra no teste:
export default defineConfig({
  test: { server: { deps: { inline: ['pacote-quebrado'] } } },
})
```

```ts
// projeto usa bcrypt no login — "Failed to terminate worker" só aparecia em CI
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { pool: 'forks' }, // módulo nativo não sobrevive a worker_threads
})
```

```ts
// errado: trocar de pool "pra ganhar velocidade" — é a causa mais comum do erro
export default defineConfig({ test: { pool: 'threads' } })

// certo: o ganho de velocidade documentado é isolate: false, não o pool
export default defineConfig({ test: { pool: 'forks', isolate: false } })
```

#### migration
[doc](https://vitest.dev/guide/migration)

**O que é:** o guia de migração para a 5.0, com cada quebra listada.
**Para que serve:** subir de versão sem descobrir as mudanças uma a uma pelo teste vermelho.
**Quando usar:** **antes** de trocar a versão no `package.json`. Três quebras são silenciosas e
merecem leitura dirigida: `clearMocks` virou `true`, asserção assíncrona sem `await` agora falha, e
`testNamePattern` mudou de separador.

```ts
// v3: bench era import de topo
// import { bench } from 'vitest'
// bench('sort', () => { [3, 1, 2].sort() })

// v5: bench é fixture do test context
test('sort', async ({ bench }) => {
  await bench('sort', () => { [3, 1, 2].sort() }).run()
})

// v5: vi.mock, vi.unmock e vi.hoisted TÊM de estar no topo do módulo.
// Dentro de describe ou de função, agora lançam erro em vez de não funcionar.
```

```ts
// vitest.workspace.ts (v3) -> test.projects no config raiz (v5, arquivo saiu na v4)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { projects: ['frontend', 'backend'] },
})
```

```ts
// errado: esperar await sem efeito, como no Jest — na v5 isso falha o teste
expect(createPost({ title: '' })).rejects.toThrow('title is required')

// certo: toda asserção .resolves/.rejects precisa de await
await expect(createPost({ title: '' })).rejects.toThrow('title is required')
```

#### migration/jest
[doc](https://vitest.dev/guide/migration/jest)

**O que é:** o que muda ao sair do Jest: globais desligados por padrão, `__mocks__` que não carrega
sozinho, `mockReset` com semântica diferente, `done` inexistente.
**Para que serve:** migrar uma suíte existente sem reescrever teste por teste.
**Quando usar:** na migração. **A diferença que mais custa tempo é o `mockReset`**: no Vitest ele
restaura a implementação original, no Jest ele troca por uma função vazia.

```ts
import { vi } from 'vitest'

// Jest -> Vitest, o mapa curto:
// jest.fn()            -> vi.fn()
// jest.requireActual() -> vi.importActual()
// jest.setTimeout(ms)  -> vi.setConfig({ testTimeout: ms })
// jest.Mock (tipo)     -> import type { Mock } from 'vitest'

// __mocks__ NÃO é carregado automaticamente: só entra em cena com vi.mock().
vi.mock('./user-repository.js')

// Sem callback `done` e sem legacy timers: use async/await ou promessa.
```

```ts
// convertendo um jest.mock('./http') de uma suíte antiga de hook do TanStack Query
import { vi } from 'vitest'

vi.mock('@/integrations/tanstack-query/http', () => ({
  http: { get: vi.fn().mockResolvedValue({ id: '1' }) },
}))
```

```ts
// errado: espera mockReset devolver o comportamento original, como "troca por fn vazia" do Jest
const save = vi.fn().mockImplementation(() => ({ id: '1' }))
save.mockReset()
save() // undefined — e fica assim, sem implementação nenhuma

// certo: pra voltar à implementação original é preciso mockRestore, e só depois de spyOn
const spy = vi.spyOn(repository, 'save')
spy.mockRestore()
```

## API de teste

#### api/test
[doc](https://vitest.dev/api/test)

**O que é:** a referência de `test`/`it`, `describe`, os modificadores (`skip`, `only`, `todo`,
`fails`, `concurrent`, `skipIf`, `runIf`), `each`/`for`, `extend`, `override`, os hooks e as opções
por teste (`timeout`, `retry`, `repeats`, `tags`, `meta`).
**Para que serve:** o vocabulário do dia a dia.
**Quando usar:** sempre. As opções vão no **segundo** argumento — a forma com terceiro argumento saiu
na v4.

```ts
import { describe, expect, test } from 'vitest'

// Opções como segundo argumento (a forma válida hoje)
test('flaky integration', { retry: { count: 3, delay: 500 }, timeout: 20_000 }, async () => {
  expect(await ping()).toBe(true)
})

// test.each espalha o array em argumentos; test.for não espalha e entrega o contexto
test.each([
  [1, 1, 2],
  [2, 2, 4],
])('sum(%i, %i) -> %i', (a, b, expected) => {
  expect(a + b).toBe(expected)
})

test.for([[1, 1, 2]])('sum %j', ([a, b, expected], { expect }) => {
  expect(a + b).toBe(expected)
})

// test.fails: o teste passa QUANDO falha. Serve para provar que algo ainda quebra.
test.fails('rejects invalid email', async () => {
  await createUser({ email: 'nope' })
})
```

```ts
import { describe, expect, test } from 'vitest'
import { canEditTeam } from './permissions'

type Role = 'owner' | 'member' | 'viewer'

describe.each<Role>(['owner', 'member', 'viewer'])('canEditTeam(%s)', (role) => {
  test('matches the permission table', () => {
    expect(canEditTeam(role)).toBe(role === 'owner')
  })
})
```

```ts
// errado: terceiro argumento para as opções — saiu na v4, TypeScript nem compila
test('flaky integration', async () => { await ping() }, { retry: 3 })

// certo: as opções vão no segundo argumento
test('flaky integration', { retry: 3 }, async () => { await ping() })
```

#### test-context
[doc](https://vitest.dev/guide/test-context)

**O que é:** o objeto que todo callback de teste recebe: `task`, `expect`, `skip`, `annotate`,
`signal`, `bench`, `onTestFailed`, `onTestFinished` — e `test.extend()` para acrescentar fixtures.
**Para que serve:** substituir `beforeEach` com variável de módulo por fixture declarada e tipada.
**Quando usar:** **na segunda vez que um `let` de topo de arquivo aparecer só para o `beforeEach`
preencher**. As fixtures só são inicializadas quando o teste realmente as usa.

```ts
import { test as base } from 'vitest'

// Builder pattern: o TypeScript infere o tipo do retorno, sem anotação.
const test = base
  .extend('config', { port: 3000 })
  .extend('server', async ({ config }, { onCleanup }) => {
    const server = await startServer(config.port)
    onCleanup(() => server.close())
    return server
  })

test('responds', async ({ server, expect }) => {
  expect(await server.ping()).toBe('pong')
})

// Escopo: 'test' (padrão), 'file' e 'worker'. Uma fixture de escopo test
// enxerga as de file e worker; o contrário não vale.
// `expect` do contexto é o certo em teste concurrent — o global se confunde.
```

```ts
import { test as base } from 'vitest'
import { createTeamRepository } from './team-repository'

type Repo = ReturnType<typeof createTeamRepository>

const test = base.extend<{ repo: Repo }>({
  repo: async ({}, use) => {
    await use(createTeamRepository())
  },
})

test('creates a team', async ({ repo, expect }) => {
  const team = await repo.create({ name: 'Core' })
  expect(team.id).toBeDefined()
})
```

```ts
// errado: let de topo de arquivo só para o beforeEach preencher
let repo: Repo
beforeEach(() => { repo = createTeamRepository() })

// certo: fixture — só inicializa quando o teste de fato usa `repo`
const test = base.extend<{ repo: Repo }>({
  repo: async ({}, use) => { await use(createTeamRepository()) },
})
```

#### api/expect
[doc](https://vitest.dev/api/expect)

**O que é:** a API de asserção: `toBe`, `toEqual`, `toStrictEqual`, `toContain`, `toThrowError`,
`toHaveBeenCalledWith`, `resolves`/`rejects`, `soft`, `poll`, `assertions`, `extend`, e os matchers
assimétricos (`expect.any`, `objectContaining`, `arrayContaining`).
**Para que serve:** dizer o que se espera com a precisão certa.
**Quando usar:** em toda linha de teste. **Na v5, `.resolves`, `.rejects` e `toMatchFileSnapshot` sem
`await` falham o teste** — antes passavam despercebidos, então uma suíte v3 migrada pode revelar
asserções que nunca rodaram.

```ts
import { expect, test } from 'vitest'

test('creates a post', async () => {
  // toEqual ignora undefined; toStrictEqual compara tipo e array esparso
  expect({ id: 1, draft: undefined }).toEqual({ id: 1 })
  expect({ id: 1, draft: undefined }).not.toStrictEqual({ id: 1 })

  // matcher assimétrico: afirma a forma sem fixar o valor gerado
  expect(await createPost({ title: 'Hi' })).toEqual({
    id: expect.any(String),
    title: 'Hi',
    createdAt: expect.any(Date),
  })

  // SEMPRE com await: sem ele, na v5 o teste falha
  await expect(createPost({ title: '' })).rejects.toThrow('title is required')

  // soft: coleta todas as falhas em vez de parar na primeira
  expect.soft(1).toBe(1)

  // poll: repete a asserção até o timeout (50ms de intervalo, 1000ms de teto)
  await expect.poll(() => queue.size).toBe(0)
})
```

```ts
import { expect, test } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTeamPermission } from '@/hooks/use-team-permission'

test('resolves owner permission', async () => {
  const { result } = renderHook(() => useTeamPermission('team-1'))

  await waitFor(() => {
    expect(result.current).toEqual(expect.objectContaining({ canEdit: true }))
  })
})
```

```ts
// errado: soft não interrompe o teste — a linha seguinte roda mesmo falhando
expect.soft(result.current.canEdit).toBe(true)
doSomethingThatNeedsCanEditTrue()

// certo: expect normal interrompe aqui mesmo; soft é para acumular e checar no fim
expect(result.current.canEdit).toBe(true)
```

#### extending-matchers
[doc](https://vitest.dev/guide/extending-matchers)

**O que é:** `expect.extend()` para criar matchers próprios, e a declaração de tipo que os torna
visíveis ao TypeScript.
**Para que serve:** transformar uma asserção repetida de domínio numa frase só, com mensagem de erro
decente.
**Quando usar:** quando a mesma tripa de `expect` aparecer em três testes. **Na v5 a interface é
`Matchers<R, T>`, com dois parâmetros** — a declaração de tipo da v3 não compila mais.

```ts
// tests/setup.ts
import { expect } from 'vitest'

expect.extend({
  toBeActiveUser(received: { status: string }) {
    const { isNot } = this
    return {
      pass: received.status === 'active',
      message: () => `user is${isNot ? ' not' : ''} active`,
      actual: received.status,
      expected: 'active',
    }
  },
})

// vitest.d.ts — R é o retorno da asserção, T o tipo recebido
declare module 'vitest' {
  interface Matchers<R, T> {
    toBeActiveUser: () => R
  }
}
```

```ts
// tests/setup.ts
import { expect } from 'vitest'

expect.extend({
  toHaveRole(received: { role: string }, role: string) {
    return {
      pass: received.role === role,
      message: () => `expected role ${role}, got ${received.role}`,
    }
  },
})

declare module 'vitest' {
  interface Matchers<R, T> {
    toHaveRole: (role: string) => R
  }
}
```

```ts
// errado: matcher registrado sem a declaração de tipo — TS2339 no uso
expect(user).toHaveRole('owner') // Property 'toHaveRole' does not exist on type 'Assertion'

// certo: Matchers<R, T> com dois parâmetros é a forma da v5
declare module 'vitest' {
  interface Matchers<R, T> {
    toHaveRole: (role: string) => R
  }
}
```

#### snapshot
[doc](https://vitest.dev/guide/snapshot)

**O que é:** `toMatchSnapshot` (arquivo `.snap`), `toMatchInlineSnapshot` (no próprio teste) e
`toMatchFileSnapshot` (arquivo nomeado por você), mais serializers customizados.
**Para que serve:** travar saída grande sem escrever a expectativa à mão.
**Quando usar:** para estrutura que muda pouco e é chata de escrever. **Prefira o inline**: ele fica à
vista na revisão, e snapshot que ninguém lê é snapshot que todo mundo atualiza com `-u` sem olhar.

```ts
import { expect, test } from 'vitest'

test('renders team summary', () => {
  // inline: o Vitest escreve o valor dentro do próprio arquivo de teste
  expect(summarize({ name: 'Core', members: 3 })).toMatchInlineSnapshot(`
    {
      "label": "Core (3)",
    }
  `)
})

// toMatchFileSnapshot preserva o realce de sintaxe e evita escape — bom para HTML/SQL
test('renders email', async () => {
  await expect(renderEmail()).toMatchFileSnapshot('./__snapshots__/email.html')
})

// Atualização: tecla `u` no watch, ou `vitest run -u`.
// Em CI o Vitest recusa criar/atualizar snapshot: teste novo falha, e é o certo.
```

```ts
test('renders post card markup', async () => {
  await expect(renderPostCard({ title: 'Hello' })).toMatchFileSnapshot(
    './__snapshots__/post-card.html',
  )
})
```

```bash
# errado: -u em CI sem revisão — qualquer regressão visual sai "aprovada"
vitest run -u

# certo: CI roda sem -u; snapshot novo ou mudado falha e pede revisão humana
vitest run
```

#### testing-types
[doc](https://vitest.dev/guide/testing-types)

**O que é:** teste de tipo. O Vitest "calls `tsc` or `vue-tsc`, depending on your config, and parses
results"; os arquivos `*.test-d.ts` são analisados estaticamente, sem executar nada.
**Para que serve:** garantir que um utilitário genérico, um `Merge` ou o retorno de um client continuam
tipados como se pretendia.
**Quando usar:** em biblioteca interna, tipo utilitário e client gerado. **Nada é executado**, então
`test.each` dinâmico não é avaliado aqui.

```ts
// src/user.test-d.ts
import { assertType, expectTypeOf, test } from 'vitest'
import { pick } from './pick.js'

test('pick narrows the result', () => {
  expectTypeOf(pick({ id: 1, name: 'a', email: 'b' }, ['id'])).toEqualTypeOf<{ id: number }>()
  assertType<string>(pick({ id: 1 }, ['id']).id) // erro de tipo esperado
})
```

```bash
vitest --typecheck          # roda tsc --noEmit junto; dispensa script separado
```

```ts
// errado: test.each dinâmico — nada aqui é executado, a lista nunca roda
test.each(getCases())('%s', (c) => { expectTypeOf(c).toBeString() })

// certo: lista estática em *.test-d.ts; só a forma de tipo importa
test.each([['a'], ['b']])('%s', (c) => { expectTypeOf(c).toBeString() })
```

#### api/expect-typeof
[doc](https://vitest.dev/api/expect-typeof)

**O que é:** a API de asserção de tipo: `toEqualTypeOf`, `toExtend`, `toMatchObjectType`, os
extratores (`.returns`, `.parameters`, `.resolves`, `.items`), os `toBeString`/`toBeNever` e o `.not`.
**Para que serve:** escrever a expectativa de tipo com a mesma precisão da de valor.
**Quando usar:** dentro dos `*.test-d.ts`. **`toEqualTypeOf` exige identidade; `toExtend` aceita
subtipo** — usar o segundo por engano faz o teste passar com tipo mais largo do que se queria.

```ts
import { expectTypeOf } from 'vitest'

type User = { id: string; name: string }

expectTypeOf<User>().toEqualTypeOf<{ id: string; name: string }>()
expectTypeOf<User & { admin: true }>().toExtend<User>()   // passa: é subtipo
expectTypeOf<User & { admin: true }>().not.toEqualTypeOf<User>()

expectTypeOf(findUser).returns.resolves.toEqualTypeOf<User | null>()
expectTypeOf(findUser).parameter(0).toBeString()
```

```ts
import { expectTypeOf } from 'vitest'
import type { Merge } from '@/lib/types'

type Base = { id: string }
type Extra = { role: string }

expectTypeOf<Merge<Base, Extra>>().toEqualTypeOf<{ id: string; role: string }>()
```

```ts
// errado: toExtend aceita subtipo — passa mesmo com um campo vazado que não devia existir
expectTypeOf<{ id: string; role: string; leaked: boolean }>().toExtend<{ id: string }>()

// certo: toEqualTypeOf exige identidade — pega o campo vazado
expectTypeOf<{ id: string; role: string }>().toEqualTypeOf<{ id: string; role: string }>()
```

## Mocks e espiões

#### mocking
[doc](https://vitest.dev/guide/mocking)

**O que é:** o índice do assunto: funções, módulos, globais, datas, timers, variáveis de ambiente,
sistema de arquivos e requisições.
**Para que serve:** escolher a técnica certa antes de escrever o mock errado.
**Quando usar:** ao começar a mockar qualquer coisa. O aviso central da página: "always remember to
clear or restore mocks before or after each test run" — vários stubs **não** se desfazem sozinhos.

```ts
// O que se desfaz sozinho e o que não se desfaz:
//   vi.fn()/vi.spyOn()  -> histórico limpo por clearMocks (true por padrão na v5)
//   vi.stubGlobal()     -> só com unstubGlobals: true, ou vi.unstubAllGlobals()
//   vi.stubEnv()        -> só com unstubEnvs: true, ou vi.unstubAllEnvs()
//   vi.useFakeTimers()  -> só com vi.useRealTimers()
export default defineConfig({
  test: { unstubGlobals: true, unstubEnvs: true, restoreMocks: true },
})
```

```ts
import { afterEach, beforeEach, vi } from 'vitest'
import { IntersectionObserverMock } from './test-utils'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
```

```ts
// errado: liga fake timers e nunca desliga — o próximo arquivo herda o relógio parado
test('debounces search', () => { vi.useFakeTimers() })

// certo: todo useFakeTimers tem um useRealTimers par, no mesmo arquivo
afterEach(() => vi.useRealTimers())
```

#### mocking/functions
[doc](https://vitest.dev/guide/mocking/functions)

**O que é:** `vi.fn()` para criar um dublê e `vi.spyOn()` para observar um método existente, com a
mesma API de controle e rastreio nos dois.
**Para que serve:** verificar interação e trocar comportamento pontualmente.
**Quando usar:** `spyOn` quando o objeto já existe e você quer manter o original; `fn` quando o dublê
é passado como argumento. Na v5 existe `vi.when()`, que dá comportamento por argumento sem `if/else`
escrito na mão.

```ts
import { expect, test, vi } from 'vitest'

test('sends one notification per member', async () => {
  const send = vi.fn()
  await notifyTeam({ members: ['a', 'b'] }, send)

  expect(send).toHaveBeenCalledTimes(2)
  expect(send).toHaveBeenCalledWith('a')
})

test('spies on an existing method', () => {
  const spy = vi.spyOn(repository, 'getLatest').mockImplementationOnce(() => 'mocked')
  expect(repository.getLatest()).toBe('mocked') // só a primeira chamada
  expect(spy).toHaveBeenCalledOnce()
})
```

```ts
import { expect, test, vi } from 'vitest'
import { createTeam } from './create-team'

test('calls the http client with the right payload', async () => {
  const post = vi.fn().mockResolvedValue({ id: '1' })
  await createTeam({ name: 'Core' }, post)
  expect(post).toHaveBeenCalledWith('/teams', { name: 'Core' })
})
```

```ts
// errado: spyOn numa cópia local — o código sob teste chama o objeto original
const repo = { ...repository }
vi.spyOn(repo, 'getLatest')

// certo: spyOn direto no módulo/objeto que o código sob teste importa
vi.spyOn(repository, 'getLatest')
```

#### mocking/modules
[doc](https://vitest.dev/guide/mocking/modules)

**O que é:** `vi.mock()` com fábrica, `importOriginal`, a opção `{ spy: true }`, a pasta `__mocks__` e
`vi.spyOn` sobre um import de namespace.
**Para que serve:** substituir uma dependência inteira pela borda do módulo.
**Quando usar:** com parcimônia. **O Vitest não mocka chamada interna**: se uma função exportada chama
outra do mesmo arquivo, o mock não pega — e a doc é direta ao dizer que a saída é "refactoring your
code into multiple files or use techniques such as dependency injection", não um truque do runner.

```ts
import { vi } from 'vitest'

// vi.mock é HOISTED para o topo. Na v5, escrevê-lo dentro de describe ou de
// função lança erro em vez de silenciosamente não funcionar.
vi.mock(import('./user-repository.js'), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, findUser: vi.fn().mockResolvedValue({ id: '1' }) }
})

// Alternativa sem fábrica: espia tudo mantendo o comportamento original
vi.mock('./user-repository.js', { spy: true })

// Alternativa sem hoisting, por export: use import de namespace
import * as repo from './user-repository.js'
vi.spyOn(repo, 'findUser').mockResolvedValue(null)
```

```ts
import { vi } from 'vitest'

vi.mock('@/integrations/tanstack-query/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/integrations/tanstack-query/http')>()
  return { ...actual, http: { ...actual.http, get: vi.fn().mockResolvedValue({ id: '1' }) } }
})
```

```ts
// errado: mocka a exportação esperando pegar a chamada interna no mesmo arquivo
export function createTeam() { return validateTeam() }
vi.mock('./team.js', () => ({ validateTeam: vi.fn() })) // não intercepta a chamada interna

// certo: injete a dependência — agora o teste pode trocá-la
export function createTeam(validate = validateTeam) { return validate() }
```

#### mocking/timers
[doc](https://vitest.dev/guide/mocking/timers)

**O que é:** o relógio falso: `vi.useFakeTimers()`, `runAllTimers`, `advanceTimersByTime`,
`advanceTimersToNextTimer`, `vi.useRealTimers()`.
**Para que serve:** testar debounce, retry com backoff e polling sem esperar de verdade.
**Quando usar:** em qualquer teste que hoje tenha um `await sleep(...)`. **Ligar sem desligar
contamina o arquivo inteiro** — o par `beforeEach`/`afterEach` não é opcional.

```ts
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('debounces the search', () => {
  const onSearch = vi.fn()
  const search = debounce(onSearch, 300)

  search('a'); search('ab')
  vi.advanceTimersByTime(299)
  expect(onSearch).not.toHaveBeenCalled()

  vi.advanceTimersByTime(1)
  expect(onSearch).toHaveBeenCalledTimes(1)
  expect(onSearch).toHaveBeenCalledWith('ab')
})
```

```ts
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePendingToast } from '@/hooks/use-pending-toast'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('dismisses the toast after 3s', () => {
  const { result } = renderHook(() => usePendingToast())
  result.current.show('saved')
  vi.advanceTimersByTime(3000)
  expect(result.current.visible).toBe(false)
})
```

```ts
// errado: await de um sleep real com o relógio falso ligado — nunca resolve
vi.useFakeTimers()
await sleep(300)

// certo: avance o relógio falso em vez de esperar de verdade
vi.useFakeTimers()
vi.advanceTimersByTime(300)
```

#### mocking/dates
[doc](https://vitest.dev/guide/mocking/dates)

**O que é:** controle do relógio do sistema com `vi.setSystemTime()`, sobre o `@sinonjs/fake-timers`.
**Para que serve:** congelar "agora" para testar regra que depende de data, expiração de token e
horário comercial.
**Quando usar:** em toda regra com `Date.now()`. **Na v5, os fake timers passaram a mockar também o
`Temporal`**, além do `Date`.

```ts
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('rejects orders outside business hours', () => {
  vi.setSystemTime(new Date('2026-01-15T13:00:00'))
  expect(canPlaceOrder()).toBe(true)

  vi.setSystemTime(new Date('2026-01-15T19:00:00'))
  expect(canPlaceOrder()).toBe(false)
})
```

```ts
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { isSubscriptionExpired } from './subscription'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('flags an expired subscription', () => {
  vi.setSystemTime(new Date('2026-02-01'))
  expect(isSubscriptionExpired({ expiresAt: new Date('2026-01-01') })).toBe(true)
})
```

```ts
// errado: mocka Date.now manualmente — perde o Temporal que a v5 mocka junto
vi.spyOn(Date, 'now').mockReturnValue(1750000000000)

// certo: setSystemTime move o relógio inteiro, Date e Temporal
vi.setSystemTime(new Date('2026-01-15'))
```

#### mocking/globals
[doc](https://vitest.dev/guide/mocking/globals)

**O que é:** `vi.stubGlobal()`, que põe o valor em `globalThis`, e o par `unstubGlobals` /
`vi.unstubAllGlobals()`.
**Para que serve:** as APIs de navegador que o jsdom não implementa — `IntersectionObserver`,
`ResizeObserver`, `matchMedia`.
**Quando usar:** ao testar componente que observa o viewport. **O padrão é NÃO restaurar**: ligue
`unstubGlobals: true` no config, ou o stub vaza para os testes seguintes do arquivo.

```ts
// tests/setup.ts
import { vi } from 'vitest'

const IntersectionObserverMock = vi.fn(class {
  disconnect = vi.fn()
  observe = vi.fn()
  takeRecords = vi.fn()
  unobserve = vi.fn()
})

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
// acessível como IntersectionObserver e como window.IntersectionObserver
```

```ts
// tests/setup.ts — matchMedia para o hook de dark mode
import { vi } from 'vitest'

vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))
```

```ts
// errado: confia no padrão — o stub de IntersectionObserver vaza pro próximo teste
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)

// certo: unstubGlobals: true no config, ou vi.unstubAllGlobals() no afterEach
afterEach(() => vi.unstubAllGlobals())
```

#### mocking/requests
[doc](https://vitest.dev/guide/mocking/requests)

**O que é:** a recomendação oficial para rede: **MSW**, que intercepta `http`, WebSocket e GraphQL
"and is framework agnostic", via Service Worker no navegador e `@mswjs/interceptors` no Node.
**Para que serve:** testar a camada de dados sem mockar `fetch` na mão nem subir servidor.
**Quando usar:** em todo teste que toca a API. **Configure `onUnhandledRequest: 'error'`**: sem isso,
uma rota que você esqueceu de mockar vira requisição real e o teste fica flaky sem explicar por quê.

```ts
// tests/setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer(
  http.get('/api/users/:id', () => HttpResponse.json({ id: '1', name: 'Alice' })),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

```ts
import { expect, test } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../tests/setup'
import { fetchTeam } from '@/integrations/tanstack-query/http'

test('loads the team', async () => {
  server.use(http.get('/api/teams/:id', () => HttpResponse.json({ id: '1', name: 'Core' })))
  expect(await fetchTeam('1')).toEqual({ id: '1', name: 'Core' })
})
```

```ts
// errado: sem onUnhandledRequest — rota não mockada vira requisição real e flaky
server.listen()

// certo: erro explícito aponta qual rota ficou sem handler
server.listen({ onUnhandledRequest: 'error' })
```

#### mocking/file-system
[doc](https://vitest.dev/guide/mocking/file-system)

**O que é:** o sistema de arquivos em memória com **memfs**, ligado por arquivos em `__mocks__/`.
**Para que serve:** testar leitura e escrita "without any real filesystem side effects", incluindo os
caminhos de erro (permissão, arquivo ausente) que são chatos de reproduzir em disco.
**Quando usar:** em qualquer código que toque `node:fs`. Prefira isto a mockar `fs` com `vi.mock` na
mão — é mais rápido e não encosta no disco.

```ts
// __mocks__/fs.cjs         -> module.exports = require('memfs').fs
// __mocks__/fs/promises.cjs -> module.exports = require('memfs').fs.promises

import { beforeEach, expect, test, vi } from 'vitest'
import { vol } from 'memfs'

vi.mock('node:fs')
vi.mock('node:fs/promises')

beforeEach(() => vol.reset())

test('reads the config file', async () => {
  vol.fromJSON({ '/app/config.json': '{"port":3000}' })
  expect(await readConfig('/app/config.json')).toEqual({ port: 3000 })
})
```

#### api/vi
[doc](https://vitest.dev/api/vi)

**O que é:** o objeto utilitário: `fn`, `spyOn`, `when`, `mock`, `doMock`, `hoisted`, `mocked`,
`importActual`, `stubGlobal`, `stubEnv`, os fake timers, `clearAllMocks`/`resetAllMocks`/
`restoreAllMocks`, `waitFor`, `waitUntil`, `resetModules` e `setConfig`.
**Para que serve:** a referência de consulta de tudo que é mock.
**Quando usar:** ao procurar o método exato. **`vi.mock` é hoisted, `vi.doMock` não** — é essa a
diferença que resolve o "meu mock não enxerga a variável local".

```ts
import { vi } from 'vitest'

// vi.hoisted: a saída para quando a fábrica precisa de algo definido antes
const { findUser } = vi.hoisted(() => ({ findUser: vi.fn() }))
vi.mock('./user-repository.js', () => ({ findUser }))

// vi.when (v5): comportamento por argumento, sem if/else escrito na mão
vi.when(findUser).calledWith('1').thenResolve({ id: '1' })
vi.when(findUser).calledWith('404').thenThrow(new Error('not found'))

// vi.waitFor: repete até passar — melhor que sleep arbitrário
await vi.waitFor(() => expect(queue.size).toBe(0), { timeout: 2000 })

// vi.mocked: só tipo, não muda comportamento
vi.mocked(findUser).mockResolvedValue({ id: '2' })
```

```ts
import { expect, test, vi } from 'vitest'

const { findUser } = vi.hoisted(() => ({ findUser: vi.fn() }))
vi.mock('@/integrations/tanstack-query/http', () => ({ findUser }))

test('mocked keeps the type, not the behavior', async () => {
  vi.mocked(findUser).mockResolvedValue({ id: '1' })
  expect(await findUser('1')).toEqual({ id: '1' })
})
```

```ts
// errado: vi.mock é hoisted para o topo — a const local ainda não existe aqui
const send = vi.fn()
vi.mock('./notify.js', () => ({ send })) // ReferenceError: Cannot access 'send'

// certo: vi.hoisted sobe a declaração junto com o mock
const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('./notify.js', () => ({ send }))
```

#### api/mock
[doc](https://vitest.dev/api/mock)

**O que é:** a API da instância do mock: `mockImplementation(Once)`, `mockReturnValue(Once)`,
`mockResolvedValue`, `withImplementation`, `mockClear`/`mockReset`/`mockRestore` e o objeto `.mock`
(`calls`, `results`, `instances`, `contexts`, `invocationCallOrder`).
**Para que serve:** controlar o dublê e inspecionar o que aconteceu com ele.
**Quando usar:** ao precisar de mais do que `toHaveBeenCalledWith`. Os três verbos de limpeza são
distintos e confundi-los custa uma tarde: **clear** apaga o histórico, **reset** apaga histórico e
implementação, **restore** devolve o método original (e só faz sentido depois de `spyOn`).

```ts
import { expect, test, vi } from 'vitest'

test('inspects the call', async () => {
  const save = vi.fn().mockResolvedValue({ id: '1' })
  await createTeam({ name: 'Core' }, save)

  // quando o argumento é grande, inspecionar é melhor que repeti-lo inteiro
  const [payload] = save.mock.calls[0]
  expect(payload.name).toBe('Core')
  expect(save.mock.results[0].type).toBe('return')
})
```

```ts
import { expect, test, vi } from 'vitest'
import { createTeam } from './create-team'

test('sends the normalized name', async () => {
  const post = vi.fn().mockResolvedValue({ id: '1' })
  await createTeam({ name: '  Core  ' }, post)

  const [, payload] = post.mock.calls[0]
  expect(payload.name).toBe('Core')
})
```

```ts
// errado: mockReset "deveria" voltar o original — ele apaga, não restaura
vi.spyOn(repository, 'getLatest').mockReset()
repository.getLatest() // undefined, não o comportamento real

// certo: mockRestore devolve o método original — só vale depois de spyOn
vi.spyOn(repository, 'getLatest').mockRestore()
```

## Configuração

#### config
[doc](https://vitest.dev/config/)

**O que é:** a referência de configuração. "If you are using Vite and have a `vite.config` file,
Vitest will read it to match with the plugins and setup as your Vite app."
**Para que serve:** o ponto de entrada de tudo que se ajusta.
**Quando usar:** ao criar o projeto. **Prefira um `vitest.config.ts` separado** a encher o
`vite.config.ts` de `if (process.env.VITEST)`: o config dedicado tem prioridade e mantém as duas
responsabilidades legíveis. Na v5 o Vitest **não procura mais config em diretório pai**.

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // ... opções aqui
  },
})
```

```ts
// vitest.config.ts — separado do vite.config.ts da aplicação, convenção da casa
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
})
```

```ts
// errado: enche o vite.config.ts da app de `if (process.env.VITEST)`
export default defineConfig(process.env.VITEST ? { test: { environment: 'node' } } : {})

// certo: vitest.config.ts dedicado tem prioridade e mantém as duas responsabilidades legíveis
export default defineConfig({ test: { environment: 'node' } })
```

#### config/globals
[doc](https://vitest.dev/config/globals)

**O que é:** `globals`, `boolean`, padrão **`false`**: liga `describe`/`test`/`expect` globais como no
Jest.
**Para que serve:** compatibilidade com Jest e com bibliotecas que dependem disso.
**Quando usar:** **deixe desligado** e importe de `vitest`. A exceção legítima: `@testing-library/react`
depende de globais para o cleanup automático — aí ligue, e acrescente `vitest/globals` aos `types`.

```ts
export default defineConfig({ test: { globals: true } })
```

```json
// tsconfig.json
{ "compilerOptions": { "types": ["vitest/globals"] } }
```

```ts
// errado: liga globals: true e esquece o tipo — TS não encontra describe/test/expect
export default defineConfig({ test: { globals: true } }) // sem o types abaixo, TS2304

// certo: o tipo acompanha a flag, sempre junto
// tsconfig.json: { "compilerOptions": { "types": ["vitest/globals"] } }
```

#### config/environment
[doc](https://vitest.dev/config/environment)

**O que é:** `environment`, padrão **`'node'`**, com `jsdom`, `happy-dom` e `edge-runtime` embutidos, e
o docblock que troca o ambiente por arquivo.
**Para que serve:** dar `window` e `document` a quem precisa, e só a quem precisa.
**Quando usar:** **não ligue jsdom globalmente num repositório que também tem teste de servidor**. O
custo é medido: jsdom sai por 200–500 ms por import e happy-dom por 90–200 ms — multiplicado por
arquivo. Separe por `projects`, ou use o docblock.

```ts
/**
 * @vitest-environment jsdom
 */
import { expect, test } from 'vitest'

test('renders', () => {
  expect(document.body).toBeDefined()
})

// // @vitest-environment happy-dom  também vale, em comentário de linha
```

```ts
// vitest.config.ts — dois projetos, cada um com o ambiente que precisa
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', environment: 'node', include: ['src/lib/**/*.test.ts'] } },
      { test: { name: 'dom', environment: 'jsdom', include: ['src/components/**/*.test.tsx'] } },
    ],
  },
})
```

```ts
// errado: environment: 'jsdom' global — todo teste de lib/ paga 200-500ms sem precisar
export default defineConfig({ test: { environment: 'jsdom' } })

// certo: node é o padrão; jsdom só por projeto ou por docblock
export default defineConfig({ test: { environment: 'node' } })
```

#### config/setupfiles
[doc](https://vitest.dev/config/setupfiles)

**O que é:** `setupFiles`: arquivos que "will run before each _test file_ in the same process".
**Para que serve:** matchers customizados, servidor MSW, stubs globais — o que tem de existir antes de
qualquer teste do arquivo.
**Quando usar:** para o que é barato e por arquivo. **Rodam uma vez por arquivo de teste**, não uma vez
por execução: pôr trabalho pesado aqui multiplica o custo pelo número de arquivos.

```ts
export default defineConfig({
  test: { setupFiles: ['./tests/setup.ts'] },
})
```

```ts
// Com isolate: false os módulos ficam em cache, mas o setup roda de novo.
// A saída documentada é uma flag global:
if (!globalThis.setupInitialized) {
  computeHeavyThing()
  globalThis.setupInitialized = true
}
```

```ts
// errado: sobe o banco de teste em setupFiles — roda de novo em cada arquivo
export default defineConfig({ test: { setupFiles: ['./tests/start-database.ts'] } })

// certo: trabalho caro e único vai em globalSetup, uma vez para a execução inteira
export default defineConfig({ test: { globalSetup: ['./tests/global-setup.ts'] } })
```

#### config/globalsetup
[doc](https://vitest.dev/config/globalsetup)

**O que é:** `globalSetup`: roda **uma vez**, antes de os workers existirem, com `setup`/`teardown` e o
par `provide`/`inject` para passar dados aos testes.
**Para que serve:** subir um container de banco, aplicar migration, ocupar uma porta.
**Quando usar:** para o caro e único. **Os testes não enxergam variáveis globais daqui** — o setup roda
em outro escopo global; o caminho é `provide`/`inject`.

```ts
// tests/global-setup.ts
export async function setup(project) {
  const db = await startDatabase()
  project.provide('databaseUrl', db.url)
  return async () => db.stop() // teardown
}

// no teste
import { inject } from 'vitest'
const databaseUrl = inject('databaseUrl')
```

```ts
// tests/global-setup.ts — db + migration antes de qualquer worker existir
export async function setup(project) {
  const db = await startDatabase()
  await runMigrations(db.url)
  project.provide('databaseUrl', db.url)
  return async () => db.stop()
}
```

```ts
// errado: espera ler a variável direto — globalSetup roda num escopo global diferente
console.log(process.env.DATABASE_URL) // undefined dentro do teste

// certo: provide/inject é o único canal entre os dois escopos
import { inject } from 'vitest'
const databaseUrl = inject('databaseUrl')
```

#### config/clearmocks
[doc](https://vitest.dev/config/clearmocks)

**O que é:** `clearMocks`, `boolean`, padrão **`true` na v5** (era `false` antes): limpa o histórico
antes de cada teste, "without affecting mock implementations".
**Para que serve:** impedir que a contagem de um teste vaze para o seguinte.
**Quando usar:** deixe ligado. **Mas há um conflito real com `concurrent`**: a limpeza de um teste
apaga o histórico de mocks que outro, em andamento, está usando. Em arquivo concurrent, desligue e
limpe à mão.

```ts
export default defineConfig({
  test: {
    clearMocks: true,   // histórico
    mockReset: false,   // histórico + implementação
    restoreMocks: false, // devolve o método original dos spyOn
  },
})
```

```ts
// vitest.config.ts — projeto ainda em v4 (clearMocks: false por padrão);
// declarar explícito evita depender do padrão que muda entre major
export default defineConfig({
  test: { clearMocks: true },
})
```

```ts
// errado: clearMocks: true num arquivo com describe.concurrent — um teste em
// andamento perde o histórico que o beforeEach de outro teste acabou de apagar

// certo: desligue clearMocks nesse arquivo e limpe à mão, por teste
export default defineConfig({ test: { clearMocks: false } })
afterEach(() => mySpy.mockClear())
```

#### config/testtimeout
[doc](https://vitest.dev/config/testtimeout)

**O que é:** `testTimeout`, padrão **5000 ms** em Node e **15000 ms** em browser mode. "Use `0` to
disable timeout completely."
**Para que serve:** impedir que teste pendurado trave a suíte.
**Quando usar:** ajuste por teste, não global. **Subir o global esconde o teste lento** em vez de
mostrá-lo; e `--test-timeout=0` é para sessão de debug com breakpoint, não para o CI.

```bash
vitest --test-timeout=0 --no-file-parallelism   # sessão de depuração
```

```ts
test('imports a big CSV', { timeout: 30_000 }, async () => { /* ... */ })
```

```ts
// errado: sobe testTimeout global pra 30s pra calar um teste lento
export default defineConfig({ test: { testTimeout: 30_000 } })

// certo: timeout por teste — o teste lento continua visível no resto da suíte
test('imports a big CSV', { timeout: 30_000 }, async () => { /* ... */ })
```

#### config/retry
[doc](https://vitest.dev/config/retry)

**O que é:** `retry`, padrão `0`, aceitando número ou `{ count, delay, condition }`.
**Para que serve:** conviver com instabilidade externa de verdade (rede, rate limit), não com teste
mal escrito.
**Quando usar:** **com `condition`, nunca solto**. Retry global transforma teste quebrado em teste
intermitente e some com o sinal; restringir ao erro esperado preserva a falha real.

```ts
test('calls the external API', {
  retry: { count: 3, delay: 1000, condition: error => error.message.includes('ECONNREFUSED') },
}, async () => {
  expect(await fetchRates()).toBeDefined()
})
```

```bash
vitest --retry.count 3 --retry.delay 500 --retry.condition 'ECONNREFUSED|timeout'
```

```ts
// errado: retry global sem condition — teste quebrado vira "intermitente", sinal perdido
export default defineConfig({ test: { retry: 3 } })

// certo: retry restrito à causa esperada, só no teste que sofre a instabilidade externa
test('calls the external API', {
  retry: { count: 3, condition: (error) => error.message.includes('ECONNREFUSED') },
}, async () => { /* ... */ })
```

#### config/sequence
[doc](https://vitest.dev/config/sequence)

**O que é:** `sequence`: `shuffle`, `seed`, `concurrent`, `hooks` (`stack` padrão, `list`, `parallel`),
`setupFiles`, `groupOrder` e `sequencer`.
**Para que serve:** controlar ordem — e, com `shuffle`, provar que não existe ordem implícita.
**Quando usar:** **ligue `shuffle` uma vez e veja o que quebra**: o que falha embaralhado é dependência
acidental entre testes. O custo é perder o cache que prioriza os testes longos, então não é padrão.

```ts
export default defineConfig({
  test: {
    sequence: {
      shuffle: true,
      seed: 12345,      // reproduz a ordem que quebrou
      hooks: 'stack',   // "after" em ordem inversa; é o padrão
    },
  },
})
```

```ts
// vitest.config.ts — CI roda shuffle num job semanal separado, não em todo push
export default defineConfig({
  test: { sequence: { shuffle: process.env.SHUFFLE_CI === 'true' } },
})
```

```ts
// errado: shuffle sem seed — a ordem que quebrou não se reproduz no seu próprio dev
export default defineConfig({ test: { sequence: { shuffle: true } } })

// certo: fixe o seed que apareceu no log de CI pra reproduzir localmente
export default defineConfig({ test: { sequence: { shuffle: true, seed: 12345 } } })
```

#### config/typecheck
[doc](https://vitest.dev/config/typecheck)

**O que é:** `typecheck`: `enabled`, `only`, `checker` (`tsc` padrão, ou `vue-tsc`), `include`
(`['**/*.{test,spec}-d.?(c|m)[jt]s?(x)']`), `tsconfig`, `ignoreSourceErrors`, `allowJs`,
`spawnTimeout`.
**Para que serve:** rodar a checagem de tipo como parte da suíte, com relatório de teste.
**Quando usar:** ao adotar `*.test-d.ts`. **`ignoreSourceErrors` é o que decide se o erro de tipo do
código de produção reprova a suíte de teste** — pense antes de ligar por conveniência.

```ts
export default defineConfig({
  test: {
    typecheck: {
      enabled: true,
      checker: 'tsc',
      tsconfig: './tsconfig.test.json',
      ignoreSourceErrors: false,
    },
  },
})
```

```ts
// vitest.config.ts — client gerado de uma lib interna, só a forma de tipo importa
export default defineConfig({
  test: { typecheck: { enabled: true, include: ['src/**/*.test-d.ts'] } },
})
```

```ts
// errado: ignoreSourceErrors: true "pra suíte passar" — esconde erro real do código
export default defineConfig({ test: { typecheck: { ignoreSourceErrors: true } } })

// certo: ignoreSourceErrors só quando o erro é de uma dependência, não do seu código
export default defineConfig({ test: { typecheck: { ignoreSourceErrors: false } } })
```

#### config/coverage
[doc](https://vitest.dev/config/coverage)

**O que é:** as opções de cobertura: `provider`, `include`/`exclude`, `reporter` (padrão
`['text', 'html', 'clover', 'json']`), `reportsDirectory` (padrão `./coverage`), `thresholds`,
`skipFull`, `reportOnFailure`, `allowExternal` e `autoAttachSubprocess` (v5).
**Para que serve:** medir e, com `thresholds`, impedir regressão.
**Quando usar:** ao ligar cobertura em CI. **Declare `coverage.include` explicitamente** — `coverage.all`
foi removido na v4, e sem `include` só entra no relatório o que algum teste tocou, o que produz aquele
número lindo e mentiroso.

```ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],         // sem isto, o número mente
      exclude: ['src/**/*.stories.tsx'],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
      reportOnFailure: true,                  // relatório mesmo com teste vermelho
    },
  },
})
```

```ts
// vitest.config.ts — exclui gerado (routeTree.gen.ts) e o design system do shadcn
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/routeTree.gen.ts', 'src/components/ui/**'],
    },
  },
})
```

```ts
// errado: sem include — só o que algum teste tocou entra no relatório, número mentiroso
export default defineConfig({ test: { coverage: { provider: 'v8' } } })

// certo: include explícito é obrigatório desde que coverage.all saiu na v4
export default defineConfig({
  test: { coverage: { provider: 'v8', include: ['src/**/*.{ts,tsx}'] } },
})
```

## Concorrência, isolamento e desempenho

#### config/pool
[doc](https://vitest.dev/config/pool)

**O que é:** `pool`, padrão **`'forks'`**, com `'threads'`, `'vmThreads'` e `'vmForks'`.
**Para que serve:** escolher o mecanismo que executa os arquivos de teste.
**Quando usar:** **quase nunca troque**. `threads` é mais rápido na comunicação mas quebra
`process.chdir()`, módulos nativos (Prisma, bcrypt, canvas) e `process.env.TZ`. Os pools `vm` são
rápidos e trazem o preço junto: cache indefinido de ES modules — ou seja, vazamento de memória — e
erros nativos com construtores de outra realm, onde `instanceof` mente.

```ts
export default defineConfig({
  test: {
    pool: 'forks', // padrão, e o único seguro com módulo nativo
    maxWorkers: 1, // ex.: banco compartilhado — poolOptions.forks.singleFork saiu na v4
  },
})
```

```ts
// vitest.config.ts — projeto processa upload de imagem com sharp (binário nativo)
export default defineConfig({
  test: { pool: 'forks' },
})
```

```ts
// errado: troca para vmThreads "porque é mais rápido" — instanceof mente entre realms
export default defineConfig({ test: { pool: 'vmThreads' } })

// certo: forks é o único seguro com módulo nativo, sem o risco de outra realm
export default defineConfig({ test: { pool: 'forks' } })
```

#### config/isolate
[doc](https://vitest.dev/config/isolate)

**O que é:** `isolate`, `boolean`, padrão **`true`**: cada arquivo num ambiente próprio.
**Para que serve:** garantir que um arquivo não deixe estado para o seguinte.
**Quando usar:** desligar é "the largest performance gain" segundo a doc de desempenho, e é seguro em
código funcional sem efeito colateral global. **Não tem efeito em `vmThreads`/`vmForks`** — ali o
isolamento é do próprio pool.

```ts
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', environment: 'node', isolate: false } }, // puro, rápido
      { test: { name: 'db', isolate: true } },                          // toca estado
    ],
  },
})
```

```ts
// vitest.config.ts — lib/ e hooks são puros; desligar isolamento aqui é seguro
export default defineConfig({
  test: { isolate: false, include: ['src/lib/**/*.test.ts'] },
})
```

```ts
// errado: isolate: false num arquivo que muta estado de módulo (cache, singleton)
// — o próximo teste herda o estado do anterior, sem aviso nenhum

// certo: isolate: true (padrão) pra esse arquivo, ou separe por projects
export default defineConfig({ test: { isolate: true } })
```

#### config/maxworkers
[doc](https://vitest.dev/config/maxworkers)

**O que é:** `maxWorkers`, número ou porcentagem, calculado sobre `os.availableParallelism`. O padrão
usa todo o paralelismo fora do watch, e metade dentro dele.
**Para que serve:** caber no runner de CI sem sufocar a máquina de quem desenvolve.
**Quando usar:** no CI. **Runner com 2 vCPUs e detecção de 16 núcleos é a receita clássica de teste
intermitente por timeout**; fixe o número no ambiente onde ele é medido.

```ts
export default defineConfig({
  test: { maxWorkers: process.env.CI ? 2 : '50%' },
})
```

```ts
// vitest.config.ts — runner do GitHub Actions anuncia 16 núcleos, tem 2 vCPUs reais
export default defineConfig({
  test: { maxWorkers: 2 },
})
```

```ts
// errado: deixa o padrão medir os núcleos "detectados" no runner de CI
export default defineConfig({ test: {} })

// certo: fixe o número no ambiente onde ele foi medido, não onde foi adivinhado
export default defineConfig({ test: { maxWorkers: 2 } })
```

#### config/fileparallelism
[doc](https://vitest.dev/config/fileparallelism)

**O que é:** `fileParallelism`, padrão `true`. Desligado, força `maxWorkers: 1`.
**Para que serve:** serializar arquivos que disputam um recurso único.
**Quando usar:** com banco, porta ou diretório compartilhado. **É diferente de `isolate`**: aqui a
questão é quantos arquivos rodam ao mesmo tempo, não se cada um tem ambiente próprio.

```bash
vitest --no-file-parallelism   # também é requisito para depurar com breakpoint
```

```ts
export default defineConfig({ test: { fileParallelism: false } })
```

```ts
// errado: desliga fileParallelism pra suíte inteira — força maxWorkers:1 pra tudo
export default defineConfig({ test: { fileParallelism: false } })

// certo: isole só o grupo que disputa o recurso, num project à parte
export default defineConfig({
  test: { projects: [{ test: { name: 'db', fileParallelism: false } }] },
})
```

#### parallelism
[doc](https://vitest.dev/guide/parallelism)

**O que é:** os dois níveis de paralelismo — entre arquivos (workers, `pool`, `maxWorkers`) e dentro do
arquivo (`concurrent`, `maxConcurrency`).
**Para que serve:** entender qual botão mexer quando a suíte está lenta.
**Quando usar:** antes de mexer em qualquer um deles. O aviso que evita frustração: "Concurrent tests
only speed things up when your tests spend time waiting" — teste síncrono não ganha nada.

```ts
import { describe, test } from 'vitest'

// arquivos: paralelos por padrão. Testes dentro do arquivo: sequenciais por padrão.
describe.concurrent('external API', () => {
  test('fetches users', async ({ expect }) => { /* expect do contexto! */ })
  test('fetches teams', async ({ expect }) => { /* ... */ })
  test('writes audit log', { concurrent: false }, async () => { /* opt-out */ })
})
```

#### improving-performance
[doc](https://vitest.dev/guide/improving-performance)

**O que é:** o guia de otimização: ler o `Duration` para saber onde o tempo vai, isolamento, escolha de
pool, custo do ambiente DOM, `fsModuleCache`, `test.dir`, `--shard` e `NODE_COMPILE_CACHE`.
**Para que serve:** atacar a causa em vez de chutar configuração.
**Quando usar:** quando a suíte incomodar. **Comece pelo `Duration`**: se o tempo está em "environment",
o problema é jsdom onde não precisa; se está em "transform", é ESM/CJS mal resolvido — e nenhum dos
dois melhora trocando de pool. Na v5, `vitest doctor` mede as alternativas em vez de estimar.

```bash
vitest run --no-isolate              # costuma ser o maior ganho isolado
vitest run --shard=1/4               # divide entre máquinas do CI
vitest doctor                        # mede configurações alternativas
```

```bash
vitest doctor                 # mede as alternativas de pool/isolate pra esse projeto
vitest run --no-isolate       # aplica o que o doctor apontou como maior ganho
```

```ts
// errado: troca de pool "pra acelerar" — não é onde o tempo documentado está
export default defineConfig({ test: { pool: 'threads' } })

// certo: o maior ganho isolado, segundo a doc, é desligar isolate — não o pool
export default defineConfig({ test: { isolate: false } })
```

## Ambiente, cobertura e saída

#### environment
[doc](https://vitest.dev/guide/environment)

**O que é:** como escrever um ambiente próprio: um objeto `Environment` com `name`, `viteEnvironment`
(`'ssr'`, `'client'` ou um ambiente Vite seu), `setup()` e, para os pools `vm`, `setupVM()`.
**Para que serve:** ambientes que os embutidos não cobrem — um runtime de borda próprio, um sandbox de
worker.
**Quando usar:** raro, e depois de esgotar `environmentOptions`. Na v4 o `transformMode` saiu e deu
lugar a `viteEnvironment`, então ambiente escrito para a v3 não carrega.

```ts
// vitest-environment-custom.ts
// Os utilitarios vivem em `vitest/runtime` (builtinEnvironments, populateGlobal).
export default {
  name: 'custom',
  viteEnvironment: 'ssr',
  setup(global) {
    global.myRuntime = createRuntime()
    return {
      teardown() { delete global.myRuntime },
    }
  },
}
```

#### coverage
[doc](https://vitest.dev/guide/coverage)

**O que é:** os dois providers. **v8** é o padrão recomendado, sem instrumentação prévia, e desde a
3.2 faz remapeamento por AST com precisão equivalente à do istanbul. **istanbul** transforma o código
antes e é "widely used and battle-tested for over 13 years".
**Para que serve:** medir cobertura sem pagar o custo de instrumentação onde ele não é necessário.
**Quando usar:** v8, salvo se o runtime não for V8 — ele não funciona em Firefox nem em Bun, e aí o
istanbul é a única opção.

```bash
npm i -D @vitest/coverage-v8     # ou @vitest/coverage-istanbul
vitest run --coverage
```

```ts
// Ignorar trecho: o comentário @preserve é obrigatório em TypeScript,
// porque o esbuild remove comentários antes de o provider vê-los.
/* v8 ignore next -- @preserve */
if (process.env.NODE_ENV === 'development') { /* ... */ }
```

#### reporters
[doc](https://vitest.dev/guide/reporters)

**O que é:** os reporters embutidos: `default`, `verbose`, `tree`, `dot`, `json`, `junit`, `html`,
`tap`, `blob`, `github-actions`, `minimal`, `hanging-process`.
**Para que serve:** a saída certa para cada leitor — humano, CI, agente.
**Quando usar:** ao montar o CI. Dois que resolvem problema real: **`hanging-process`**, quando o
Vitest não sai e ninguém sabe por quê, e **`blob`**, que junta os resultados de execuções fatiadas por
`--shard`. Na v5 o Vitest escolhe `minimal` ao detectar agente de código e acrescenta
`github-actions` no GitHub Actions.

```ts
export default defineConfig({
  test: {
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: './.vitest/junit.xml' },
  },
})
```

```bash
vitest run --reporter=hanging-process   # descobre o que segura o processo
```

```ts
// errado: só o reporter default em CI — nenhum artefato de máquina pra outra ferramenta ler
export default defineConfig({ test: { reporters: ['default'] } })

// certo: junit em CI (ou outro leitor), default continua pro humano
export default defineConfig({
  test: { reporters: process.env.CI ? ['default', 'junit'] : ['default'] },
})
```

#### ui
[doc](https://vitest.dev/guide/ui)

**O que é:** o `@vitest/ui`: a interface ao vivo em `--ui` e o reporter `html`, que gera um relatório
estático (padrão `.vitest/index.html`).
**Para que serve:** navegar por uma suíte grande, ver o grafo de módulos e revisar execução de CI
depois.
**Quando usar:** o `--ui` em investigação local; o `--reporter=html` como artefato de CI. **Na v5 o
acesso a `/__vitest__/` exige token**, então link antigo salvo no navegador deixa de abrir.

```bash
npm i -D @vitest/ui
vitest --ui
vitest run --reporter=html    # artefato estático para o CI publicar
```

```bash
vitest run --reporter=html     # gera .vitest/index.html
# o job de CI sobe .vitest/ como artefato pra revisão depois, sem reexecutar nada
```

```bash
# errado: link salvo do navegador pra /__vitest__/ sem token — a v5 recusa o acesso
open http://localhost:51204/__vitest__/

# certo: sempre abra via `vitest --ui`, que já imprime a URL com o token
vitest --ui
```

#### browser
[doc](https://vitest.dev/guide/browser/)

**O que é:** rodar os testes em navegador de verdade, com providers em pacotes separados:
`@vitest/browser-playwright`, `@vitest/browser-preview`, `@vitest/browser-webdriverio`.
**Para que serve:** testar o que o jsdom aproxima mal — layout, eventos reais, APIs do navegador.
**Quando usar:** em teste de componente que depende de comportamento real do navegador; mantenha a
lógica de negócio em `environment: 'node'`. **Na v4 o provider virou objeto importado**, e na v5 os
locators ficaram estritos por padrão (texto exato, sensível a maiúsculas) e `render()` passou a ser
assíncrono nos pacotes Vue e Svelte.

```ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      provider: playwright(),          // v4+: objeto, não a string 'playwright'
      instances: [{ browser: 'chromium' }],
    },
  },
})
```

```bash
npx vitest init browser
```

```ts
// errado: provider: 'playwright' como string — forma da v3, removida na v4
export default defineConfig({ test: { browser: { provider: 'playwright' } } })

// certo: provider é objeto importado do pacote dedicado desde a v4
import { playwright } from '@vitest/browser-playwright'
export default defineConfig({ test: { browser: { provider: playwright() } } })
```

#### in-source
[doc](https://vitest.dev/guide/in-source)

**O que é:** teste dentro do próprio arquivo de origem, num bloco `if (import.meta.vitest)`, ao estilo
do Rust.
**Para que serve:** testar estado privado sem exportá-lo só para o teste, com realimentação mais curta.
**Quando usar:** "for unit testing for small-scoped functions or utilities", e para prototipagem. **A
configuração de build não é opcional**: sem definir `import.meta.vitest` como `undefined`, o bloco de
teste vai para o bundle de produção.

```ts
// src/slugify.ts
export function slugify(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-')
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest
  it('slugifies', () => expect(slugify(' Hello World ')).toBe('hello-world'))
}
```

```ts
export default defineConfig({
  test: { includeSource: ['src/**/*.{js,ts}'] },
  define: { 'import.meta.vitest': 'undefined' }, // dead code elimination no build
})
// tsconfig.json: { "compilerOptions": { "types": ["vitest/importMeta"] } }
```

```ts
// errado: sem o define, o bloco if (import.meta.vitest) vai pro bundle de produção
export default defineConfig({ test: { includeSource: ['src/**/*.ts'] } })

// certo: define elimina o bloco morto no build de produção
export default defineConfig({
  test: { includeSource: ['src/**/*.ts'] },
  define: { 'import.meta.vitest': 'undefined' },
})
```

#### debugging
[doc](https://vitest.dev/guide/debugging)

**O que é:** como depurar: terminal de debug do VS Code, `--inspect-brk` com `chrome://inspect`, e a
configuração do IntelliJ.
**Para que serve:** parar num breakpoint em vez de espalhar `console.log`.
**Quando usar:** ao investigar falha que não se explica pela mensagem. **Todo método exige execução em
um worker só** — sem `--no-file-parallelism` o breakpoint não é respeitado —, e vale somar
`--test-timeout=0` para o teste não expirar enquanto você olha o estado.

```bash
vitest --inspect-brk --no-file-parallelism --test-timeout=0
# depois: chrome://inspect
```

```jsonc
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug tests",
  "program": "${workspaceRoot}/node_modules/vitest/vitest.mjs",
  "args": ["run", "--no-file-parallelism", "${relativeFile}"],
  "console": "integratedTerminal"
}
```

```bash
# errado: anexa o inspector sem isolar workers — o breakpoint nunca é atingido
vitest --inspect-brk

# certo: um worker só, e sem timeout cortando a sessão de debug
vitest --inspect-brk --no-file-parallelism --test-timeout=0
```

