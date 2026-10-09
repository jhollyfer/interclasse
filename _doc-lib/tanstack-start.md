# TanStack Start

Framework full-stack React construído sobre o TanStack Router e o Vite.

**O que é:** a camada de servidor em volta do TanStack Router. O Router cuida de rotas, navegação e
carregamento de dados no cliente; o Start acrescenta SSR, streaming, server functions (RPC tipado do
cliente para o servidor), rotas de API, middleware e deploy. Concorre diretamente com Next.js e
Remix, com a diferença de ser type-safe de ponta a ponta e de rodar sobre Vite.

**Para que serve:** escrever uma função que roda só no servidor, chamá-la do componente como se
fosse uma função local, e ter os tipos batendo nas duas pontas sem gerar nada nem escrever schema de
API. Além disso, renderizar no servidor para o primeiro carregamento e hidratar no cliente, com
controle fino de o que é SSR e o que não é.

**Como usar:**

```bash
npx @tanstack/cli@latest create
```

```ts
import { createServerFn } from '@tanstack/react-start'

const getUsers = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(users) // este código nunca vai para o bundle do cliente
})

// no componente, chamada normal e tipada
const users = await getUsers()
```

**Quando usar a biblioteca:** quando o app precisa de servidor (SSR, sessão, acesso a banco, chaves
secretas) e você quer o roteamento tipado do TanStack. Se o frontend é uma SPA que só conversa com
um back-end separado, o **Router sozinho** basta e o Start só adiciona complexidade.

**A ideia que organiza tudo:** existe código de servidor, código de cliente e código isomórfico, e
misturá-los é a origem de quase todo erro estranho. As páginas de *execution model*, *import
protection* e *hydration errors* são as que ensinam a manter essa fronteira nítida.

**Links:** 43.

---

## Fundamentos

