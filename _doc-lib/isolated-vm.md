# isolated-vm

Acesso à interface `Isolate` do V8 dentro do Node.js, para rodar código em ambientes JavaScript
completamente separados uns dos outros.

> Conferido contra `isolated-vm@7.0.1`

**O que é:** um addon nativo que expõe o `Isolate` do V8 para o Node.js. Cada isolate é um heap
próprio, com garbage collector próprio e nenhum objeto compartilhado com o processo que o criou. O
README resume o recorte em uma frase: rodar código em um ambiente JavaScript novo, livre das
capacidades que o runtime do Node.js oferece por padrão. É o oposto de `node:vm`, que cria um
*contexto* novo mas continua no mesmo isolate, com o mesmo heap e os mesmos objetos alcançáveis por
prototype chain.

**Para que serve:** executar código que você não escreveu — fórmula digitada por usuário, regra de
automação, hook de extensão, template — sem que esse código consiga alcançar `process`, `require`,
`fs`, o event loop ou a memória da aplicação. E, junto disso, impor limites que `node:vm` não tem:
teto de memória por isolate, `timeout` por execução, e contabilidade de CPU e wall time por isolate.

**Como usar:**

```bash
npm i isolated-vm          # addon NATIVO: compila na instalação, precisa de compilador
node --no-node-snapshot app.js   # obrigatório a partir do Node 20.x
```

```ts
import ivm from 'isolated-vm'

// Um isolate com teto de memória próprio.
const isolate = new ivm.Isolate({ memoryLimit: 128 })

// Um contexto: globais e builtins próprios, isolados dos outros contextos.
const context = await isolate.createContext()
const jail = context.global

// `global` só existe dentro do isolate se você mesmo colocar lá.
await jail.set('global', jail.derefInto())

// Toda função injetada é uma porta que você abriu de propósito.
await jail.set('log', (msg: string) => console.log(msg))

// Compilar uma vez, rodar muitas — e SEMPRE com timeout.
const script = await isolate.compileScript('log("oi"); 1 + 1')
const resultado = await script.run(context, { timeout: 100 }) // 2

isolate.dispose() // devolve a memória na hora, sem esperar o GC
```

**Quando usar a biblioteca:** quando o código a executar vem de fora da equipe e o processo que o
executa também atende requisições reais. Se o código é seu e só está em string por conveniência,
`node:vm` basta e custa zero. Se o código é de terceiro, `node:vm` **não é fronteira de segurança** —
a própria documentação do Node diz isso — e nenhuma quantidade de `Object.freeze` conserta, porque o
atacante e a aplicação dividem o mesmo heap. `isolated-vm` é a opção que fecha essa porta dentro do
mesmo processo; a alternativa honesta acima dela é outro processo, ou outra máquina.

Como a comparação sai no próprio README:

| Módulo | Seguro | Limite de memória | Isolado | Multithread | `require` | Inspector |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `node:vm` | | | | | ✅ | ✅ |
| `worker_threads` | | | ✅ | ✅ | ✅ | ✅ |
| `vm2` | | | | | ✅ | ✅ |
| `isolated-vm` | ✅ | ✅ | ✅ | ✅ | | ✅ |

Repare na coluna que **falta** no isolated-vm: `require`. Não é omissão, é a tese da biblioteca. A
única pergunta frequente do README é "como passo um módulo/função/objeto para dentro do isolate?", e
a resposta é "você não passa". Isolate é isolado: passar uma função do Node.js para dentro dele é tão
sem sentido quanto passar uma função do Node.js para dentro do Firefox. Ou você manda o **código**
(empacotado com esbuild/Rollup) e ele roda lá, ou você expõe um **delegado** — uma função de sua
autoria que faz a operação no lado Node.js e devolve o resultado.

**Três coisas que decidem se isso vai ao ar ou não:**

| O quê | Consequência |
|---|---|
| Módulo nativo, compilado na instalação | Precisa de `python`, `make` e `g++`/`gcc-c++` na imagem. `npm ci --ignore-scripts` **não compila o addon** e o `import` falha só em runtime |
| ABI do V8 amarrada à versão do Node | Versão maior do Node exige versão maior da lib (`7.x` para Node 26.x). Bump de Node vira bump de dependência, não upgrade transparente |
| Build por arquitetura | Uma imagem Docker `linux/amd64` + `linux/arm64` compila o addon duas vezes, em dois builders. Cache de camada de `node_modules` copiado entre plataformas produz binário do host errado |

**O detalhe que economiza horas:** a partir do Node 20.x o processo precisa subir com
`--no-node-snapshot`, ou o isolate falha. Não é opcional, não é otimização, e está escrito em uma
linha do README que é fácil de passar batido. Coloque na linha de comando do container, no
`NODE_OPTIONS` e no script de teste, os três, antes de escrever a primeira linha de código.

**Aviso que vale mais que qualquer exemplo:** o isolate resolve *contenção de memória e alcance de
objeto*. Ele **não** resolve cota de chamadas, não resolve o que você mesmo expôs no global, e não
torna segura uma função sua que o código hostil pode chamar um milhão de vezes com os argumentos que
quiser. Cada função injetada é superfície de ataque, e vazar uma instância de `Reference` ou
`ExternalCopy` para o código hostil, segundo o README, é um trampolim normalmente trivial de volta
para o isolate do Node.js — ou seja, controle completo do processo.

**Links:** 35.

**Skills:** `maiyu-backend`, `security-best-practices`, `security-and-hardening`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

---

## Por que isolated-vm, e o que ele não resolve