#### overview
[doc](https://tanstack.com/start/latest/docs/framework/react/overview) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/overview.md)
**O que é:** a apresentação do framework, o que ele acrescenta ao Router e o estado de maturidade do
projeto.
**Para que serve:** decidir se você precisa do Start ou se o Router sozinho resolve.
**Quando usar:** primeira leitura, antes de qualquer linha de código.

```tsx
// O que o Start acrescenta ao Router cabe neste arquivo: a rota é do Router,
// a função de servidor é do Start, e o componente chama as duas do mesmo lugar.
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const contarUsers = createServerFn().handler(async () => {
  return 42 // roda só no servidor, nunca entra no bundle do cliente
})

export const Route = createFileRoute('/dashboard')({
  loader: () => contarUsers(), // o loader é do Router, a chamada é do Start
  component: () => <p>{Route.useLoaderData()} users</p>,
})
```

#### getting-started
[doc](https://tanstack.com/start/latest/docs/framework/react/getting-started) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/getting-started.md)
**O que é:** criar um projeto novo a partir do template oficial.
**Para que serve:** ter um app rodando em minutos, com a estrutura de pastas já correta.
**Quando usar:** ao iniciar um projeto. É o caminho recomendado, o setup manual tem muitas peças.

```bash
# a CLI unificada do TanStack substituiu o antigo `create @tanstack/start`
npx @tanstack/cli@latest create

# ou partindo de um exemplo pronto do repositório oficial:
npx gitpick TanStack/router/tree/main/examples/react/start-basic meu-app

# a estrutura que nasce, e o papel de cada peça:
# src/routes/__root.tsx   documento HTML e layout de tudo
# src/routes/index.tsx    a rota /
# src/router.tsx          createRouter, é aqui que o app inteiro é configurado
# src/routeTree.gen.ts    GERADO pelo plugin de Vite, nunca editar na mão
```

#### build-from-scratch
[doc](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/build-from-scratch.md)
**O que é:** o passo a passo manual: dependências, configuração do Vite, entrypoints de servidor e
de cliente, arquivo de rota raiz.
**Para que serve:** entender cada peça que o template esconde, e adicionar o Start a um projeto que
já existe.
**Quando usar:** ao migrar um app existente, ou quando algo quebrar na configuração e você precisar
saber o que cada arquivo faz.

```ts
// vite.config.ts: o plugin do Start é o que transforma um app Vite comum em full-stack.
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // a ordem importa: o Start gera a routeTree e prepara os entrypoints
    // antes de o plugin de React tocar nos arquivos
    tanstackStart(),
    viteReact(),
  ],
})

// Existe plugin equivalente para Rsbuild em '@tanstack/react-start/plugin/rsbuild',
// e lá a ordem é a inversa: [pluginReact(), tanstackStart()].
```

#### comparison
[doc](https://tanstack.com/start/latest/docs/framework/react/comparison) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/comparison.md)
**O que é:** tabela de comparação de features contra Next.js, Remix, SvelteKit e outros.
**Para que serve:** munição objetiva para decisão técnica, e para saber o que ainda falta.
**Quando usar:** ao justificar a escolha de stack para alguém, ou ao verificar se uma feature que
você espera existe mesmo.

```ts
// A diferença que a tabela resume em uma linha: os tipos atravessam a fronteira
// cliente-servidor sozinhos, sem geração de código e sem schema de API no meio.
import { createServerFn } from '@tanstack/react-start'

const buscarUser = createServerFn()
  .validator((id: string) => id)
  .handler(async ({ data: id }) => ({ id, name: 'Acme' }))

const user = await buscarUser({ data: '123' })
user.name // string, inferido do handler. Errar o nome do campo é erro de compilação.
```

#### start-vs-nextjs
[doc](https://tanstack.com/start/latest/docs/framework/react/start-vs-nextjs) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/start-vs-nextjs.md)
**O que é:** a comparação detalhada com Next.js: modelo de execução, server functions contra server
actions, roteamento e build.
**Para que serve:** traduzir conceitos do Next para os do Start.
**Quando usar:** se você vem de Next.js. Poupa muita confusão de vocabulário.

```ts
// Next.js: a diretiva marca o arquivo, e a action só existe dentro do fluxo de formulário.
// 'use server'
// export async function criar(formData: FormData) {}

// Start: a função é um valor comum, chamável de loader, de evento ou de mutation.
import { createServerFn } from '@tanstack/react-start'

export const criar = createServerFn({ method: 'POST' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => data.name)

// GET no Start equivale ao fetch em Server Component do Next; POST equivale à server action.
```

#### migrate-from-next-js
[doc](https://tanstack.com/start/latest/docs/framework/react/migrate-from-next-js) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/migrate-from-next-js.md)
**O que é:** o guia prático de migração: equivalências de arquivos, de rotas e de data fetching.
**Para que serve:** portar um app Next existente sem redescobrir tudo.
**Quando usar:** só numa migração real. Pule se o projeto nasceu no Start.

```tsx
// getServerSideProps do Next vira loader mais server function no Start.
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const carregar = createServerFn()
  .validator((id: string) => id)
  .handler(async ({ data: id }) => ({ id }))

export const Route = createFileRoute('/users/$id')({
  // app/users/[id]/page.tsx  ->  src/routes/users.$id.tsx
  // params.id do Next           ->  params.id aqui, mas tipado a partir da URL
  loader: ({ params }) => carregar({ data: params.id }),
  component: () => <p>{Route.useLoaderData().id}</p>,
})
```

## Tutoriais

Duas páginas guiadas, escritas depois do resto da doc. Elas não ensinam conceito novo: mostram o
ciclo inteiro — ler, escrever, invalidar — funcionando de ponta a ponta, que é o que os guias
temáticos mostram em pedaços.

#### tutorial/reading-writing-file
[doc](https://tanstack.com/start/latest/docs/framework/react/tutorial/reading-writing-file) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/tutorial/reading-writing-file.md)
**O que é:** um app pequeno que lê uma lista de um JSON em disco e grava novos itens nele, via
server functions.
**Para que serve:** ver o ciclo completo de leitura e escrita sem banco no meio, incluindo a parte
que quase todo mundo esquece: fazer a tela refletir a escrita.
**Quando usar:** na **primeira escrita de dados** do projeto. É o menor exemplo de leitura, escrita,
validação e invalidação juntos, e serve de molde mesmo quando o destino é banco ou API.

```tsx
import { createServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'

export const adicionar = createServerFn({ method: 'POST' })
  .validator((data: { titulo: string }) => {
    if (!data.titulo.trim()) throw new Error('título é obrigatório')

    return data
  })
  .handler(async ({ data }) => {
    const { writeFile } = await import('node:fs/promises')
    await writeFile('dados.json', JSON.stringify(data))
    return data
  })

// A lição que fecha o ciclo: sem o invalidate o loader continua servindo o
// que leu antes da escrita, e a tela fica "um item atrasada".
const router = useRouter()
await adicionar({ data: { titulo: 'novo' } })
await router.invalidate()
```

#### tutorial/fetching-external-api
[doc](https://tanstack.com/start/latest/docs/framework/react/tutorial/fetching-external-api) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/tutorial/fetching-external-api.md)
**O que é:** consumir uma API de terceiro a partir do loader de rota, com o token guardado em
variável de ambiente sem prefixo.
**Para que serve:** buscar dado externo sem que a credencial chegue ao navegador.
**Quando usar:** **é o caso mais próximo de um front que conversa com um backend separado**. Se o
seu app tem uma API própria, este é o padrão a copiar, e não os exemplos com banco.

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const buscarFilmes = createServerFn().handler(async () => {
  // o token fica no servidor porque a variável NÃO tem prefixo público e a
  // chamada mora dentro do handler: nada disso entra no bundle do cliente
  const res = await fetch('https://api.exemplo.com/filmes', {
    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` },
  })
  if (!res.ok) throw new Error(`falhou: ${res.statusText}`)
  return res.json()
})

export const Route = createFileRoute('/filmes')({
  // o loader roda no servidor no primeiro acesso: o usuário recebe HTML com o
  // dado dentro, e o navegador nunca vê a chave
  loader: () => buscarFilmes(),
})
```

## Modelo de execução

#### guide/routing
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/routing) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/routing.md)
**O que é:** como o roteamento do Router funciona dentro do Start, com as diferenças que o servidor
introduz.
**Para que serve:** entender o que muda no roteamento quando existe SSR.
**Quando usar:** logo depois de criar o projeto. Para o roteamento em profundidade, a doc do Router
é a fonte principal, esta página cobre o delta.

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/')({
  // Com SSR, o loader roda no SERVIDOR no primeiro acesso e no CLIENTE nas
  // navegações seguintes. Ele precisa funcionar nos dois lugares: nada de
  // window, localStorage ou variável secreta aqui dentro.
  loader: async () => ({ users: [] as Array<{ id: string }> }),
  component: () => <ul>{Route.useLoaderData().users.map((e) => <li key={e.id} />)}</ul>,
})
```

#### guide/execution-model
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/execution-model) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/execution-model.md)
**O que é:** o que roda no servidor, o que roda no cliente, o que roda nos dois, e em que ordem, no
primeiro request e nas navegações seguintes.
**Para que serve:** o modelo mental que evita a maioria dos bugs de framework full-stack.
**Quando usar:** **leia cedo e releia**. Praticamente todo erro do tipo "por que isso rodou duas
vezes" ou "por que `window` é undefined" se explica aqui.

```tsx
import { createFileRoute } from '@tanstack/react-router'

console.log('módulo') // roda 2x: uma no servidor, uma no cliente ao hidratar

export const Route = createFileRoute('/exemplo')({
  loader: () => {
    console.log('loader') // servidor no 1o acesso, cliente nas navegações
    return null
  },
  component: () => {
    console.log('render') // servidor (HTML) e cliente (hidratação)
    // window só existe depois da montagem, e é por isso que o acesso vai aqui
    // e não no corpo do componente
    return <div />
  },
})
```

#### guide/code-execution-patterns
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/code-execution-patterns) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/code-execution-patterns.md)
**O que é:** padrões concretos para colocar cada tipo de código no lugar certo, com exemplos de
código só de servidor, só de cliente e isomórfico.
**Para que serve:** transformar a teoria do execution model em regras práticas de onde escrever o
quê.
**Quando usar:** ao estruturar as pastas do projeto, e sempre que estiver em dúvida sobre onde um
arquivo deve morar.

```ts
// 1. só servidor: o sufixo .server.ts marca o arquivo e o bundler o remove do cliente
// src/lib/db.server.ts
export const conexao = { url: process.env.DATABASE_URL }

// 2. só cliente: envolvido para nunca rodar no render de servidor
import { createClientOnlyFn, createServerOnlyFn } from '@tanstack/react-start'
const lerTema = createClientOnlyFn(() => localStorage.getItem('tema'))
const lerSegredo = createServerOnlyFn(() => process.env.API_SECRET)

// 3. isomórfico: puro, sem tocar em window nem em process. Roda nos dois lados.
export function formatarCnpj(valor: string) {
  return valor.replace(/\D/g, '')
}
```

#### guide/import-protection
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/import-protection) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/import-protection.md)
**O que é:** o mecanismo que impede que código de servidor vaze para o bundle do cliente, e a
mensagem de erro que ele emite.
**Para que serve:** garantir que credencial de banco e chave secreta nunca cheguem ao navegador.
**Quando usar:** quando aparecer erro de import proibido. É a proteção fazendo o trabalho dela, e a
página explica como reorganizar o código em vez de contorná-la.

```tsx
// ERRADO: o componente importa o módulo de servidor no topo, e a proteção barra o build.
// import { conexao } from '@/lib/db.server'

// CERTO: o módulo de servidor só é tocado DENTRO do handler da server function,
// que é o limite que o bundler sabe cortar.
import { createServerFn } from '@tanstack/react-start'

const listar = createServerFn().handler(async () => {
  const { conexao } = await import('@/lib/db.server')
  return conexao.url ? [] : []
})
```

#### guide/path-aliases
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/path-aliases) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/path-aliases.md)
**O que é:** configuração de aliases de import (`~/`, `@/`) no TypeScript e no Vite.
**Para que serve:** importar por caminho absoluto em vez de `../../../`.
**Quando usar:** na configuração inicial. É preciso configurar nos **dois** lugares, tsconfig e
Vite, e esquecer um deles gera erro só no build.

```ts
// tsconfig.json: resolve o tipo, e é só isso que o editor enxerga
// { "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }

// vite.config.ts: resolve o import de verdade em tempo de build
import { fileURLToPath } from 'node:url'

export default {
  resolve: {
    // faltando este bloco, o editor fica verde e o build quebra: o TS resolve
    // tipos, não módulos
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
}
```

#### guide/environment-variables
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/environment-variables.md)
**O que é:** a convenção de variáveis de ambiente: quais ficam só no servidor e quais são expostas
ao cliente pelo prefixo público.
**Para que serve:** não vazar segredo no bundle.
**Quando usar:** ao adicionar qualquer variável de ambiente. A regra do prefixo é a diferença entre
uma chave secreta e uma chave pública, e o erro aqui é silencioso.

```ts
import { createServerFn } from '@tanstack/react-start'

// .env
// DATABASE_URL=postgres://...      sem prefixo: nunca sai do servidor
// VITE_API_URL=https://api.local   com prefixo VITE_: vai INTEIRA para o bundle

// só dentro de server function, middleware ou entrypoint de servidor, e
// sempre DENTRO do callback, nunca no topo do módulo:
const listar = createServerFn().handler(async () => connect(process.env.DATABASE_URL))

// em qualquer lugar, inclusive no componente:
const api = import.meta.env.VITE_API_URL

// A pegadinha silenciosa: prefixar um segredo com VITE_ publica ele no JS que
// o navegador baixa. Nada avisa, e o valor fica legível em qualquer DevTools.
//
// A segunda pegadinha, que só aparece em produção: em runtime de borda
// (Cloudflare Workers e afins) as variáveis são injetadas POR REQUISIÇÃO.
// `const url = process.env.DATABASE_URL` no escopo do módulo roda antes de o
// ambiente existir e vira `undefined` — inclusive no servidor, onde tudo
// parecia certo em dev.
```

## Server functions

#### guide/server-functions
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/server-functions.md)
**O que é:** `createServerFn`, o coração do Start: método HTTP, validação de entrada, handler,
middleware e como a chamada é serializada.
**Para que serve:** chamar servidor a partir do cliente com tipagem completa, sem definir rota nem
schema de API.
**Quando usar:** **a página mais importante do framework**. Toda leitura e escrita de dados passa
por aqui. Vale ler inteira uma vez e voltar sempre.

```ts
import { createServerFn } from '@tanstack/react-start'

export const criarUser = createServerFn({ method: 'POST' })
  // O validator é a fronteira de confiança: o que vem do cliente é desconhecido
  // até passar por aqui, e o tipo do handler sai deste parse.
  //
  // O nome do método é `validator`. `inputValidator`, que aparece em material
  // escrito entre 2025 e 2026, continua funcionando mas está marcado como
  // @deprecated no código-fonte.
  //
  // Aceita função à mão (como aqui) ou qualquer schema no padrão Standard
  // Schema. Validador cujo `validate` devolve promessa não serve.
  .validator((data: { document: string; name: string }) => {
    if (data.document.length !== 14) throw new Error('documento inválido')

    return data
  })
  .handler(async ({ data }) => {
    return { id: crypto.randomUUID(), name: data.name }
  })

// no cliente: o payload vai sempre na chave `data`, e o retorno é serializado
const criada = await criarUser({ data: { document: '12345678000199', name: 'Acme' } })
```

#### guide/streaming-data-from-server-functions
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/streaming-data-from-server-functions) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/streaming-data-from-server-functions.md)
**O que é:** devolver dados em fluxo a partir de uma server function, em vez de esperar tudo ficar
pronto.
**Para que serve:** respostas incrementais, como saída de IA token a token ou progresso de um
processamento longo.
**Quando usar:** só quando a resposta for realmente incremental. Para JSON comum, resposta normal.

```ts
import { createServerFn } from '@tanstack/react-start'

type Etapa = { nome: string }

// Async generator é o caminho mais curto, e os chunks continuam TIPADOS: o
// cliente sabe que cada item é `Etapa`, sem decodificar bytes na mão.
const acompanhar = createServerFn().handler(async function* () {
  for (const nome of ['lendo', 'processando', 'pronto']) {
    yield { nome } satisfies Etapa
  }
})

for await (const etapa of await acompanhar()) {
  console.info(etapa.nome) // Etapa, não string nem Uint8Array
}

// A alternativa é devolver um `ReadableStream<Etapa>` direto do handler — sem
// envolver em `Response` e sem `{ response: 'raw' }`, que não existem mais
// aqui. Nesse formato quem consome usa `(await acompanhar()).getReader()`, e
// esquecer o `controller.close()` deixa o cliente pendurado para sempre.
```

#### guide/server-components
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/server-components) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/server-components.md)
**O que é:** o suporte a React Server Components no Start, e as diferenças em relação ao modelo do
Next.
**Para que serve:** renderizar componentes que nunca vão para o bundle do cliente.
**Quando usar:** verifique nesta página o estado atual do suporte antes de apostar em RSC. O Start
resolve boa parte dos mesmos problemas com server functions, que são mais simples.

```tsx
// O caminho sem RSC, que resolve o mesmo problema com peças estáveis: o dado
// pesado é buscado no servidor e só o resultado atravessa a rede.
import { createServerFn } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'

const relatorio = createServerFn().handler(async () => {
  // biblioteca pesada de servidor fica aqui dentro e não entra no bundle
  return { total: 0 }
})

export const Route = createFileRoute('/relatorio')({
  loader: () => relatorio(),
  component: () => <p>{Route.useLoaderData().total}</p>,
})
```

#### guide/static-server-functions
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/static-server-functions) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/static-server-functions.md)
**O que é:** server functions avaliadas durante o prerender, com o resultado congelado como JSON
estático.
**Para que serve:** conteúdo que não muda entre deploys, como uma lista de posts de blog.
**Quando usar:** em páginas de conteúdo estático, e sabendo que o recurso é **experimental**. Não
use para dado que muda por usuário ou por requisição.

```ts
import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'

// A opção `{ type: 'static' }` saiu: hoje o comportamento vem de um middleware,
// que precisa ser o ÚLTIMO da lista.
const listarPosts = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .handler(async () => {
    return [{ slug: 'ola-mundo', titulo: 'Olá mundo' }]
  })

// No build o retorno vira um JSON em disco; em produção a chamada do cliente
// busca esse arquivo. Nunca use com dado por usuário: o valor do primeiro
// build seria servido a todo mundo, para sempre.
```

#### guide/environment-functions
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/environment-functions) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/environment-functions.md)
**O que é:** utilitários para escrever código que se comporta de forma diferente conforme o ambiente
de execução.
**Para que serve:** isolar o pouco de código que precisa mesmo saber onde está rodando.
**Quando usar:** casos pontuais, geralmente ao integrar biblioteca de terceiro que só funciona no
navegador.

```ts
import { createIsomorphicFn } from '@tanstack/react-start'

// uma função, duas implementações: o bundler entrega a versão certa a cada lado
const origem = createIsomorphicFn()
  .server(() => process.env.APP_URL ?? 'http://localhost:3000')
  .client(() => window.location.origin)

// Preferível a `typeof window === 'undefined'` espalhado pelo código: aqui o
// ramo de servidor some do bundle do cliente, inclusive as importações dele.
```

#### guide/middleware
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/middleware) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/middleware.md)
**O que é:** middleware para server functions e para rotas de servidor, encadeável, com contexto
tipado que passa adiante.
**Para que serve:** autenticação, log e validação compartilhados, sem repetir em cada handler.
**Quando usar:** **assim que existir mais de uma server function que exige usuário autenticado**. O
contexto tipado faz o usuário chegar já tipado no handler, o que é a maior vantagem prática.

```ts
import { createMiddleware, createServerFn } from '@tanstack/react-start'

const autenticado = createMiddleware().server(async ({ next }) => {
  const user = { id: '1', role: 'member' as const }
  if (!user) throw new Error('não autenticado')
  // o que vai em `context` chega tipado em quem consome o middleware
  return next({ context: { user } })
})

const meusPosts = createServerFn()
  .middleware([autenticado])
  .handler(async ({ context }) => {
    return context.user.id // tipado, sem cast e sem checagem repetida
  })
```

#### guide/error-boundaries
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/error-boundaries) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/error-boundaries.md)
**O que é:** tratamento de erro por rota, com componente de erro e a diferença entre erro de
servidor e erro de cliente.
**Para que serve:** mostrar uma tela de erro decente em vez de página em branco.
**Quando usar:** ao definir a rota raiz do app, para ter um fallback global, e depois em rotas
específicas que mereçam tratamento próprio.

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/$id')({
  loader: async () => {
    throw new Error('falhou')
  },
  // pega erro do loader e do render, tanto no servidor quanto no cliente
  errorComponent: ({ error, reset }) => (
    <div>
      <p>{error.message}</p>
      {/* reset re-executa o loader: é o botão "tentar de novo" */}
      <button onClick={reset}>Tentar de novo</button>
    </div>
  ),
})
```

#### guide/server-routes
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/server-routes.md)
**O que é:** rotas HTTP de verdade, com acesso a `Request` e `Response`, fora do fluxo de server
functions.
**Para que serve:** webhooks, endpoints públicos consumidos por terceiros, download de arquivo,
qualquer coisa que precise controlar cabeçalhos e status.
**Quando usar:** quando o consumidor **não** é o seu próprio frontend. Para o seu frontend, server
function é melhor por causa da tipagem.

```ts
// src/routes/api/webhook.ts
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/webhook')({
  server: {
    handlers: {
      // aqui você recebe Request e devolve Response, sem serialização mágica:
      // é o que um webhook de terceiro espera
      POST: async ({ request }) => {
        const corpo = await request.json()
        return new Response(JSON.stringify({ ok: !!corpo }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
```

## SSR e hidratação

#### guide/hydration-errors
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/hydration-errors) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/hydration-errors.md)
**O que é:** por que o HTML do servidor diverge do primeiro render do cliente, e as causas comuns
(data, valor aleatório, acesso a `window`, extensão de navegador).
**Para que serve:** diagnosticar o erro de hidratação, que é críptico por natureza.
**Quando usar:** **na hora em que o erro aparecer**. Vá direto à lista de causas comuns, a sua está
quase certamente lá.

```tsx
import { useEffect, useState } from 'react'

// ERRADO: o servidor renderiza um horário, o cliente renderiza outro, e o React
// reclama de divergência.
// const Relogio = () => <span>{new Date().toLocaleTimeString()}</span>

// CERTO: o primeiro render é igual nos dois lados, o valor volátil entra depois.
function Relogio() {
  const [hora, setHora] = useState<string | null>(null)
  useEffect(() => setHora(new Date().toLocaleTimeString()), [])
  return <span>{hora ?? '--:--:--'}</span>
}
```

#### guide/deferred-hydration
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/deferred-hydration) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/deferred-hydration.md)
**O que é:** adiar a hidratação de partes da página para melhorar a interatividade inicial.
**Para que serve:** reduzir o JavaScript que precisa rodar antes de a página responder ao usuário.
**Quando usar:** otimização. Só depois de medir e constatar que a hidratação é o gargalo.

```tsx
import { lazy, Suspense } from 'react'

// o gráfico é pesado e fica abaixo da dobra: ele não precisa estar pronto para
// a página responder ao primeiro clique
const Grafico = lazy(() => import('@/components/grafico'))

export function Painel() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <Grafico />
    </Suspense>
  )
}
```

#### guide/selective-ssr
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/selective-ssr.md)
**O que é:** ligar e desligar SSR por rota, incluindo o desligamento do loader no servidor.
**Para que serve:** renderizar no servidor as páginas públicas, que precisam de SEO, e deixar o
painel autenticado só no cliente.
**Quando usar:** ao decidir a estratégia de render de cada área do app. Painel interno raramente
ganha algo com SSR e paga o custo dele.

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/dashboard')({
  // false: nem loader nem componente rodam no servidor. Nada de SEO aqui, e é
  // exatamente o que se quer num painel atrás de login.
  // 'data-only': o loader roda no servidor, o componente só no cliente.
  ssr: false,
  component: () => <div />,
})
```

#### guide/spa-mode
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/spa-mode.md)
**O que é:** rodar o Start sem SSR nenhum, como SPA pura, mantendo as server functions.
**Para que serve:** o meio-termo entre Router puro e full-stack completo.
**Quando usar:** quando você quer server functions e deploy simples, mas não precisa de SSR.
Simplifica bastante o modelo mental.

```ts
// vite.config.ts
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default {
  // com SPA ligado some a classe inteira de bug de hidratação, porque não
  // existe HTML de servidor para divergir do cliente
  plugins: [tanstackStart({ spa: { enabled: true } })],
}
```

#### guide/static-prerendering
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/static-prerendering.md)
**O que é:** gerar HTML de rotas em tempo de build, incluindo rotas dinâmicas com lista de
parâmetros.
**Para que serve:** servir páginas de marketing e documentação como arquivos estáticos, sem
servidor.
**Quando usar:** para páginas de conteúdo que mudam pouco. Não serve para páginas por usuário.

```ts
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default {
  plugins: [
    tanstackStart({
      prerender: { enabled: true },
      // rota dinâmica precisa da lista de parâmetros: o build não tem como
      // adivinhar quais ids existem
      pages: [{ path: '/posts/ola-mundo', prerender: { enabled: true } }],
    }),
  ],
}
```

#### guide/isr
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/isr) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/isr.md)
**O que é:** regeneração estática incremental, ou seja, páginas estáticas que se atualizam sozinhas
após um intervalo.
**Para que serve:** conteúdo que muda de vez em quando e não justifica render a cada requisição.
**Quando usar:** em páginas de catálogo ou blog com muito tráfego. Depende de suporte da plataforma
de hospedagem, o que a página detalha.

```ts
// A revalidação é feita pela hospedagem lendo o cabeçalho de cache, não pelo
// Start: sem suporte da plataforma, isto vira cache comum de CDN.
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/catalogo')({
  headers: () => ({
    // serve do cache por 60s e revalida em background pelas próximas 24h
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=86400',
  }),
  component: () => <div />,
})
```

## Entrypoints e infraestrutura

#### guide/server-entry-point
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/server-entry-point.md)
**O que é:** o arquivo de entrada do servidor, onde o request é recebido e o HTML é montado.
**Para que serve:** customizar o pipeline de render no servidor, adicionar cabeçalhos globais ou
integrar middleware externo.
**Quando usar:** ao precisar de algo global no servidor. O arquivo é **opcional**: sem ele o Start
usa o handler padrão.

```ts
// src/server.ts
import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback,
} from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'

// A forma antiga, `createStartHandler({ createRouter })(defaultStreamHandler)`,
// saiu. Hoje o arquivo exporta um objeto com `fetch`, no formato universal que
// Cloudflare Workers e outros runtimes WinterCG esperam.
const customHandler = defineHandlerCallback((ctx) => {
  // ponto único para o que precisa valer para TODA requisição: cabeçalho de
  // segurança, tracing, correlação de log
  return defaultStreamHandler(ctx)
})

export default createServerEntry({ fetch: createStartHandler(customHandler) })
```

#### guide/client-entry-point
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/client-entry-point) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/client-entry-point.md)
**O que é:** o arquivo de entrada do cliente, onde a hidratação começa.
**Para que serve:** rodar código antes de o app hidratar, como registrar um monitor de erros.
**Quando usar:** ao integrar ferramenta de observabilidade ou polyfill global.

```tsx
// src/client.tsx
import { hydrateRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { StartClient } from '@tanstack/react-start/client'

// O `StartClient` vem de '@tanstack/react-start/client' e NÃO recebe mais a
// prop `router`: ele resolve o router registrado sozinho.
//
// Tudo que rodar antes do hydrateRoot pega os erros da própria hidratação,
// que é justamente a janela onde os bugs de SSR aparecem.
hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
)
```

#### guide/early-hints
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/early-hints) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/early-hints.md)
**O que é:** o uso da resposta HTTP 103 Early Hints para o navegador começar a baixar recursos antes
do HTML ficar pronto.
**Para que serve:** ganhar alguns milissegundos no carregamento inicial.
**Quando usar:** otimização avançada, e depende do CDN e da hospedagem suportarem 103. Deixe para o
fim.

```bash
# O 103 é enviado ANTES da resposta final, e some se houver um proxy no meio que
# não o entenda. Antes de investir, confirme que ele chega:
curl -sSD - -o /dev/null --http2 https://meu-app.com/ | head -20
# procure por "HTTP/2 103" seguido de "HTTP/2 200"
```

#### guide/cdn-asset-urls
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/cdn-asset-urls) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/cdn-asset-urls.md)
**O que é:** reescrever, em runtime, a URL dos assets que o Start gerencia, apontando para um CDN.
**Para que serve:** servir JS e CSS de um domínio de CDN em vez do servidor da aplicação, inclusive
quando a origem só é conhecida na hora em que o servidor sobe.
**Quando usar:** ao colocar CDN na frente da aplicação em produção.

```ts
// src/server.ts — a reescrita é do entrypoint de SERVIDOR, não do `base` do Vite
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'