#### alternatives
[doc](https://github.com/laverdet/isolated-vm#alternatives)

**O que é:** a tabela que compara `node:vm`, `worker_threads`, `vm2`, `tiny-worker` e `isolated-vm`
em seis eixos: segurança, limite de memória, isolamento, multithread, suporte a módulos e inspector.
**Para que serve:** decidir a ferramenta **antes** de escrever código, com o critério explícito de
cada coluna ("Secure" é definido como obstruir acesso às capacidades inseguras do Node.js).
**Quando usar:** na primeira discussão de "e se a gente usasse `vm` mesmo?". Leia junto com a
[documentação do `node:vm`](https://nodejs.org/api/vm.html), que afirma não ser um mecanismo de
segurança. Na tabela, `node:vm` e `vm2` não marcam nenhuma das quatro primeiras colunas.

```ts
// node:vm — MESMO isolate, MESMO heap. O contexto é novo, a fronteira não existe.
import vm from 'node:vm'
vm.runInNewContext('this.constructor.constructor("return process")().exit()')
// o processo morre: o código escapou pelo prototype chain de uma função do host

// isolated-vm — outro isolate, outro heap. Não há `process` para alcançar,
// porque não há objeto algum compartilhado entre os dois lados.
import ivm from 'isolated-vm'
const isolate = new ivm.Isolate({ memoryLimit: 8 })
const context = await isolate.createContext()
await context.eval('typeof process') // "undefined"
```

#### security
[doc](https://github.com/laverdet/isolated-vm#security)

**O que é:** a seção que diz, com todas as letras, que usar isolated-vm **não torna a aplicação
segura automaticamente**, e lista o que continua sendo responsabilidade de quem chama.
**Para que serve:** calibrar a expectativa. Descuido ou uso errado da biblioteca vaza dado sensível
ou concede privilégio ao isolate.
**Quando usar:** **antes de subir para produção**, e de novo na revisão de qualquer código que
injete algo no global. Os pontos concretos: não vaze instâncias de `Reference`/`ExternalCopy` para
código não confiável; mantenha o Node.js atualizado nos point releases (é por eles que vêm as
correções de V8); não use versão ímpar de Node.js; mantenha isolates em um processo separado da
infraestrutura crítica; se APT está no modelo de ameaça, arquitete como o site isolation do Chromium
e mantenha o kernel atualizado contra escalonamento local de privilégio.

```ts
// básico — o idioma do README: isolate com teto, contexto, superfície mínima.
import ivm from 'isolated-vm'

const isolate = new ivm.Isolate({ memoryLimit: 64 })
const context = await isolate.createContext()
const jail = context.global
await jail.set('log', (msg: unknown) => console.log(String(msg).slice(0, 500)))
```

```ts
// caso real da stack — service Fastify que roda script do tenant e nunca
// deixa o `Reference` escapar da função; o retorno vira Either.
import { left, right, type Either } from '@application/core/either.core'
import type { HTTPException } from '@application/core/http-exception.core'

type SandboxFailure = { readonly reason: string }

@Service()
export default class ScriptSandboxService {
  async run(code: string, team: Team): Promise<Either<HTTPException, string>> {
    const isolate = new ivm.Isolate({ memoryLimit: 32 })
    try {
      const context = await isolate.createContext()
      await context.global.set('teamId', team.id)
      const script = await isolate.compileScript(code)
      await script.run(context, { timeout: 200 })
      return right('ok')
    } catch {
      return left(HTTPException.BadRequest('script falhou', 'SCRIPT_FAILED'))
    } finally {
      isolate.dispose()
    }
  }
}
```

```ts
// armadilha
// errado: entregar o Reference em si é trampolim de volta para o isolate do Node.
await jail.set('jail', jail) // NUNCA — segue prototype chain até o host
await jail.set('ivm', ivm, { copy: true }) // NUNCA — dá acesso à própria lib

// certo: só funções próprias, superfície mínima, argumento sempre copiado.
await jail.set('log', (msg: unknown) => console.log(String(msg).slice(0, 500)))
// porquê: cada função exposta é a única porta de entrada — Reference/ExternalCopy
// vazado é controle completo do processo, segundo a seção Security do README.
```

#### frequently-asked-question
[doc](https://github.com/laverdet/isolated-vm#frequently-asked-question)

**O que é:** a única pergunta frequente do projeto — "como passo um módulo, função, objeto ou
biblioteca para dentro do isolate?" — e a resposta, que é "você não passa".
**Para que serve:** desfazer o modelo mental errado que causa 90% da frustração inicial. A metáfora
do README: como você passaria uma função do Node.js para dentro do Firefox? Não passa; é sem sentido.
**Quando usar:** na primeira vez que alguém tentar `jail.set('lodash', require('lodash'))`. Os dois
caminhos válidos são: mandar o **código** para dentro (empacotado com Webpack/Rollup/esbuild), o que
funciona para funções que não precisam de arquivo nem de rede; ou montar um **delegado** que executa
a operação no lado Node.js e devolve o resultado — o equivalente a uma chamada REST de volta ao seu
serviço, na metáfora do navegador.

```ts
// ERRADO: o objeto não atravessa. Não existe "passar a lib".
await jail.set('fs', await import('node:fs'))

// CERTO (a): o código vai para dentro, já empacotado, sem I/O.
const bundle = await readFile('dist/regras.bundle.js', 'utf8')
await (await isolate.compileScript(bundle)).run(context, { timeout: 200 })

// CERTO (b): delegado com superfície mínima. Note que é VOCÊ quem define a
// política — caminho permitido, tamanho máximo, cota de chamadas.
let chamadas = 0
await jail.set('lerConfig', async (chave: string) => {
  if (++chamadas > 50) throw new Error('cota excedida')
  if (!/^[a-z.]{1,64}$/.test(chave)) throw new Error('chave inválida')
  return await buscarConfig(chave)
})
```

#### requirements
[doc](https://github.com/laverdet/isolated-vm#requirements)

**O que é:** os pré-requisitos: Node.js 16.x ou superior, a flag `--no-node-snapshot` a partir do
Node 20.x, e um compilador instalado, com o pacote certo listado por distribuição.
**Para que serve:** entender que isto é um **addon nativo**, não um pacote JavaScript puro.
**Quando usar:** ao escrever o `Dockerfile` e ao configurar o CI. Erro em `npm install` quase sempre
é compilador ausente ou velho demais. Os pacotes que o README lista: Ubuntu `python g++
build-essential`; Alpine `python3 make g++`; Arch `make gcc python`; Red Hat `python3 make gcc
gcc-c++ zlib-devel brotli-devel openssl-devel`; Windows e macOS seguem as instruções do `node-gyp`.

```dockerfile
# Estágio de build: o toolchain existe só aqui.
FROM node:22-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci                 # NÃO use --ignore-scripts: é o script que compila o addon
COPY . .
RUN npm run build

# Imagem final: sem compilador, com o binário já compilado.
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# A flag é obrigatória a partir do Node 20.x.
CMD ["node", "--no-node-snapshot", "dist/server.js"]
```

#### compatibility
[doc](https://github.com/laverdet/isolated-vm#compatibility)

**O que é:** a tabela que amarra versão do Node.js a versão da biblioteca, e a nota de que versões
ímpares de Node.js não são suportadas.
**Para que serve:** escolher a versão certa e prever o custo de um upgrade de Node.js.
**Quando usar:** ao fixar a versão no `package.json` e ao planejar bump de runtime. A tabela do
README: Node 22.x usa `5.x` ou `4.x`; Node 24.x usa `6.x` ou `5.x`; Node 26.x usa `7.x`. A
consequência prática é que a versão do Node.js da imagem e a versão desta dependência viram **uma
decisão só** — o addon liga na ABI do V8, e trocar o runtime sem trocar a lib quebra na carga do
módulo, não no lint.

```jsonc
// package.json — os dois lados travados juntos, e o motivo escrito ao lado.
{
  "engines": { "node": ">=26 <27" },
  "dependencies": {
    // isolated-vm 7.x <-> Node 26.x. Subir um exige subir o outro.
    "isolated-vm": "^7.0.0"
  }
}
```

#### project-status
[doc](https://github.com/laverdet/isolated-vm#project-status)

**O que é:** a declaração de que o projeto está em *maintenance mode*, com suporte continuado
enquanto for tecnicamente viável, e uma branch `experimental` onde o autor trabalha em uma versão
nova que ele mesmo descreve como não pronta para aplicações sérias.
**Para que serve:** decisão de risco, não de API.
**Quando usar:** na avaliação de adoção. O que isso significa na prática: espere compatibilidade com
novas versões de Node.js e correções, não funcionalidade nova. Não construa sobre a branch
`experimental`, e mantenha a execução de código não confiável atrás de uma interface própria — um
módulo `sandbox/` com duas ou três funções — para que a biblioteca seja substituível sem reescrever
quem a chama.

```ts
// Convenção que paga o próprio custo: a lib entra por UM arquivo só.
// sandbox/executar.ts  — a única importação de 'isolated-vm' no projeto inteiro
export type ResultadoSandbox = { ok: true; valor: unknown } | { ok: false; erro: string }

export async function executar(
  codigo: string,
  opcoes: { timeoutMs: number; memoriaMb: number },
): Promise<ResultadoSandbox> {
  // implementação com isolated-vm aqui dentro, e SÓ aqui dentro
}
```

## Fundamentos da API

#### api-documentation
[doc](https://github.com/laverdet/isolated-vm#api-documentation)

**O que é:** a introdução da referência, onde está a regra central: **a única maneira de passar dado
de um isolate para outro é torná-lo *transferable***. Primitivos (exceto `Symbol`) já são; qualquer
outra coisa precisa de `Reference`, `ExternalCopy` ou `Callback`.
**Para que serve:** o modelo mental inteiro da biblioteca cabe nesta seção.
**Quando usar:** **antes de escrever a segunda linha**. Aqui também estão as quatro regras de quando
se pode chamar a versão síncrona de um método, na íntegra: (1) funções assíncronas podem ser chamadas
a qualquer momento; (2) funções síncronas em geral **não** podem ser chamadas de dentro de uma função
assíncrona; (3) podem, se pertencerem ao isolate atual; (4) funções síncronas do isolate padrão do
Node.js podem ser chamadas sempre.

```ts
// básico — as três formas do README. A diferença NÃO é estética.
await context.eval('1 + 1')        // async: roda em thread separada, devolve Promise
context.evalSync('1 + 1')          // sync: BLOQUEIA a thread do Node.js até terminar
context.evalIgnored('cleanup()')   // ignored: não devolve nada e ENGOLE a exceção
```

```ts
// caso real da stack — toda API injetada atravessa como Reference/Callback,
// exatamente a regra desta seção: primitivo passa, o resto precisa de embrulho.
@Service()
export default class VmRunnerService {
  async run(code: string, team: Team): Promise<Either<HTTPException, void>> {
    const isolate = new ivm.Isolate({ memoryLimit: 128 })
    const context = await isolate.createContext()
    await context.global.set(
      'buscarTeam',
      new ivm.Reference(async () => this.toPlain(team)), // objeto → Reference
    )
    const script = await isolate.compileScript(code)
    await script.run(context, { timeout: 100, promise: true })
    return right(undefined)
  }
}
```

```ts
// armadilha
// errado: tentar enviar um objeto comum, sem embrulho — some em silêncio.
await context.global.set('time', team) // nem erro, nem aviso: objeto não é transferable

// certo: ou copia, ou embrulha explicitamente.
await context.global.set('time', team, { copy: true })
// porquê: a seção api-documentation do README é clara — só primitivo (exceto
// Symbol) atravessa por padrão; objeto sem Reference/ExternalCopy/copy some.
```

#### examples
[doc](https://github.com/laverdet/isolated-vm#examples)

**O que é:** o programa de exemplo do README: cria isolate com 128 MB, cria contexto, expõe `global`
e uma função `log`, e então roda um script hostil que aloca memória em loop.
**Para que serve:** ver o ciclo completo e, principalmente, ver o limite de memória agindo.
**Quando usar:** como primeiro código a rodar. O desfecho é o que interessa: o script hostil imprime
o consumo subindo até passar do teto e morre com `RangeError: Array buffer allocation failed`, em
vez de derrubar o processo. Note que o exemplo usa `run` assíncrono de propósito — é o que permite
as chamadas de `log` chegarem ao isolate principal enquanto o script roda.

```ts
import ivm from 'isolated-vm'

const isolate = new ivm.Isolate({ memoryLimit: 128 })
const context = isolate.createContextSync()
const jail = context.global

// `global` não existe sozinho dentro do contexto: derefInto o publica lá.
jail.setSync('global', jail.derefInto())
jail.setSync('log', (...args: unknown[]) => console.log(...args))

const hostil = isolate.compileScriptSync(`
  const storage = []
  while (true) {
    const array = new Uint8Array(1024 * 1024 * 2)
    for (let i = 0; i < array.length; i += 4096) array[i] = 1
    storage.push(array)
    log('gastei ' + storage.length * 2 + 'MB')
  }
`)

hostil.run(context).catch((err) => console.error(err))
// gastei 2MB ... gastei 132MB
// RangeError: Array buffer allocation failed  <- o isolate morre, o processo vive
```

## Isolate e limites de recurso

#### class-isolate-transferable
[doc](https://github.com/laverdet/isolated-vm#class-isolate-transferable)

**O que é:** a classe principal. Um isolate vive enquanto alguém segurar um handle dele ou de algo
criado dentro dele; perdido o handle, o garbage collector eventualmente o recolhe.
**Para que serve:** a unidade de isolamento — heap próprio, GC próprio, nenhum objeto em comum.
**Quando usar:** sempre, é o ponto de entrada. A decisão de projeto que vem junto: um isolate por
requisição (caro, mas zera o estado), ou um pool de isolates reaproveitados (rápido, mas o estado de
uma execução sobrevive para a próxima e vira canal lateral entre inquilinos). Em multi-tenant, um
isolate por tenant é o mínimo defensável.

```ts
import ivm from 'isolated-vm'

// básico — o handle é transferable: dá para dar a um isolate a referência de outro.
const isolate = new ivm.Isolate({ memoryLimit: 128 })

try {
  const context = await isolate.createContext()
  await context.eval('1 + 1', { timeout: 50 })
} finally {
  // Um isolate representa um pedaço grande de memória. Não espere o GC.
  isolate.dispose()
}
```

```ts
// caso real da stack — um isolate por execução, descartado no fim; é a
// decisão de projeto citada no "Quando usar": caro, mas zera o estado entre
// tenants.
@Service()
export default class VmRunnerService {
  async run(code: string, timeout: number): Promise<Either<HTTPException, void>> {
    const isolate = new ivm.Isolate({ memoryLimit: 128 })
    try {
      const context = await isolate.createContext()
      const script = await isolate.compileScript(code)
      await script.run(context, { timeout, promise: true })
      return right(undefined)
    } finally {
      isolate.dispose()
    }
  }
}
```

```ts
// armadilha
// errado: reaproveitar isolate entre tenants sem política de cota — o
// estado da execução anterior é canal lateral para a próxima.
const isolatePool: Array<ivm.Isolate> = []
const isolate = isolatePool.pop() ?? new ivm.Isolate({ memoryLimit: 128 })

// certo: um isolate por fronteira de confiança (por tenant, no mínimo).
const isolatePorTenant = new Map<string, ivm.Isolate>()
const deste = isolatePorTenant.get(team.id) ?? new ivm.Isolate({ memoryLimit: 128 })
isolatePorTenant.set(team.id, deste)
// porquê: pool compartilhado entre inquilinos vaza estado; isolate por
// tenant é "o mínimo defensável" segundo esta mesma seção do doc.
```

#### new ivm.Isolate(options)
[doc](https://github.com/laverdet/isolated-vm#new-ivmisolateoptions)

**O que é:** o construtor e todas as suas opções: `memoryLimit`, `inspector`, `snapshot`,
`onCatastrophicError`, `onUnhandledRejection` e `importModuleDynamically`.
**Para que serve:** é aqui que se define o teto de memória e o comportamento em falha.
**Quando usar:** em toda criação de isolate. O aviso que muda o cálculo de capacidade:
`memoryLimit` é em MB, o padrão é 128, o mínimo é 8, e o README diz explicitamente que é **mais uma
diretriz do que um limite estrito** — um atacante determinado consegue usar 2 a 3 vezes esse valor
antes de o script ser terminado. Dimensione o container por `3 × memoryLimit × isolates
simultâneos`, não por `1 ×`.

```ts
import ivm from 'isolated-vm'

// básico — as opções do construtor, como o README as lista.
const isolate = new ivm.Isolate({
  memoryLimit: 32,
  onCatastrophicError: (erro) => {
    console.error('catastrófico', erro)
    pararDeServir()
    process.abort()
  },
  onUnhandledRejection: (valor) => console.warn('rejeição sem handler', valor),
})
```

```ts
// caso real da stack — teto fixo por execução, lido de uma constante, nunca
// do payload do usuário.
const MEMORY_LIMIT_MB = 128

@Service()
export default class VmRunnerService {
  async run(code: string): Promise<Either<HTTPException, void>> {
    const isolate = new ivm.Isolate({ memoryLimit: MEMORY_LIMIT_MB })
    try {
      await isolate.compileScript(code)
      return right(undefined)
    } finally {
      isolate.dispose()
    }
  }
}
```

```ts
// armadilha
// errado: teto vindo do payload do usuário — ele escolhe o próprio limite.
const isolate = new ivm.Isolate({ memoryLimit: payload.memoryLimit })

// certo: constante do servidor, dimensionada para o container.
const isolate2 = new ivm.Isolate({ memoryLimit: MEMORY_LIMIT_MB })
// porquê: o README avisa que memoryLimit é "mais diretriz que limite estrito"
// — um atacante já consegue 2-3x o valor; deixá-lo escolher o valor é
// dimensionar o container para o atacante.
```

#### isolate.dispose()
[doc](https://github.com/laverdet/isolated-vm#isolatedispose)

**O que é:** destrói o isolate e invalida todas as referências obtidas dele.
**Para que serve:** devolver a memória imediatamente, em vez de esperar o coletor.
**Quando usar:** **sempre, em `finally`**. O README é claro em recomendar o `dispose` explícito
justamente porque um isolate com tudo dentro pode ser um bloco grande de memória. Em servidor sob
carga, deixar isso para o GC é a diferença entre uso de memória estável e crescimento contínuo.
`isolate.isDisposed` diz se já foi descartado.

```ts
// básico
async function executarUmaVez(codigo: string) {
  const isolate = new ivm.Isolate({ memoryLimit: 32 })
  try {
    const context = await isolate.createContext()
    return await context.eval(codigo, { timeout: 100 })
  } finally {
    // Invalida contexto, scripts e references deste isolate de uma vez.
    if (!isolate.isDisposed) isolate.dispose()
  }
}
```

```ts
// caso real da stack — dispose "que nunca lança", porque o isolate pode já
// ter morrido sozinho (watchdog de timeout, estouro de memória).
@Service()
export default class VmRunnerService {
  private disposeQuietly(isolate: ivm.Isolate): void {
    if (isolate.isDisposed) return
    try {
      isolate.dispose()
    } catch {
      // corrida com o próprio isolated-vm; nada a desfazer aqui
    }
  }

  async run(code: string): Promise<Either<HTTPException, void>> {
    const isolate = new ivm.Isolate({ memoryLimit: 128 })
    try {
      await isolate.compileScript(code)
      return right(undefined)
    } finally {
      this.disposeQuietly(isolate)
    }
  }
}
```

```ts
// armadilha
// errado: dispose só no caminho feliz — se compileScript lançar, vaza.
const isolate = new ivm.Isolate({ memoryLimit: 32 })
await isolate.compileScript(codigo)
isolate.dispose()

// certo: sempre em finally, protegido contra isolate já descartado.
const isolate2 = new ivm.Isolate({ memoryLimit: 32 })
try {
  await isolate2.compileScript(codigo)
} finally {
  if (!isolate2.isDisposed) isolate2.dispose()
}
// porquê: um isolate é um bloco grande de memória; sem dispose explícito em
// finally, cada erro deixa memória esperando um GC que não é imediato.
```

#### isolate.getHeapStatistics()
[doc](https://github.com/laverdet/isolated-vm#isolategetheapstatistics-promise)

**O que é:** as estatísticas de heap do V8 para aquele isolate, quase idênticas às de
`v8.getHeapStatistics()` do Node.js, mais uma propriedade exclusiva: `externally_allocated_size`.
**Para que serve:** observabilidade por isolate, não por processo.
**Quando usar:** para métrica e para decidir reciclar um isolate de pool antes que ele estoure. A
propriedade extra é a que evita diagnóstico errado: ela é a memória alocada **fora** do heap do V8
que ainda assim conta contra o `memoryLimit` — `ArrayBuffer` acima de certo tamanho cai aí, e some
das estatísticas normais de heap.

```ts
const stats = await isolate.getHeapStatistics()

// used_heap_size sozinho MENTE quando o código aloca ArrayBuffers grandes.
const usadoMb = (stats.used_heap_size + stats.externally_allocated_size) / 1024 / 1024

if (usadoMb > limiteMb * 0.8) {
  // isolate de pool perto do teto: recicle antes de aceitar novo trabalho
  isolate.dispose()
}
```

#### isolate.cpuTime / isolate.wallTime
[doc](https://github.com/laverdet/isolated-vm#isolatecputime-bigint)

**O que é:** duas propriedades `bigint` com o total de CPU e de wall time gastos naquele isolate, em
**nanossegundos**.
**Para que serve:** cobrar, limitar ou desligar inquilino por consumo real, e distinguir "está
calculando" de "está esperando".
**Quando usar:** em qualquer execução multi-tenant. A diferença entre os dois é o diagnóstico: CPU
time é tempo ativo na CPU; wall time inclui a espera passiva — se o isolate chama outro isolate, o
wall sobe e o CPU não. Duas ressalvas do README: em Node 10.x o retorno é `number` comum, e o CPU
time varia muito sob contenção, inclusive quando há mais isolates trabalhando do que
`os.cpus().length`.

```ts
const antesCpu = isolate.cpuTime
const antesWall = isolate.wallTime

await script.run(context, { timeout: 1_000 })

const cpuMs = Number(isolate.cpuTime - antesCpu) / 1e6
const wallMs = Number(isolate.wallTime - antesWall) / 1e6

// wall >> cpu significa espera (chamada ao host, outro isolate), não cálculo.
// cpu ~= wall com números altos significa loop apertado: candidato a cota.
registrarConsumo({ tenant, cpuMs, wallMs })
```

#### isolate.referenceCount
[doc](https://github.com/laverdet/isolated-vm#isolatereferencecount-number)

**O que é:** a contagem de instâncias de `Reference` ativas pertencentes ao isolate, incluindo os
handles internos criados pela própria biblioteca para `Script` e `Context`.
**Para que serve:** detectar vazamento de referência, que é o vazamento mais comum aqui.
**Quando usar:** em teste e em métrica de longa duração. Se o número cresce a cada requisição e nunca
volta, falta `release()` em algum lugar. Note que várias instâncias de `Reference` em JavaScript
podem apontar para o mesmo handle subjacente — o número reflete o handle, não o objeto JS.

```ts
// Em teste: a contagem depois tem que voltar ao valor de antes.
const antes = isolate.referenceCount
await executarRegra(context, codigoDoUsuario)
expect(isolate.referenceCount).toBe(antes) // se crescer, faltou release()
```

#### ivm.Isolate.createSnapshot(scripts, warmup_script)
[doc](https://github.com/laverdet/isolated-vm#ivmisolatecreatesnapshotscripts-warmup_script)

**O que é:** cria um snapshot do heap a partir de scripts de preparação, para inicializar isolates
novos já com o ambiente montado, sem reexecutar o setup.
**Para que serve:** economizar o custo de bootstrap quando se criam muitos isolates.
**Quando usar:** **não use**. O README traz um 🚨 e diz que o recurso nunca foi muito estável e ficou
mais instável com as mudanças do V8. Além disso, `createSnapshot` **não tem a proteção de isolate do
resto da biblioteca**: se o script de snapshot usar memória demais o processo *quebra*, e se tiver
loop infinito o processo *trava*. E o aviso de segurança que fecha o assunto: snapshot contém
**código de máquina compilado**, então aceitar um snapshot vindo de usuário é aceitar execução
arbitrária de código.

```ts
// básico — a assinatura do README: lista de scripts de boot + warmup opcional.
const snapshot = ivm.Isolate.createSnapshot([
  { code: 'function helper(x) { return x * 2 }', filename: 'file:///boot.js' },
])
const isolate = new ivm.Isolate({ snapshot, memoryLimit: 64 })
```

```ts
// caso real da stack — a alternativa estável que o runner usa: compila o
// bootstrap de novo em cada execução, dentro do isolate já com memoryLimit.
// Custa mais que snapshot, mas nunca trava o processo.
@Service()
export default class VmRunnerService {
  async run(code: string): Promise<Either<HTTPException, void>> {
    const isolate = new ivm.Isolate({ memoryLimit: 128 }) // sem snapshot
    const context = await isolate.createContext()
    await context.eval(BOOTSTRAP_PREFIX + BOOTSTRAP_SUFFIX)
    const script = await isolate.compileScript(code)
    await script.run(context, { timeout: 100 })
    return right(undefined)
  }
}
```

```ts
// armadilha
// errado: snapshot construído a partir de dado do usuário, ou aceito pronto.
const snapshotHostil = new ivm.ExternalCopy(bufferVindoDoUsuario)
const isolate = new ivm.Isolate({ snapshot: snapshotHostil })

// certo: nem aceitar snapshot de fora, nem usar o recurso em produção.
const isolate2 = new ivm.Isolate({ memoryLimit: 64 }) // sem snapshot
// porquê: snapshot contém código de máquina compilado — aceitar um vindo de
// fora é execução arbitrária, e o próprio README marca o recurso com 🚨.
```

## Contexto e execução de código

#### class-context-transferable
[doc](https://github.com/laverdet/isolated-vm#class-context-transferable)

**O que é:** o ambiente de execução dentro de um isolate. Cada contexto tem a **própria cópia de
todos os objetos embutidos** e o próprio espaço global.
**Para que serve:** separar execuções dentro de um mesmo isolate sem pagar o preço de um isolate
novo.
**Quando usar:** um contexto por execução, um isolate por fronteira de confiança. O exemplo que o
README dá é preciso: se um contexto faz `Object.prototype.foo = 1`, nenhum outro contexto é afetado.
Mas contextos do mesmo isolate **dividem o heap e o `memoryLimit`** — o que separa consumo de memória
é o isolate, não o contexto.

```ts
// básico
const isolate = new ivm.Isolate({ memoryLimit: 64 })

const a = await isolate.createContext()
const b = await isolate.createContext()

await a.eval('Object.prototype.poluido = 1')
await b.eval('({}).poluido')  // undefined — builtins são próprios de cada contexto

// Mas o teto de 64MB é dos DOIS somados: contexto não isola memória.
```

```ts
// caso real da stack — um contexto por execução, dentro do isolate criado
// para aquela chamada ao sandbox.
@Service()
export default class VmRunnerService {
  async run(code: string, timeout: number): Promise<Either<HTTPException, void>> {
    const isolate = new ivm.Isolate({ memoryLimit: 128 })
    try {
      const context = await isolate.createContext() // um contexto, uma execução
      const script = await isolate.compileScript(code)
      await script.run(context, { timeout, promise: true })
      return right(undefined)
    } finally {
      isolate.dispose()
    }
  }
}
```

```ts
// armadilha
// errado: achar que criar um contexto novo por request limita a memória.
const context = await isolate.createContext() // mesmo isolate, mesmo heap

// certo: para isolar memória entre tenants, o isolate precisa ser outro.
const isolateDoTenant = new ivm.Isolate({ memoryLimit: 64 })
const contextDoTenant = await isolateDoTenant.createContext()
// porquê: contexto separa globais e builtins, não heap — o memoryLimit é do
// isolate e é compartilhado por todos os contextos dentro dele.
```

#### context.global
[doc](https://github.com/laverdet/isolated-vm#contextglobal-reference)

**O que é:** uma `Reference` para o objeto global daquele contexto.
**Para que serve:** é o único canal por onde algo do lado Node.js aparece dentro do isolate.
**Quando usar:** em todo setup. Duas coisas que economizam depuração: o global do isolate **não tem
uma propriedade `global` apontando para ele mesmo** até você publicá-la com `derefInto()`; e
`context.release()` libera junto a referência do global. A regra de segurança se concentra aqui —
tudo o que você põe no global é exatamente, e apenas, a API que o código hostil recebe.

```ts
// básico — o idioma canônico do README.
const jail = context.global
await jail.set('global', jail.derefInto())
await jail.set('agora', () => Date.now())
```

```ts
// caso real da stack — cada API do sandbox entra como Callback (síncrona) ou
// Reference (assíncrona), nunca a função do host direto.
@Service()
export default class VmRunnerService {
  private bindSync(fn: (...args: ReadonlyArray<unknown>) => unknown) {
    return (...args: ReadonlyArray<unknown>): unknown => fn(...args)
  }

  async bridge(context: ivm.Context, team: Team): Promise<void> {
    await context.global.set(
      '__lcjs_team',
      new ivm.Callback(this.bindSync(() => ({ id: team.id, name: team.name })), {
        sync: true,
      }),
    )
  }
}
```

```ts
// armadilha
// errado: expor uma função do host com acesso livre à rede ou ao disco.
await jail.set('buscar', fetch)                      // SSRF de graça
await jail.set('lerArquivo', (p: string) => read(p)) // path traversal de graça

// certo: delegado seu, com política explícita.
await jail.set('buscarPreco', async (sku: string) => catalogo.precoDe(sku))
// porquê: tudo que entra no global É a API que o código hostil recebe —
// função alheia (fetch, fs) carrega a própria superfície de ataque.
```

#### context.eval(code, options)
[doc](https://github.com/laverdet/isolated-vm#contextevalcode-options-promise)

**O que é:** compila e executa um script no contexto, devolvendo o último valor avaliado — desde que
seja transferable; caso contrário devolve `undefined`. Tem as formas `eval`, `evalSync` e
`evalIgnored`.
**Para que serve:** o caminho mais curto do código à execução.
**Quando usar:** para execução única. **Sempre com `timeout`**: a opção existe, é em milissegundos, e
o padrão é **sem timeout nenhum** — um `while(true)` sem timeout prende a thread daquele isolate
indefinidamente. Aceita também `ScriptOrigin` e `TransferOptions`.

```ts
// básico — a assinatura do README: código, options com timeout e filename.
const valor = await context.eval('1 + 1', { timeout: 100 })
await context.eval(codigo, { timeout: 100, filename: 'file:///regra-42.js' })
```

```ts
// caso real da stack — context.eval roda o bootstrap que publica as APIs do
// sandbox no global, antes do script do usuário compilar.
@Service()
export default class VmRunnerService {
  async bridge(context: ivm.Context, lines: ReadonlyArray<string>): Promise<void> {
    await context.eval(BOOTSTRAP_PREFIX + lines.join('\n') + BOOTSTRAP_SUFFIX, {
      timeout: 1_000,
      filename: 'file:///bootstrap.js',
    })
  }
}
```

```ts
// armadilha
// errado: sem timeout, o default do README é NENHUM — um while(true) trava.
await context.eval('while(true){}')

// certo: timeout sempre, e retorno não transferable precisa de copy explícito.
await context.eval('while(true){}', { timeout: 100 })
await context.eval('({ a: 1 })', { copy: true }) // sem copy, vira undefined
// porquê: o padrão silencioso (sem timeout, sem copy) é a armadilha central
// do README — "pode ignorar, lançar ou embrulhar", nunca avisa sozinho.
```

#### context.evalClosure(code, arguments, options)
[doc](https://github.com/laverdet/isolated-vm#contextevalclosurecode-arguments-options-promise)

**O que é:** compila e roda o código **como se estivesse dentro de uma função**, parecido com `new
Function(code)`. Os argumentos ficam disponíveis como `$0`, `$1` e assim por diante, e o código pode
usar `return`.
**Para que serve:** passar dado para dentro sem poluir o global, e receber um valor de volta.
**Quando usar:** quando a execução precisa de entrada variável — o caso típico de "rode esta fórmula
do usuário sobre esta linha de dados". As `TransferOptions` são declaradas separadamente para
`arguments` e para `result`, o que permite copiar a entrada e referenciar a saída, ou o contrário.

```ts
const linha = { preco: 100, desconto: 0.1 }

const total = await context.evalClosure(
  'return $0.preco * (1 - $0.desconto)',
  [linha],
  {
    timeout: 50,
    arguments: { copy: true },  // a entrada entra como cópia profunda
    result: { copy: true },     // a saída volta como cópia, não como Reference
  },
)
// total === 90 — e nada disso encostou no objeto global do contexto
```

#### isolate.compileScript(code)
[doc](https://github.com/laverdet/isolated-vm#isolatecompilescriptcode-promise)

**O que é:** compila código-fonte e devolve um `Script`, aceitando `CachedDataOptions` e
`ScriptOrigin`.
**Para que serve:** separar o custo de compilação do custo de execução.
**Quando usar:** sempre que o mesmo código rodar mais de uma vez — regra de negócio salva, hook de
extensão, template. Compile uma vez, guarde o `Script`, rode em muitos contextos. A restrição que
delimita o desenho do pool: **um `Script` só roda no isolate que o criou**; ele atravessa contextos,
não isolates.

```ts
// básico — compila e devolve um Script, pronto para rodar em um contexto.
const script = await isolate.compileScript('1 + 1', { filename: 'file:///t.js' })
await script.run(await isolate.createContext(), { timeout: 100 })
```

```ts
// caso real da stack — compilado uma vez por execução, dentro do isolate
// que acabou de ser criado para aquele script de usuário.
@Service()
export default class VmRunnerService {
  async run(code: string, timeout: number): Promise<Either<HTTPException, void>> {
    const isolate = new ivm.Isolate({ memoryLimit: 128 })
    const context = await isolate.createContext()
    const script = await isolate.compileScript(code, { filename: 'user-script.js' })
    await script.run(context, { timeout, promise: true })
    return right(undefined)
  }
}
```

```ts
// armadilha
// errado: outro isolate não aceita o Script de outro — cache por código só,
// sem chavear por isolate, estoura em runtime.
const cache = new Map<string, ivm.Script>()
const compiladoEmA = await isolateA.compileScript(codigo)
cache.set(codigo, compiladoEmA)
await compiladoEmA.run(await isolateB.createContext(), { timeout: 50 })

// certo: chavear por isolate, não só pelo código.
const cachePorIsolate = new WeakMap<ivm.Isolate, Map<string, ivm.Script>>()
// porquê: "um Script só roda no isolate que o criou" — ele atravessa
// contextos do mesmo isolate, nunca isolates diferentes.
```

#### class-script-transferable
[doc](https://github.com/laverdet/isolated-vm#class-script-transferable)

**O que é:** um pedaço de JavaScript já compilado, que pode ser executado em qualquer contexto
**dentro de um único isolate**.
**Para que serve:** reaproveitar a compilação entre execuções.
**Quando usar:** ao montar cache de código. O `script.release()` libera os dados do script para
coleta, e o README esclarece o que ele **não** desfaz: funções e dados já criados por invocações
anteriores de `run` continuam vivos nos respectivos contextos — o release só impede novas chamadas de
`run` por aquela referência.

```ts
// básico — a classe em si: produto de compileScript, roda em contextos do
// mesmo isolate.
const script = await isolate.compileScript('1 + 1')
await script.run(context, { timeout: 100 })
script.release() // libera os dados do script para coleta
```

```ts
// caso real da stack — cache de Script tem que ser chaveado pelo isolate,
// não só pelo código, porque a validade é por isolate.
const cache = new WeakMap<ivm.Isolate, Map<string, ivm.Script>>()

async function obterScript(isolate: ivm.Isolate, codigo: string) {
  const porIsolate = cache.get(isolate) ?? new Map()
  cache.set(isolate, porIsolate)

  const existente = porIsolate.get(codigo)
  if (existente) return existente

  const script = await isolate.compileScript(codigo)
  porIsolate.set(codigo, script)
  return script
}
```

```ts
// armadilha
// errado: chamar script.release() e achar que invalidou o que já rodou.
const script2 = await isolate.compileScript('globalThis.x = 1')
await script2.run(context, { timeout: 50 })
script2.release()
await context.eval('x') // ainda 1 — release não desfaz efeito já aplicado

// certo: release só impede NOVAS chamadas de run por aquela referência.
// porquê: dado e função já criados em execuções anteriores continuam vivos
// no contexto; release é sobre compilação, não sobre efeito colateral.
```

#### script.run(context, options)
[doc](https://github.com/laverdet/isolated-vm#scriptruncontext-options-promise)

**O que é:** executa o script compilado em um contexto, devolvendo a última expressão avaliada se ela
for transferable. Existe em `run`, `runSync` e `runIgnored`.
**Para que serve:** a execução em si.
**Quando usar:** em toda execução repetida. Opções: `timeout` (mesma regra — o padrão é **nenhum**) e
`release`, que chama `release()` no `Script` automaticamente ao terminar, útil para código de uso
único. O exemplo do README explica o retorno: com `let foo = 1; let bar = 2; bar = foo + bar`, o
retorno é `3`, porque é a última expressão.

```ts
// básico — execução única, release automático, sem ter que lembrar depois.
const resultado = await script.run(context, { timeout: 200, release: true })
```

```ts
// caso real da stack — mesma chamada do runner: timeout obrigatório e
// promise:true para que a rejeição do código do usuário não vire sucesso.
const script2 = await isolate.compileScript(code, { filename: 'user-script.js' })
await script2.run(context, { timeout, promise: true })
```

```ts
// armadilha
// errado: runSync em servidor sob carga — bloqueia o event loop do processo
// inteiro, não só do isolate.
const resultado2 = script2.runSync(context, { timeout: 200 })

// certo: a forma async, que deixa chamadas ao host chegarem durante a execução.
const resultado3 = await script2.run(context, { timeout: 200 })
// porquê: runSync serve para o isolate PADRÃO (o do próprio Node.js); num
// isolate de usuário, em servidor, é a thread do processo que trava.
```

## Módulos ESM

#### isolate.compileModule(code)
[doc](https://github.com/laverdet/isolated-vm#isolatecompilemodulecode-promise)

**O que é:** compila código como módulo ESM e devolve um `Module`. Aceita `CachedDataOptions`,
`ScriptOrigin` e um callback `meta`, invocado na primeira vez que o módulo acessa `import.meta`.
**Para que serve:** executar código do usuário escrito com `import`/`export`.
**Quando usar:** quando o formato de entrada é módulo, não script. Duas restrições: o `Module` só
roda no isolate que o criou, e a opção `meta` só pode ser usada quando `compileModule` é chamado de
dentro do **mesmo isolate**. Para `import()` dinâmico, quem resolve é o `importModuleDynamically`
passado ao construtor do `Isolate` — sem ele, `import()` rejeita com "Not supported".

```ts
const modulo = await isolate.compileModule(
  'import { dobro } from "./util"; export const r = dobro(21)',
  { filename: 'file:///regra.js' },
)

// Quais dependências ele pede, antes de instanciar:
modulo.dependencySpecifiers // ["./util"]
```

#### class-module-transferable
[doc](https://github.com/laverdet/isolated-vm#class-module-transferable)

**O que é:** um módulo JavaScript, com `dependencySpecifiers` (array somente leitura dos
especificadores que ele importa), `namespace` (uma `Reference` com todos os valores exportados),
`instantiate`, `evaluate` e `release`.
**Para que serve:** o ciclo de vida de módulo — compilar, resolver dependências, instanciar, avaliar.
**Quando usar:** ao aceitar código com `import`. `dependencySpecifiers` é a peça de segurança mais
útil aqui: dá para inspecionar o que o módulo quer importar **antes** de instanciar qualquer coisa, e
recusar o que não estiver na lista permitida.

```ts
const PERMITIDOS = new Set(['./util', './math'])

const modulo = await isolate.compileModule(codigoDoUsuario)

// Barrar por lista de permissão ANTES de instanciar.
for (const spec of modulo.dependencySpecifiers) {
  if (!PERMITIDOS.has(spec)) throw new Error(`import não permitido: ${spec}`)
}

await modulo.instantiate(context, async (spec) => modulosPreCompilados.get(spec)!)
await modulo.evaluate({ timeout: 100, promise: true })

// namespace é uma Reference com os exports — não é um objeto comum.
const r = await modulo.namespace.get('r', { copy: true })
```

#### module.evaluate(options)
[doc](https://github.com/laverdet/isolated-vm#moduleevaluateoptions-promise)

**O que é:** avalia o módulo e devolve a última expressão, como `script.run`. Opções: `timeout` e
`promise`.
**Para que serve:** executar o módulo já instanciado.
**Quando usar:** com `promise: true` sempre que o código puder usar **top-level await**. O README é
explícito: o Node.js 14.8.0 ligou top-level await por padrão, e isso quebra o valor de retorno desta
função. Com `promise: true` a chamada espera o módulo terminar — mas o valor resolvido continua sendo
`undefined`, porque o V8 cumpre a promise de avaliação sem valor. Note ainda que `timeout` cobre
**só até o primeiro yield**, e que chamar `evaluate` mais de uma vez devolve (ou relança) o resultado
da primeira chamada.

```ts
// básico — a assinatura do README: options com timeout e promise.
await modulo.evaluate({ timeout: 100, promise: true })
const saida = await modulo.namespace.get('resultado', { copy: true })
```

```ts
// caso real da stack — módulo do usuário com lista de import permitida,
// avaliado com promise:true porque o código pode ter top-level await.
@Service()
export default class VmModuleRunnerService {
  async run(code: string, team: Team): Promise<Either<HTTPException, unknown>> {
    const isolate = new ivm.Isolate({ memoryLimit: 128 })
    const context = await isolate.createContext()
    const modulo = await isolate.compileModule(code)
    await modulo.instantiate(context, async () => {
      throw new Error('import não permitido')
    })
    await modulo.evaluate({ timeout: 200, promise: true })
    const saida = await modulo.namespace.get('resultado', { copy: true })
    return right(saida)
  }
}
```

```ts
// armadilha
// errado: sem promise:true, o retorno chega antes do top-level await
// terminar — o erro do módulo vaza depois, numa chamada sem relação nenhuma.
await modulo.evaluate({ timeout: 100 })

// certo: promise:true espera o módulo terminar de fato.
await modulo.evaluate({ timeout: 100, promise: true })
// porquê: Node 14.8+ liga top-level await por padrão; sem promise:true o
// valor de retorno desta função já nasce quebrado para esse caso.
```

## A fronteira de transferência

#### transferoptions
[doc](https://github.com/laverdet/isolated-vm#transferoptions)

**O que é:** as quatro opções aceitas por qualquer função que mova dado entre isolates: `copy`
(cópia profunda automática), `externalCopy` (embrulha em `ExternalCopy`), `reference` (embrulha em
`Reference`) e `promise` (faz proxy automático de promises devolvidas, combinável com as outras).
**Para que serve:** dizer **como** o valor atravessa, já que por padrão só o que é transferable
passa.
**Quando usar:** em toda chamada que cruze a fronteira. O comportamento sem opção nenhuma é a
armadilha central da biblioteca: o README diz que a função pode **ignorar o valor, lançar, ou
embrulhar em referência, dependendo do contexto**. Ou seja, o modo silencioso é um dos possíveis —
seja explícito sempre.

```ts
// básico — copy, o caso normal: cópia profunda, cara para objeto grande.
await context.eval('({ a: 1 })')                  // undefined — sem opção, some
await context.eval('({ a: 1 })', { copy: true })  // { a: 1 }
```

```ts
// caso real da stack — argumento e retorno de toda API assíncrona do sandbox
// atravessam com as mesmas TransferOptions, nos dois sentidos.
const APPLY_OPTIONS = {
  arguments: { copy: true },
  result: { copy: true, promise: true }, // promise: espera a função async
} as const

await reference.apply(undefined, [payload], APPLY_OPTIONS)
```

```ts
// armadilha
// errado: função assíncrona sem `promise`, atravessa como Promise inútil —
// o chamador do outro lado recebe um objeto vazio, nunca o valor resolvido.
await ref.apply(undefined, [], { result: { copy: true } })

// certo: promise:true faz o proxy esperar a resolução de fato.
await ref.apply(undefined, [], { result: { copy: true, promise: true } })
// porquê: sem opção nenhuma a função "pode ignorar o valor, lançar, ou
// embrulhar em referência" — o modo silencioso é um dos comportamentos.
```

#### class-reference-transferable
[doc](https://github.com/laverdet/isolated-vm#class-reference-transferable)

**O que é:** um ponteiro para um valor guardado em **qualquer** isolate. Tem `typeof` (legível de
qualquer isolate a qualquer momento), `copy`, `deref`, `derefInto`, `release`, e a família
`get`/`set`/`delete`/`apply`.
**Para que serve:** trabalhar com um valor do outro lado sem copiá-lo.
**Quando usar:** quando copiar é caro ou impossível. Duas pegadinhas: `reference.typeof` **difere**
do operador `typeof` real — `null` é `"null"` e `Symbol` é `"object"`; e a opção `unsafeInherit` do
construtor, que faz a família `get` seguir a cadeia de protótipos, vem com o aviso de que referências
criadas assim **nunca devem ser dadas a código não confiável**.

```ts
import ivm from 'isolated-vm'

// Uma Reference não move o valor: ela aponta para ele, onde quer que esteja.
const ref = new ivm.Reference({ pesado: new Array(1_000_000).fill(0) })

ref.typeof // "object"  — cuidado: null aqui é "null", Symbol é "object"

// NUNCA para código não confiável: segue prototype chain, ou seja, entrega
// Object.prototype.constructor e tudo que vem depois.
// new ivm.Reference(alvo, { unsafeInherit: true })
```

```ts
// caso real da stack — o retorno do delegado async do sandbox vira
// Reference, embrulhado pelo AsyncLocalStorage para não perder o contexto
// de request; o script lá dentro só vê uma função comum.
@Service()
export default class VmRunnerService {
  async bridge(context: ivm.Context, buscarTeam: () => Promise<Team>): Promise<void> {
    await context.global.set(
      '__lcjs_0',
      new ivm.Reference(AsyncLocalStorage.bind(buscarTeam)),
    )
  }
}
```

```ts
// armadilha
// errado: criar a Reference com unsafeInherit e entregá-la ao script hostil.
const refPerigosa = new ivm.Reference(configDoHost, { unsafeInherit: true })
await jail.set('config', refPerigosa)

// certo: sem unsafeInherit, e comparando typeof com cuidado.
const ref2 = new ivm.Reference(configDoHost)
if (ref2.typeof === 'undefined') throw new Error('config ausente')
// porquê: unsafeInherit segue a cadeia de protótipos — entrega
// Object.prototype.constructor e tudo o que vem depois ao código hostil.
```

#### reference.derefInto()
[doc](https://github.com/laverdet/isolated-vm#referencederefinto)

**O que é:** devolve um objeto que, ao ser passado a outro isolate, faz **aquele** isolate
desreferenciar o handle. O irmão `deref()` devolve o valor real, mas só pode ser chamado se a
referência pertencer ao isolate atual.
**Para que serve:** entregar o valor em si, e não o embrulho `Reference`, do outro lado da fronteira.
**Quando usar:** no idioma `jail.set('global', jail.derefInto())`, e sempre que o código de dentro
precisar receber o objeto, não um ponteiro para ele. Os dois aceitam `release: true`, que libera a
referência na mesma operação.

```ts
// Sem derefInto: lá dentro `global` seria um objeto Reference, não o global.
await jail.set('global', jail.derefInto())

// deref() exige que a referência seja do isolate ATUAL; senão, lança.
const valor = ref.deref({ release: true })

// derefInto com release: entrega e libera em um passo só.
await jail.set('config', refDaConfig.derefInto({ release: true }))
```

#### reference.apply(receiver, arguments, options)
[doc](https://github.com/laverdet/isolated-vm#referenceapplyreceiver-arguments-options-promise)

**O que é:** invoca o valor referenciado como se fosse função, com `receiver` virando o `this`. Tem
`apply`, `applyIgnored`, `applySync` e o especial `applySyncPromise`. Aceita `timeout` e
`TransferOptions` separadas para `arguments` e `result`.
**Para que serve:** chamar, de um isolate, uma função que vive em outro.
**Quando usar:** para chamar de volta o host, ou para invocar a função que o usuário definiu lá
dentro. Se o retorno for transferable ele volta ao chamador; senão, volta como `Reference` — e isso
se controla pelas opções de `result`. O `applySyncPromise` é o caso especial: só pode ser invocado em
funções do isolate **padrão** e só a partir de uma thread **não** padrão; a função pode devolver uma
promise e o isolate chamador espera por ela. Serve para implementar coisas no estilo `readFileSync`
sem bloquear o isolate padrão — mas o isolate chamador deixa de responder a funções assíncronas até a
promise resolver, e o uso errado **trava isolates em deadlock** (o isolate padrão, esse, nunca corre
o risco).

```ts
// básico — a assinatura do README: receiver, arguments, options.
const fn = await context.global.get('handler', { reference: true })
const saida = await fn.apply(undefined, [payload], {
  timeout: 100,
  arguments: { copy: true },
  result: { copy: true, promise: true }, // promise: espera handler assíncrono
})
```

```ts
// caso real da stack — o bootstrap do isolate chama de volta o Reference
// do host para toda API assíncrona; é o próprio `link` do runner.
const BOOTSTRAP = `
  const link = (reference) => (...args) =>
    reference.apply(undefined, args, {
      arguments: { copy: true },
      result: { copy: true, promise: true },
    }).then((resultado) => {
      if (resultado.ok) return resultado.value
      throw new Error(resultado.message)
    })
`
```

```ts
// armadilha
// errado: sem timeout, uma função do host que nunca responde trava a espera.
await fn.apply(undefined, [payload], { result: { copy: true } })

// certo: timeout sempre, e arguments/result explícitos.
await fn.apply(undefined, [payload], {
  timeout: 100,
  arguments: { copy: true },
  result: { copy: true, promise: true },
})
// porquê: applySyncPromise é ainda mais perigoso — só função do isolate
// PADRÃO, só thread NÃO padrão, e uso errado trava isolates em deadlock.
```

#### reference.release()
[doc](https://github.com/laverdet/isolated-vm#referencerelease)

**O que é:** libera a referência. Depois disso, qualquer acesso a ela lança erro.
**Para que serve:** evitar que isolates fiquem sem memória porque *outros* isolates ainda não
coletaram lixo.
**Quando usar:** **sempre que você criar ou receber uma `Reference` e terminar com ela**. O README
diz o porquê de forma direta: passando muitas referências entre isolates, sem `release` você esbarra
em isolates estourando memória à espera de um GC que é de outro isolate. É o vazamento mais comum de
quem está começando, e `isolate.referenceCount` é o instrumento para flagrá-lo.

```ts
// básico
const fn = await context.global.get('handler', { reference: true })
try {
  return await fn.apply(undefined, [dados], {
    timeout: 100,
    arguments: { copy: true },
    result: { copy: true },
  })
} finally {
  fn.release() // a referência é de OUTRO isolate; o GC daqui não a recolhe
}
```

```ts
// caso real da stack — várias chamadas aceitam `release: true` embutido;
// prefira quando couber, em vez de uma linha extra de release().
await ref.deref({ release: true })
await script.run(context, { timeout: 100, release: true })
await externalCopy.copy({ release: true })
```

```ts
// armadilha
// errado: pegar a Reference e nunca liberar — típico em loop de execuções.
for (const linha of linhas) {
  const fn2 = await context.global.get('handler', { reference: true })
  await fn2.apply(undefined, [linha], { arguments: { copy: true } })
  // fn2 nunca é liberada: isolate.referenceCount só cresce
}

// certo: release em finally, ou o atalho embutido quando a chamada aceita.
for (const linha of linhas) {
  const fn3 = await context.global.get('handler', { reference: true })
  try {
    await fn3.apply(undefined, [linha], { arguments: { copy: true } })
  } finally {
    fn3.release()
  }
}
// porquê: é "o vazamento mais comum de quem está começando" — sem release,
// isolates acumulam memória à espera de um GC que é de outro isolate.
```

#### class-callback-transferable
[doc](https://github.com/laverdet/isolated-vm#class-callback-transferable)

**O que é:** referências cruzadas a funções **simples**. Os argumentos e o retorno são **sempre
copiados**, pelas mesmas regras de `ExternalCopy`, e ao serem transferidos para outro isolate os
callbacks viram funções comuns lá dentro.
**Para que serve:** o jeito mais fácil e mais seguro de expor uma função do host — o README o
descreve exatamente assim, em contraste com a `Reference`, mais flexível.
**Quando usar:** **como padrão** para tudo que você injetar no global. São criados automaticamente
quando você passa funções à maioria das funções da biblioteca, então na prática você já os usa. A
propriedade que importa: como tudo é copiado, o código de dentro nunca recebe um handle vivo para
algo do lado de fora — que é justamente o trampolim contra o qual a seção de segurança avisa.

```ts
// básico
import ivm from 'isolated-vm'

// Isto já cria um Callback por baixo: função vira função comum lá dentro.
await jail.set('agora', () => Date.now())

// Modos: sync (padrão, bloqueia até responder), async (devolve promise na hora),
// ignored (devolve undefined e engole o resultado E as exceções).
const metrica = new ivm.Callback((nome: string) => contador.inc(nome), { ignored: true })
```

```ts
// caso real da stack — toda API síncrona do sandbox entra como Callback
// explícito, em modo sync, com o retorno já aplainado para transferable.
@Service()
export default class VmRunnerService {
  private bindSync(fn: (...args: ReadonlyArray<unknown>) => unknown) {
    return (...args: ReadonlyArray<unknown>): unknown => this.toPlain(fn(...args))
  }

  async bridge(context: ivm.Context, log: (msg: string) => void): Promise<void> {
    await context.global.set(
      '__lcjs_log',
      new ivm.Callback(this.bindSync(log), { sync: true }),
    )
  }

  private toPlain(value: unknown): unknown {
    return value
  }
}
```

```ts
// armadilha
// errado: Callback em modo ignored para algo cujo erro importa — a exceção
// do host some, o código do usuário nunca sabe que falhou.
const salvar = new ivm.Callback(
  (chave: string) => { throw new Error('disco cheio') },
  { ignored: true },
)

// certo: ignored só para telemetria; falha de negócio usa o modo padrão (sync)
// ou a Reference assíncrona, para o erro chegar ao script.
const metrica2 = new ivm.Callback((nome: string) => contador.inc(nome), { ignored: true })
// porquê: ignored "engole o resultado E as exceções" — é para log/métrica,
// nunca para a função cujo sucesso o script precisa confirmar.
```

#### class-externalcopy-transferable
[doc](https://github.com/laverdet/isolated-vm#class-externalcopy-transferable)

**O que é:** um valor guardado **fora de qualquer isolate**, que pode ser copiado rapidamente para
dentro de qualquer um deles sem sincronização de thread extra.
**Para que serve:** o mesmo dado entrando em muitos isolates sem serializar de novo a cada vez.
**Quando usar:** quando o mesmo payload alimenta vários isolates — tabela de referência, catálogo,
configuração. `ExternalCopy.totalExternalSize` é uma propriedade estática com o total de bytes que a
biblioteca alocou fora do V8 por causa dessas instâncias; vale como métrica. Sobre `release()`, o
README relativiza: descartar `ExternalCopy` não é tão importante quanto descartar `Reference`, porque
o V8 limpa bem essas e não há dependência entre isolates.

```ts
import ivm from 'isolated-vm'

// Serializa UMA vez, entra em N isolates.
const catalogo = new ivm.ExternalCopy(tabelaGrande)

for (const isolate of pool) {
  const ctx = await isolate.createContext()
  await ctx.global.set('catalogo', catalogo.copyInto())
}

ivm.ExternalCopy.totalExternalSize // bytes alocados fora do V8 — bom como métrica
```

#### new ivm.ExternalCopy(value, options)
[doc](https://github.com/laverdet/isolated-vm#new-ivmexternalcopyvalue-options)

**O que é:** o construtor, com `transferList` e `transferOut`, e a tabela implícita de como cada tipo
é copiado.
**Para que serve:** saber o que é barato e o que não é.
**Quando usar:** ao mover dado volumoso. As regras: primitivos são copiados como são; `Date` vira
`Date`; `ArrayBuffer`, `TypedArray` e `DataView` vão em formato eficiente; `SharedArrayBuffer` copia
apenas uma **referência à memória existente**, e a partir da primeira passagem a biblioteca assume a
gestão daquele bloco — um `SharedArrayBuffer` "copiado" pode sobreviver ao isolate que o criou. Todo
o resto vai por *structured clone*. A opção `transferOut` abre mão da posse do recurso e completa em
tempo constante, porque não copia nada — vale só para `ArrayBuffer` e `TypedArray`.

```ts
import ivm from 'isolated-vm'

// Buffer grande, sem cópia: transfere a posse, custo constante.
const copia = new ivm.ExternalCopy(bufferDe50Mb, { transferOut: true })
// bufferDe50Mb fica inutilizável aqui a partir de agora — é o ponto

// Do outro lado, transferIn faz o caminho inverso e invalida o handle.
await jail.set('dados', copia.copyInto({ transferIn: true, release: true }))

// ExternalCopy copia objetos com transferables aninhados:
const pacote = new ivm.ExternalCopy({ isolate, context, global: context.global })
```

## Opções compartilhadas

#### cacheddataoptions
[doc](https://github.com/laverdet/isolated-vm#cacheddataoptions)

**O que é:** `cachedData` e `produceCachedData`, aceitos pela maioria das funções que compilam ou
rodam código. O cache pode ser gravado em disco e reusado em **outro processo**, e
`cachedDataRejected` fica `true` se o V8 recusar o dado fornecido.
**Para que serve:** acelerar drasticamente o parsing do mesmo script, segundo o próprio README.
**Quando usar:** quando o mesmo código é compilado muitas vezes, em muitos isolates ou entre
reinícios. Dá para passar `cachedData` e `produceCachedData` juntos: o novo cache só é produzido se o
fornecido for inválido. E o aviso que não pode ser esquecido: **cached data contém código de máquina
compilado** — aceitar `cachedData` de usuário é aceitar execução arbitrária de código.

```ts
// Primeira vez: compila e guarda o cache.
const { cachedData } = await isolate.compileScript(codigo, { produceCachedData: true })
await escreverNoDisco('cache/regra-42.bin', await cachedData.copy())

// Depois: reaproveita, e regera só se o V8 recusar.
const script = await isolate.compileScript(codigo, {
  cachedData: new ivm.ExternalCopy(await lerDoDisco('cache/regra-42.bin')),
  produceCachedData: true,
})
if (script.cachedDataRejected) console.warn('cache inválido, recompilado')

// NUNCA: cachedData vindo do usuário é código de máquina, não dado.
```

#### scriptorigin
[doc](https://github.com/laverdet/isolated-vm#scriptorigin)

**O que é:** `filename`, `lineOffset` e `columnOffset` do código compilado.
**Para que serve:** stack trace e inspector que apontam para um nome que significa alguma coisa.
**Quando usar:** em **toda** compilação. Custa uma propriedade e devolve depuração possível: sem ela,
o erro de uma regra do usuário chega sem origem identificável, e com dezenas de regras rodando no
mesmo isolate não há como saber qual quebrou. A recomendação explícita do README é usar um esquema de
URI válido — `{ filename: 'file:///test.js' }` — porque sem isso algumas devtools funcionam mal. O
mesmo `filename` reaparece como `url` no perfil de CPU e é o `referrer` entregue ao
`importModuleDynamically`.

```ts
// Convenção que se paga sozinha: identidade do artefato no filename.
const script = await isolate.compileScript(codigo, {
  filename: `file:///regras/${regra.id}/v${regra.versao}.js`,
})

try {
  await script.run(context, { timeout: 100 })
} catch (erro) {
  // a stack agora diz file:///regras/42/v3.js:7:12 em vez de <anonymous>
  registrarFalhaDeRegra(regra.id, erro)
}
```