const handler = createStartHandler({
  handler: defaultStreamHandler,
  // string vazia não reescreve nada. Aceita objeto quando também é preciso
  // marcar `crossOrigin` nos <link> do manifesto.
  transformAssets: process.env.CDN_ORIGIN || '',
})

export default createServerEntry({ fetch: handler })

// A pegadinha: só o que está no manifesto é reescrito. Arquivo servido de
// public/ por string crua, e CSS que você mesmo devolve em `head().links`,
// ficam de fora.
```

#### guide/hosting
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/hosting) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/hosting.md)
**O que é:** os presets de deploy por plataforma (Vercel, Netlify, Cloudflare, Node, container) e o
que muda em cada um.
**Para que serve:** publicar sem descobrir na base da tentativa qual adaptador usar.
**Quando usar:** no primeiro deploy, e ao trocar de plataforma. Verifique aqui se a plataforma
suporta as features que você usa, especialmente ISR e streaming. Quem faz o trabalho é o Nitro, e
ele tem arquivo próprio: [`nitro.md`](nitro.md).

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  // A opção `target` do tanstackStart saiu. Quem decide o formato da saída
  // agora é o Nitro, um plugin separado (`pnpm add nitro`): sem preset ele
  // detecta a plataforma, com preset você crava.
  //
  // Sobre a POSIÇÃO na lista, as duas docs oficiais discordam: esta página põe
  // o nitro() no meio, e o exemplo oficial do Nitro
  // (examples/vite-ssr-tss-react) põe por último. O exemplo é o mais recente.
  plugins: [tanstackStart(), viteReact(), nitro({ preset: 'node-server' })],
})
```

#### guide/observability
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/observability) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/observability.md)
**O que é:** integração com ferramentas de monitoramento, log e tracing.
**Para que serve:** enxergar erro e latência em produção em vez de descobrir pelo usuário.
**Quando usar:** antes do primeiro deploy sério. Depois que a aplicação está no ar, configurar isso
sempre custa mais.

```ts
// Um app full-stack tem DOIS lugares para instrumentar, e esquecer um deles
// deixa metade dos erros invisíveis.
// src/server.ts  -> erros de loader, de server function e de render no servidor
// src/client.tsx -> erros de hidratação e de interação do usuário

import { createMiddleware } from '@tanstack/react-start'

export const comLog = createMiddleware().server(async ({ next }) => {
  const inicio = performance.now()
  try {
    return await next()
  } finally {
    console.info('duração', performance.now() - inicio)
  }
})
```

## Autenticação e dados

#### guide/authentication-overview
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/authentication-overview) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/authentication-overview.md)
**O que é:** o panorama das abordagens de autenticação no Start, com as opções de sessão e de token
e onde cada verificação acontece.
**Para que serve:** escolher a estratégia antes de escrever código.
**Quando usar:** **antes de implementar login**. Trocar de abordagem depois é caro, e essa decisão é
das primeiras que travam o resto.

```ts
// As duas estratégias, e o que cada uma custa:
//
// 1. cookie httpOnly de sessão  -> o JS do cliente NÃO lê o cookie, o servidor
//    resolve o usuário a cada request. É o que um backend Node já costuma fazer.
// 2. token em memória           -> o cliente carrega o token e o envia no
//    cabeçalho. Some no F5 e não funciona no loader de SSR sem repasse manual.
//
// Com SSR, o cookie ganha quase sempre: o loader roda no servidor e precisa
// saber quem é o usuário ANTES de qualquer JavaScript rodar no navegador.
```

#### guide/authentication-server-primitives
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/authentication-server-primitives) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/authentication-server-primitives.md)
**O que é:** as primitivas de servidor: leitura e escrita de cookie, sessão, cabeçalhos e o contexto
do request.
**Para que serve:** implementar sessão na mão, com cookie httpOnly, sem depender de biblioteca de
autenticação.
**Quando usar:** ao integrar com um back-end que já faz autenticação e devolve cookie, ou ao
escrever a sessão do zero.

```ts
import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie, getRequest } from '@tanstack/react-start/server'

export const entrar = createServerFn({ method: 'POST' }).handler(async () => {
  setCookie('sessao', 'valor', {
    httpOnly: true, // sem isto o JS da página lê o cookie, e o XSS também
    sameSite: 'lax',
    secure: true,
  })
  // `getWebRequest()` não existe mais: o nome é `getRequest()`.
  return { origem: getRequest().headers.get('origin'), atual: getCookie('sessao') }
})

// O módulo cresceu junto com o nome: além destes, existem `getRequestHeader`,
// `getRequestIP`, `setResponseHeader(s)`, `setResponseStatus`, `deleteCookie` e
// a família de sessão selada (`useSession`, `getSession`, `updateSession`,
// `clearSession`), que resolve sessão assinada sem biblioteca externa.
```

#### guide/authentication
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/authentication) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/authentication.md)
**O que é:** o guia prático de ponta a ponta: login, sessão, rotas protegidas e redirecionamento de
quem não está autenticado.
**Para que serve:** o passo a passo completo do fluxo.
**Quando usar:** ao implementar login de fato. Leia junto com `authenticated-routes` na doc do
Router, porque a proteção de rota mora lá.

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const usuarioAtual = createServerFn().handler(async () => null as { id: string } | null)

export const Route = createFileRoute('/_authenticated')({
  // beforeLoad roda ANTES do loader dos filhos: o redirecionamento acontece sem
  // que a tela protegida chegue a montar
  beforeLoad: async ({ location }) => {
    const user = await usuarioAtual()
    if (!user) throw redirect({ to: '/authentication/sign-in', search: { de: location.href } })
    return { user }
  },
})
```

#### guide/databases
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/databases) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/databases.md)
**O que é:** padrões para conectar a banco a partir de server functions, com atenção ao ciclo de
vida da conexão em ambiente serverless.
**Para que serve:** evitar abrir uma conexão nova a cada invocação e estourar o limite do banco.
**Quando usar:** se o Start for falar direto com banco. Se ele só consome uma API externa, pule.

```ts
// src/lib/db.server.ts
import { Pool } from 'pg'

// O pool vive no módulo, não dentro do handler. Criar a conexão por invocação é
// o erro que derruba o banco em serverless: cada instância fria abre mais uma.
declare global {
  var __pool: Pool | undefined
}

export const pool = globalThis.__pool ?? new Pool({ connectionString: process.env.DATABASE_URL })
if (process.env.NODE_ENV !== 'production') globalThis.__pool = pool
```

## Apresentação

#### guide/css-styling
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/css-styling) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/css-styling.md)
**O que é:** as opções de estilo suportadas: CSS puro, CSS Modules, CSS-in-JS, e o que muda com SSR.
**Para que serve:** escolher a abordagem de estilo sem cair em flash de conteúdo sem estilo.
**Quando usar:** ao configurar o projeto. Bibliotecas de CSS-in-JS costumam exigir configuração
extra para SSR, e é aqui que isso está documentado.

```tsx
// src/routes/__root.tsx
import { createRootRoute } from '@tanstack/react-router'
import estilos from '@/styles.css?url'

export const Route = createRootRoute({
  // declarar o CSS como link na rota raiz faz ele ir no HTML do servidor, e é
  // isso que evita o flash de página sem estilo no primeiro carregamento
  head: () => ({ links: [{ rel: 'stylesheet', href: estilos }] }),
})
```

#### guide/tailwind-integration
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/tailwind-integration) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/tailwind-integration.md)
**O que é:** o passo a passo de integração do Tailwind, incluindo a versão 4 com o plugin de Vite.
**Para que serve:** ter o Tailwind funcionando com o build do Start sem tropeçar na configuração.
**Quando usar:** ao adicionar Tailwind ao projeto. A configuração da versão 4 é bem diferente da 3,
então confira qual você está usando.

```ts
// vite.config.ts, Tailwind 4: plugin de Vite, sem postcss.config e sem content[]
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default { plugins: [tailwindcss(), tanstackStart()] }
```

```css
/* src/styles.css, Tailwind 4: um @import no lugar das três diretivas da v3 */
@import 'tailwindcss';
```

#### guide/rendering-markdown
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/rendering-markdown) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/rendering-markdown.md)
**O que é:** abordagens para renderizar Markdown e MDX, em tempo de build ou em runtime.
**Para que serve:** blog, documentação e páginas de conteúdo dentro do app.
**Quando usar:** só se houver conteúdo em Markdown. Combine com prerendering para páginas estáticas.

```ts
import { createServerFn } from '@tanstack/react-start'

// Converter no SERVIDOR mantém o parser de Markdown fora do bundle do cliente,
// que costuma ser a maior economia desta página. Para congelar o resultado no
// build, some `.middleware([staticFunctionMiddleware])` — ver
// static-server-functions.
const lerPost = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { marked } = await import('marked')
    const { readFile } = await import('node:fs/promises')
    return marked.parse(await readFile(`content/${slug}.md`, 'utf8'))
  })
```

#### guide/seo
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/seo) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/seo.md)
**O que é:** gestão de título, meta tags, Open Graph e dados estruturados por rota.
**Para que serve:** aparecer decentemente em busca e em preview de link.
**Quando usar:** em toda página pública. Para painel autenticado, não faz diferença.

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/$id')({
  loader: async ({ params }) => ({ name: params.id }),
  // head recebe o resultado do loader: o título sai do dado real e vai no HTML
  // do servidor, que é o único que o crawler e o preview de link enxergam
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData.name} | Painel` },
      { property: 'og:title', content: loaderData.name },
    ],
  }),
})
```

#### guide/geo
[doc](https://tanstack.com/start/latest/docs/framework/react/guide/geo) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/start/framework/react/guide/geo.md)
**O que é:** acesso aos dados de geolocalização que a plataforma de hospedagem injeta no request,
como país e região.
**Para que serve:** conteúdo, moeda ou idioma diferentes por região, decididos no servidor.
**Quando usar:** só em app com comportamento regional. Depende inteiramente da hospedagem fornecer
esses cabeçalhos.

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

const moeda = createServerFn().handler(async () => {
  // o nome do cabeçalho é da PLATAFORMA, não do Start: muda entre Vercel,
  // Cloudflare e Netlify, e em dev local ele simplesmente não existe
  const pais =
    getRequestHeader('x-vercel-ip-country') ?? getRequestHeader('cf-ipcountry') ?? 'BR'
  return pais === 'BR' ? 'BRL' : 'USD'
})
```
