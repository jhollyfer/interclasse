# TanStack Router

Roteador React com type safety de ponta a ponta, incluindo os search params da URL.

**O que é:** um roteador para aplicações React que trata a URL inteira como estado tipado. Rota,
path params e **search params** são validados e tipados: se a rota espera `?page=2&status=active`,
o TypeScript sabe disso, e um `<Link>` para uma rota inexistente ou com parâmetro faltando não
compila. Traz ainda loaders de dados por rota, cache embutido, preload no hover e divisão de código
automática.

**Para que serve:** acabar com a classe de bug em que a URL e o estado do app divergem. Filtro,
página, ordenação e aba selecionada vivem na URL de forma tipada, então o link é compartilhável, o
botão de voltar funciona e ninguém erra o nome de um parâmetro em silêncio.

**Como usar:**

```bash
pnpm add @tanstack/react-router
pnpm add -D @tanstack/router-plugin
```

```tsx
export const Route = createFileRoute('/posts/')({
  validateSearch: (s: Record<string, unknown>) => ({ page: Number(s.page ?? 1) }),
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQuery()),
  component: PostList,
})

// tipado: errar o nome da rota ou do param não compila
<Link to="/posts/$id" params={{ id }} search={{ page: 2 }}>Ver</Link>
```

**Quando usar a biblioteca:** em SPA React com telas que dependem de estado na URL (listagens com
filtro, wizards, dashboards). Para um site de três páginas sem parâmetro nenhum, React Router ou até
nada resolvem com menos configuração.

**A regra de ouro:** search params são o lugar certo para estado que precisa ser compartilhável,
sobreviver ao F5 e funcionar com o botão voltar. Antes de criar um `useState` para um filtro, veja
se ele não pertence à URL.

**Links:** 54.

---

## Fundamentos

#### overview
[doc](https://tanstack.com/router/latest/docs/overview) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/overview.md)
**O que é:** a apresentação do roteador e das decisões que o distinguem, com destaque para a tipagem
dos search params.
**Para que serve:** entender o que ele oferece além de mapear URL para componente.
**Quando usar:** primeira leitura, e ao comparar com React Router.

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/')({
  // a URL vira estado validado, e é isso que separa este roteador dos outros
  validateSearch: (s: Record<string, unknown>) => ({ page: Number(s.page ?? 1) }),
  component: () => {
    const { page } = Route.useSearch() // page: number, não string
    // errar o nome da rota, do param ou do search é erro de COMPILAÇÃO
    return <Link to="/posts/" search={{ page: page + 1 }}>Próxima</Link>
  },
})
```

#### quick-start
[doc](https://tanstack.com/router/latest/docs/quick-start) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/quick-start.md)
**O que é:** o menor app funcional, com rota raiz, uma rota filha e navegação.
**Para que serve:** ver as peças se encaixando antes de mergulhar nos conceitos.
**Quando usar:** logo depois da visão geral, e ao montar uma prova de conceito rápida.

```tsx
// src/routes/__root.tsx: o layout de tudo, sempre montado
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <>
      <nav><Link to="/">Início</Link></nav>
      <Outlet /> {/* sem o Outlet, a rota casa e a tela fica vazia */}
    </>
  ),
})
```

#### devtools
[doc](https://tanstack.com/router/latest/docs/devtools) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/devtools.md)
**O que é:** o painel de desenvolvimento que mostra a árvore de rotas, a rota casada, os params e o
estado dos loaders.
**Para que serve:** ver por que a rota que casou não é a que você esperava, sem `console.log`.
**Quando usar:** **instale no primeiro dia**. É a ferramenta que mais acelera o entendimento do
roteador, especialmente com rotas aninhadas.

```tsx
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      {/* o pacote é devDependency e some do bundle de produção */}
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  ),
})
```

#### decisions-on-dx
[doc](https://tanstack.com/router/latest/docs/decisions-on-dx) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/decisions-on-dx.md)
**O que é:** o registro das decisões de design da API e o porquê de cada uma, incluindo o arquivo de
árvore de rotas gerado.
**Para que serve:** entender por que a API é do jeito que é, o que ajuda a não lutar contra ela.
**Quando usar:** quando algo parecer estranho ou verboso. Costuma haver um motivo, e ele está aqui.

```ts
// A decisão que explica o resto: o arquivo GERADO existe porque o TypeScript
// precisa enxergar a árvore inteira para tipar `to="/posts/$id"`.
import { routeTree } from './routeTree.gen'

// Editar routeTree.gen.ts na mão é perda de tempo: o plugin reescreve o arquivo
// a cada mudança em src/routes. Ele é saída de build versionada, não código.
export const arvore = routeTree
```

#### comparison
[doc](https://tanstack.com/router/latest/docs/comparison) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/comparison.md)
**O que é:** a tabela de comparação com React Router, Next.js e outros roteadores.
**Para que serve:** avaliação objetiva de features.
**Quando usar:** na escolha de stack, ou ao verificar se uma feature específica existe.

```tsx
// React Router: search param é string solta, e o parse é problema seu
// const [params] = useSearchParams()
// const page = Number(params.get('page') ?? 1) // pode ser NaN e ninguém avisa

// TanStack Router: o parse acontece na fronteira e o tipo se propaga.
// `validateSearch` é SÍNCRONO, então validador de schema assíncrono não serve
// aqui. É função à mão, e o tipo sai do retorno.
export const Route = createFileRoute('/posts/')({
  validateSearch: (search: Record<string, unknown>) => {
    const page = Number(search.page)

    // ?page=abc cai no default, nunca vira NaN
    return { page: Number.isInteger(page) && page >= 1 ? page : 1 }
  },
})
```

## Instalação

#### installation/manual
[doc](https://tanstack.com/router/latest/docs/installation/manual) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/installation/manual.md)
**O que é:** a instalação sem plugin de bundler, com rotas declaradas em código.
**Para que serve:** entender o mínimo necessário, sem geração de arquivo.
**Quando usar:** em projeto que não pode usar o plugin, ou para entender o que o plugin automatiza.

```tsx
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

const rootRoute = createRootRoute({ component: Outlet })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' })

// isto é exatamente o que o plugin geraria a partir de src/routes:
const routeTree = rootRoute.addChildren([indexRoute])
export const router = createRouter({ routeTree })
```

#### installation/with-vite
[doc](https://tanstack.com/router/latest/docs/installation/with-vite) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/installation/with-vite.md)
**O que é:** a configuração do plugin de Vite, que gera a árvore de rotas a partir dos arquivos e
faz a divisão de código.
**Para que serve:** o caminho recomendado e mais usado.
**Quando usar:** na configuração de qualquer projeto Vite. Confira aqui a **ordem dos plugins**, que
importa e quebra de forma silenciosa quando está errada.

```ts
import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // ORDEM: o router ANTES do react. Invertido, o plugin de React processa o
  // arquivo antes de a rota ser transformada, e a divisão automática some sem
  // erro nenhum no console.
  plugins: [tanstackRouter({ autoCodeSplitting: true }), react()],
})
```

#### installation/with-rspack
[doc](https://tanstack.com/router/latest/docs/installation/with-rspack) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/installation/with-rspack.md)
**O que é:** o plugin equivalente para Rspack.
**Para que serve:** mesma automação em projetos Rspack.
**Quando usar:** só nesse bundler.

```ts
// rsbuild.config.ts
import { tanstackRouter } from '@tanstack/router-plugin/rspack'

export default {
  // o nome do export é o MESMO em todos os bundlers: `tanstackRouter`. Os
  // antigos `TanStackRouterRspack`, `TanStackRouterWebpack` e
  // `TanStackRouterEsbuild` saíram, só muda o subcaminho do import.
  tools: { rspack: { plugins: [tanstackRouter({ autoCodeSplitting: true })] } },
}
```

#### installation/with-webpack
[doc](https://tanstack.com/router/latest/docs/installation/with-webpack) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/installation/with-webpack.md)
**O que é:** o plugin equivalente para Webpack.
**Para que serve:** mesma automação em projetos Webpack, geralmente legados.
**Quando usar:** só nesse bundler.

```ts
// webpack.config.js
import { tanstackRouter } from '@tanstack/router-plugin/webpack'

export default {
  plugins: [tanstackRouter({ autoCodeSplitting: true })],
}
```

#### installation/with-esbuild
[doc](https://tanstack.com/router/latest/docs/installation/with-esbuild) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/installation/with-esbuild.md)
**O que é:** o plugin equivalente para esbuild.
**Para que serve:** mesma automação em projetos esbuild.
**Quando usar:** só nesse bundler.

```ts
import { build } from 'esbuild'
import { tanstackRouter } from '@tanstack/router-plugin/esbuild'

await build({
  entryPoints: ['src/main.tsx'],
  plugins: [tanstackRouter({ autoCodeSplitting: true })],
})
```

#### installation/with-router-cli
[doc](https://tanstack.com/router/latest/docs/installation/with-router-cli) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/installation/with-router-cli.md)
**O que é:** a CLI que gera a árvore de rotas fora do bundler, em modo único ou em watch.
**Para que serve:** gerar rotas em CI, ou em setup onde plugin de bundler não é opção.
**Quando usar:** ao ver `routeTree.gen.ts` desatualizado no pipeline. Rodar a CLI no build resolve.

```bash
pnpm add -D @tanstack/router-cli

pnpm tsr generate   # uma vez, ideal no passo anterior ao build em CI
pnpm tsr watch      # em desenvolvimento, se você não usa o plugin
```

#### installation/migrate-from-react-router
[doc](https://tanstack.com/router/latest/docs/installation/migrate-from-react-router) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/installation/migrate-from-react-router.md)
**O que é:** o mapa de equivalências entre React Router e TanStack Router, rota a rota e hook a hook.
**Para que serve:** migrar sem redescobrir cada API.
**Quando usar:** só numa migração real.

```tsx
// React Router            ->  TanStack Router
// <Routes>/<Route>        ->  createFileRoute por arquivo
// useParams()             ->  Route.useParams()      (tipado)
// useSearchParams()       ->  Route.useSearch()      (validado e tipado)
// useNavigate()           ->  useNavigate({ from })  (destino tipado)
// <Outlet />              ->  <Outlet />             (igual)
// loader({ params })      ->  loader({ params })     (igual, com tipo)

import { useNavigate } from '@tanstack/react-router'
const navigate = useNavigate({ from: '/posts/' })
navigate({ to: '/posts/$id', params: { id: '1' } })
```

#### installation/migrate-from-react-location
[doc](https://tanstack.com/router/latest/docs/installation/migrate-from-react-location) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/installation/migrate-from-react-location.md)
**O que é:** o guia de migração do React Location, o antecessor da mesma equipe.
**Para que serve:** portar projetos antigos.
**Quando usar:** praticamente nunca. React Location está descontinuado há tempos.

```bash
# Projeto novo não passa por aqui. Se o seu ainda usa React Location:
pnpm remove @tanstack/react-location
pnpm add @tanstack/react-router
# a ideia de search params tipados veio de lá, então o modelo mental já serve
```

## Roteamento

#### routing/routing-concepts
[doc](https://tanstack.com/router/latest/docs/routing/routing-concepts) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/routing/routing-concepts.md)
**O que é:** os conceitos centrais: rota raiz, rotas aninhadas, rotas index, pathless (de layout),
rotas curinga e rotas 404.
**Para que serve:** o vocabulário sem o qual o resto da doc não faz sentido.
**Quando usar:** **antes de criar o segundo arquivo de rota**. As rotas pathless, que agrupam sem
aparecer na URL, são o conceito que mais rende e que menos gente descobre sozinha.

```tsx
// src/routes/_authenticated.tsx: rota PATHLESS. O underscore some da URL, mas o
// layout e o beforeLoad valem para todos os filhos. É onde a proteção mora.
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/authentication/sign-in' })
  },
  component: Outlet,
})

// src/routes/_authenticated/dashboard.tsx  ->  URL /dashboard, já protegida
```

#### routing/route-trees
[doc](https://tanstack.com/router/latest/docs/routing/route-trees) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/routing/route-trees.md)
**O que é:** como a árvore de rotas é montada e como o aninhamento de layout se reflete nela.
**Para que serve:** planejar a hierarquia de layouts do app.
**Quando usar:** ao desenhar a estrutura de navegação, especialmente com áreas de layout diferentes
(público e autenticado, por exemplo).

```ts
// A árvore de arquivos É a hierarquia de layouts:
//
// routes/
//   __root.tsx            sempre montado
//   _public.tsx           layout de visitante
//     _public/index.tsx   /
//   _authenticated.tsx          layout com menu, exige sessão
//     _authenticated/dashboard.tsx /dashboard
//
// Cada nível encaixa no <Outlet /> do pai, e o beforeLoad do pai roda antes do
// loader do filho. Layout errado no desenho custa refatoração de URL depois.
```

#### routing/route-matching
[doc](https://tanstack.com/router/latest/docs/routing/route-matching) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/routing/route-matching.md)
**O que é:** as regras de precedência que decidem qual rota casa quando mais de uma poderia casar.
**Para que serve:** prever qual rota vence entre uma estática e uma dinâmica.
**Quando usar:** quando a rota errada renderizar. Junto com o devtools, resolve o problema em
minutos.

```ts
// Precedência, da mais específica para a mais genérica:
//
// /posts/novo      estática  vence
// /posts/$id       dinâmica  só se nenhuma estática casar
// /posts/$         curinga   último recurso
//
// Por isso /posts/novo NÃO cai em $id com id === 'novo'. A ordem dos
// arquivos no disco não influencia: quem decide é a especificidade.
```

#### routing/file-based-routing
[doc](https://tanstack.com/router/latest/docs/routing/file-based-routing) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/routing/file-based-routing.md)
**O que é:** o roteamento por arquivos, em que a estrutura de pastas vira a árvore de rotas, e o
papel do `routeTree.gen.ts`.
**Para que serve:** a abordagem recomendada, com menos código repetido.
**Quando usar:** o tempo todo, se o projeto usa arquivos. É a página mais consultada desta seção.

```tsx
// src/routes/users/$id.tsx  ->  /users/:id
import { createFileRoute } from '@tanstack/react-router'

// a string do createFileRoute é preenchida pelo plugin e precisa bater com o
// caminho do arquivo: editar uma sem a outra quebra a tipagem
export const Route = createFileRoute('/users/$id')({
  component: () => <p>{Route.useParams().id}</p>,
})
```

#### routing/virtual-file-routes
[doc](https://tanstack.com/router/latest/docs/routing/virtual-file-routes) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/routing/virtual-file-routes.md)
**O que é:** definir a árvore de rotas em código, mas apontando para arquivos, quando a estrutura de
pastas não pode espelhar as rotas.
**Para que serve:** organizar arquivos por feature mantendo URLs independentes dessa organização.
**Quando usar:** quando a estrutura de pastas que você quer brigar com as URLs que você precisa.

```ts
// routes.ts: a URL deixa de ser refém da pasta
import { rootRoute, route, index } from '@tanstack/virtual-file-routes'

export const routes = rootRoute('root.tsx', [
  index('features/home/pagina.tsx'),
  // arquivo mora em features/users, URL continua /users
  route('/users', 'features/users/lista.tsx'),
])
```

#### routing/code-based-routing
[doc](https://tanstack.com/router/latest/docs/routing/code-based-routing) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/routing/code-based-routing.md)
**O que é:** declarar rotas inteiramente em código, sem arquivos nem geração.
**Para que serve:** rotas dinâmicas em runtime, ou projetos que não usam o plugin.
**Quando usar:** raro. O roteamento por arquivos é melhor em quase todos os casos.

```ts
import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './root'

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'users',
  // sem plugin não há divisão automática de código: o componente entra
  // inteiro no bundle inicial, a menos que você use lazyRouteComponent
})

export const routeTree = rootRoute.addChildren([usersRoute])
```

#### routing/file-naming-conventions
[doc](https://tanstack.com/router/latest/docs/routing/file-naming-conventions) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/routing/file-naming-conventions.md)
**O que é:** a tabela de convenções de nome: `$param`, `_layout`, `index`, `route`, `(grupo)`,
`-arquivo-ignorado`, `$` curinga.
**Para que serve:** decifrar e escrever nomes de arquivo de rota.
**Quando usar:** **mantenha aberta nas primeiras semanas**. É referência pura, e cada símbolo tem um
significado que não dá para adivinhar.

```ts
// src/routes/
//   index.tsx              /
//   users.index.tsx     /users          (a listagem)
//   users.$id.tsx       /users/:id      ($ = param)
//   users.route.tsx     layout de /users, com <Outlet />
//   _authenticated.tsx           layout SEM segmento na URL (_ = pathless)
//   (marketing)/sobre.tsx  /sobre             (parênteses = só organização)
//   -componentes/tabela.tsx   IGNORADO pelo roteador (- = arquivo comum)
//   $.tsx                  curinga, o 404 de qualquer caminho não casado
```

## Navegação

#### guide/url-rewrites
[doc](https://tanstack.com/router/latest/docs/guide/url-rewrites) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/url-rewrites.md)
**O que é:** reescrever a URL entre o que o usuário vê e o que o roteador processa.
**Para que serve:** prefixo de idioma, migração de URLs antigas, subcaminho de deploy.
**Quando usar:** ao servir o app sob um subcaminho, ou ao manter URLs legadas funcionando.

```ts
import { createRouter } from '@tanstack/react-router'

export const router = createRouter({
  routeTree,
  // o app é servido em /dashboard, mas a árvore de rotas continua começando em /
  basepath: '/dashboard',
  // assim nenhuma rota precisa saber onde o app foi publicado
})
```

#### guide/navigation
[doc](https://tanstack.com/router/latest/docs/guide/navigation) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/navigation.md)
**O que é:** as formas de navegar: componente `<Link>`, hook `useNavigate`, função `redirect` e as
opções `replace`, `resetScroll` e navegação relativa.
**Para que serve:** ir de uma tela a outra preservando a tipagem.
**Quando usar:** o tempo todo. **Prefira `<Link>` sempre que houver algo clicável**, porque ele dá
preload no hover e um `<a>` de verdade, coisas que `useNavigate` não dá.

```tsx
import { Link, useNavigate } from '@tanstack/react-router'

// clicável: <Link> vira <a href>, abre em nova aba, é indexável e pré-carrega
;<Link to="/users/$id" params={{ id: '1' }} activeProps={{ className: 'font-bold' }}>
  Ver user
</Link>

// só depois de um efeito (salvar, autenticar): aí sim useNavigate
const navigate = useNavigate()
await salvar()
navigate({ to: '/users/', replace: true }) // replace não empilha no histórico
```

#### guide/link-options
[doc](https://tanstack.com/router/latest/docs/guide/link-options) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/link-options.md)
**O que é:** o helper `linkOptions`, que declara opções de link tipadas fora do JSX e reaproveitáveis.
**Para que serve:** montar itens de menu e navegação em array sem perder a tipagem do destino.
**Quando usar:** ao construir menu lateral, breadcrumb ou abas a partir de uma lista de objetos.

```tsx
import { linkOptions, Link } from '@tanstack/react-router'

// sem linkOptions o array vira `{ to: string }` e a checagem de rota se perde
const menu = [
  linkOptions({ to: '/users/', label: 'Users' }),
  linkOptions({ to: '/posts/', label: 'Posts' }),
]

export const Menu = () => menu.map((item) => <Link key={item.to} {...item}>{item.label}</Link>)
```

#### guide/custom-link
[doc](https://tanstack.com/router/latest/docs/guide/custom-link) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/custom-link.md)
**O que é:** como envolver o `<Link>` num componente próprio preservando toda a inferência de tipos.
**Para que serve:** um `<Link>` estilizado com a sua biblioteca de UI, sem perder autocomplete de
rota.
**Quando usar:** ao integrar com uma biblioteca de componentes. Feito errado, o wrapper mata a
tipagem, e essa página mostra o jeito certo.

```tsx
import { createLink } from '@tanstack/react-router'
import { forwardRef } from 'react'

const Base = forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<'a'>>((props, ref) => (
  <a ref={ref} className="text-primary underline" {...props} />
))

// createLink é o que mantém `to`, `params` e `search` tipados no wrapper.
// Envolver <Link> na mão devolve `to: string` e mata o autocomplete.
export const LinkEstilizado = createLink(Base)
```

#### guide/path-params
[doc](https://tanstack.com/router/latest/docs/guide/path-params) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/path-params.md)
**O que é:** parâmetros de caminho (`$id`), o hook `useParams` e a análise e serialização deles.
**Para que serve:** ler o identificador da rota de detalhe.
**Quando usar:** em toda rota de detalhe. A análise permite converter para número já tipado, em vez
de receber string sempre.

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$id')({
  // sem params, `id` chega sempre como string, porque a URL só tem texto
  params: {
    parse: (raw) => ({ id: Number(raw.id) }),
    stringify: ({ id }) => ({ id: String(id) }),
  },
  loader: ({ params }) => params.id, // number, e o loader não precisa converter
})
```

#### guide/search-params
[doc](https://tanstack.com/router/latest/docs/guide/search-params) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/search-params.md)
**O que é:** search params tipados: `validateSearch`, o hook `useSearch`, atualização com
`navigate({ search })` e herança entre rotas aninhadas.
**Para que serve:** a feature mais distintiva do roteador. Filtro, página e ordenação viram estado
validado na URL.
**Quando usar:** **em toda listagem com filtro ou paginação**. Vale ler inteira.

O detalhe que economiza uma tarde: `validateSearch` roda **síncrono**. Biblioteca de schema cujo
`validate` devolve promessa não pode ser usada aqui — nem via Standard Schema, que o roteador aceita
mas continua exigindo resposta síncrona. Search param se valida com função à mão, e o tipo sai do
retorno dela. Vale conferir isso antes de reaproveitar o validador que o resto do app já usa.

```tsx
import { createFileRoute } from '@tanstack/react-router'

// Sem biblioteca: a função é o schema, e o tipo do retorno é o tipo do search.
function validateSearch(search: Record<string, unknown>) {
  const page = Number(search.page)

  return {
    // URL adulterada cai no default em vez de propagar NaN
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
  }
}

export const Route = createFileRoute('/posts/')({
  validateSearch,
  // atualização parcial: o que não for informado é preservado
  component: () => {
    const navigate = Route.useNavigate()
    return <button onClick={() => navigate({ search: (s) => ({ ...s, page: s.page + 1 }) })} />
  },
})
```

#### guide/custom-search-param-serialization
[doc](https://tanstack.com/router/latest/docs/guide/custom-search-param-serialization) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/custom-search-param-serialization.md)
**O que é:** trocar o formato de serialização dos search params, por exemplo JSON comprimido ou
base64.
**Para que serve:** URLs mais curtas quando o estado é grande, ou compatibilidade com formato
existente.
**Quando usar:** só quando a URL padrão ficar longa demais. O formato padrão é legível e depurável,
e trocar isso custa clareza.

```ts
import { createRouter, parseSearchWith, stringifySearchWith } from '@tanstack/react-router'

export const router = createRouter({
  routeTree,
  // preço da troca: ?filtros=eyJxIjoiYSJ9 não é mais legível nem editável na
  // barra de endereço, e depurar filtro pelo link deixa de funcionar
  parseSearch: parseSearchWith((v) => JSON.parse(atob(v))),
  stringifySearch: stringifySearchWith((v) => btoa(JSON.stringify(v))),
})
```

#### guide/route-masking
[doc](https://tanstack.com/router/latest/docs/guide/route-masking) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/route-masking.md)
**O que é:** mostrar uma URL na barra de endereço e renderizar outra rota por baixo.
**Para que serve:** o padrão de modal com URL própria: a foto abre em modal sobre a listagem, mas a
URL é a da foto, e recarregar a página abre a foto em tela cheia.
**Quando usar:** ao implementar modal compartilhável por link. É a solução elegante para um problema
clássico.

```tsx
import { Link } from '@tanstack/react-router'

// a URL vira /fotos/7 (compartilhável), mas quem renderiza é a rota de baixo,
// que abre o modal sobre a listagem. No F5 a máscara some e a rota real assume.
;<Link
  to="/fotos/$id"
  params={{ id: '7' }}
  mask={{ to: '/fotos/$id', params: { id: '7' } }}
>
  Abrir foto
</Link>
```

#### guide/navigation-blocking
[doc](https://tanstack.com/router/latest/docs/guide/navigation-blocking) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/navigation-blocking.md)
**O que é:** interceptar a saída de uma rota, com `useBlocker` e o componente `<Block>`.
**Para que serve:** o "você tem alterações não salvas, deseja sair?".
**Quando usar:** em formulários longos. Cobre navegação interna, e a página explica os limites com o
fechamento de aba do navegador.

```tsx
import { useBlocker } from '@tanstack/react-router'

function Formulario({ sujo }: { sujo: boolean }) {
  // cobre navegação DENTRO do app. Fechar a aba é outro mecanismo
  // (beforeunload), e o navegador não deixa customizar a mensagem.
  useBlocker({ shouldBlockFn: () => sujo && !confirm('Sair sem salvar?') })
  return <form />
}
```

#### guide/history-types
[doc](https://tanstack.com/router/latest/docs/guide/history-types) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/history-types.md)
**O que é:** os tipos de histórico: browser, hash e memória.
**Para que serve:** rodar em ambientes sem servidor configurável (hash) ou em teste (memória).
**Quando usar:** ao publicar em hospedagem estática sem fallback de SPA, e ao escrever testes de
componente que navegam.

```ts
import { createMemoryHistory, createRouter } from '@tanstack/react-router'

// em teste: histórico em memória, sem navegador, com a URL inicial que o caso
// exige. Sem isto, o teste começa sempre em '/'.
const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ['/users/1'] }),
})
```

#### guide/scroll-restoration
[doc](https://tanstack.com/router/latest/docs/guide/scroll-restoration) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/scroll-restoration.md)
**O que é:** restaurar a posição de rolagem ao voltar, incluindo containers com rolagem própria.
**Para que serve:** voltar de um detalhe para a listagem e cair no mesmo ponto da lista.
**Quando usar:** em qualquer app com listas longas. Se a rolagem é de um `div` interno e não da
janela, a configuração extra está documentada aqui.

```tsx
import { createRouter, useElementScrollRestoration } from '@tanstack/react-router'

// caso simples: uma opção no router e a janela já é restaurada
const router = createRouter({ routeTree, scrollRestoration: true })

// caso do painel com <main> rolável: a janela não rola, então o elemento
// precisa ser registrado explicitamente
function Lista() {
  const entry = useElementScrollRestoration({ id: 'lista-posts' })
  return <div data-scroll-restoration-id="lista-posts" ref={entry?.ref} />
}
```

#### guide/internationalization-i18n
[doc](https://tanstack.com/router/latest/docs/guide/internationalization-i18n) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/internationalization-i18n.md)
**O que é:** padrões para idioma na rota, com prefixo de URL e detecção.
**Para que serve:** URLs por idioma sem duplicar a árvore de rotas.
**Quando usar:** só em app multi-idioma com URL por idioma.

```tsx
// src/routes/$locale.tsx: um segmento dinâmico no topo cobre o app inteiro
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'

const IDIOMAS = ['pt', 'en'] as const

export const Route = createFileRoute('/$locale')({
  // validar aqui evita que /xx/qualquer-coisa entre na árvore
  beforeLoad: ({ params }) => {
    if (!IDIOMAS.includes(params.locale as (typeof IDIOMAS)[number])) throw notFound()
  },
  component: Outlet,
})
```

## Divisão de código

#### guide/code-splitting
[doc](https://tanstack.com/router/latest/docs/guide/code-splitting) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/code-splitting.md)
**O que é:** dividir o bundle por rota manualmente, quebrando a rota em dois arquivos com o sufixo
`.lazy.tsx` e `createLazyFileRoute`.
**Para que serve:** não mandar o app inteiro no primeiro carregamento.
**Quando usar:** quando o bundle inicial incomodar. Veja antes a divisão automática, que costuma
bastar.

```tsx
// src/routes/relatorios.tsx — o CRÍTICO fica aqui, no bundle inicial
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/relatorios/')({
  // loader e validateSearch ficam de fora da divisão de propósito: precisam
  // rodar ANTES de o componente chegar, senão a divisão vira cascata
  loader: () => null,
})

// src/routes/relatorios.lazy.tsx — o resto, carregado sob demanda
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/relatorios/')({
  component: RelatorioPesado,
})

// `lazyRouteComponent` continua existindo, mas é a saída de quem declara
// rota em código, sem arquivos.
```

#### guide/automatic-code-splitting
[doc](https://tanstack.com/router/latest/docs/guide/automatic-code-splitting) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/automatic-code-splitting.md)
**O que é:** a divisão automática feita pelo plugin de bundler, que separa componente, loader e
código crítico da rota.
**Para que serve:** o benefício sem trabalho manual.
**Quando usar:** ligue já na configuração inicial. Uma linha, e torna a divisão manual quase sempre
desnecessária.

```ts
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default {
  // uma opção, e cada rota vira um chunk com o corte já no lugar certo
  plugins: [tanstackRouter({ autoCodeSplitting: true })],
}
```

## Dados

#### guide/data-loading
[doc](https://tanstack.com/router/latest/docs/guide/data-loading) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/data-loading.md)
**O que é:** o `loader` de rota, o cache embutido, `staleTime`, `useLoaderData` e a invalidação.
**Para que serve:** carregar dados **em paralelo** com o componente, e não depois que ele monta, o
que elimina a cascata clássica de requisições.
**Quando usar:** em toda rota que precisa de dados. **Se o projeto usa TanStack Query, leia esta
página junto com `integrations/query`**, porque a divisão de responsabilidade entre os dois é a
dúvida mais frequente.

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/')({
  // o loader dispara junto com o carregamento do componente, não depois:
  // é isso que mata a cascata "monta, useEffect, fetch, spinner"
  loader: async () => ({ users: await fetch('/api/users').then((r) => r.json()) }),
  staleTime: 30_000, // 30s sem refazer ao revisitar a rota
  component: () => <p>{Route.useLoaderData().users.length}</p>,
})
```

#### guide/deferred-data-loading
[doc](https://tanstack.com/router/latest/docs/guide/deferred-data-loading) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/deferred-data-loading.md)
**O que é:** adiar parte dos dados com `Await` e promessas, mostrando a página antes de tudo chegar.
**Para que serve:** renderizar o essencial imediatamente e preencher o resto depois.
**Quando usar:** quando uma consulta lenta segura a página inteira. Renderize o rápido e adie o
lento.

```tsx
import { Await, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  loader: async () => ({
    resumo: await buscarResumo(), // rápido: esperado
    graficos: buscarGraficos(), // lento: a PROMESSA é retornada, sem await
  }),
  component: () => {
    const { graficos } = Route.useLoaderData()
    return <Await promise={graficos} fallback={<span>carregando</span>}>{(g) => <p>{g.total}</p>}</Await>
  },
})
```

#### guide/external-data-loading
[doc](https://tanstack.com/router/latest/docs/guide/external-data-loading) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/external-data-loading.md)
**O que é:** integrar bibliotecas externas de dados com os loaders de rota.
**Para que serve:** conviver com TanStack Query, tRPC, SWR ou qualquer outra camada de dados.
**Quando usar:** ao decidir quem é dono do cache. Ter dois caches sem essa decisão explícita é fonte
garantida de dado desatualizado.

```ts
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/')({
  // a decisão explícita: o CACHE é do Query, o loader só garante que o dado
  // exista antes do render. O loader não retorna dado, e por isso não há
  // segunda cópia para desatualizar.
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQuery()),
})
```

#### guide/data-mutations
[doc](https://tanstack.com/router/latest/docs/guide/data-mutations) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/data-mutations.md)
**O que é:** os padrões de escrita e a invalidação de rota depois de uma mutação.
**Para que serve:** garantir que a tela reflita a escrita que acabou de acontecer.
**Quando usar:** ao implementar criar, editar e remover. `router.invalidate()` é o que força os
loaders a recarregarem.

```ts
import { useRouter } from '@tanstack/react-router'

function useRemover() {
  const router = useRouter()
  return async (id: string) => {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    // sem invalidate, o loader continua servindo a lista antiga do cache e o
    // item removido segue na tela
    await router.invalidate()
  }
}
```

#### guide/preloading
[doc](https://tanstack.com/router/latest/docs/guide/preloading) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/preloading.md)
**O que é:** pré-carregar rota e dados no hover ou no *intent*, com `defaultPreload` e o atraso
configurável.
**Para que serve:** navegação que parece instantânea, porque o dado já chegou antes do clique.
**Quando usar:** **ligue `defaultPreload: 'intent'` na criação do router**. É uma linha e é a
melhoria de percepção de velocidade mais barata do ecossistema.

```ts
import { createRouter } from '@tanstack/react-router'

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent', // hover ou foco de teclado já carrega rota e loader
  defaultPreloadDelay: 50, // evita disparar em quem só passa o mouse de raspão
  defaultPreloadStaleTime: 0, // deixa o cache do Query mandar no que é fresco
})
```

## Render e SSR

#### guide/document-head-management
[doc](https://tanstack.com/router/latest/docs/guide/document-head-management) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/document-head-management.md)
**O que é:** definir título, meta tags, links e scripts por rota.
**Para que serve:** título da aba e SEO por página, sem biblioteca extra.
**Quando usar:** em toda rota que mereça título próprio, que é basicamente todas.

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/$id')({
  loader: ({ params }) => ({ name: params.id }),
  // head recebe o resultado do loader, então o título usa o dado real
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData.name} | Painel` }],
  }),
})
```

#### guide/ssr
[doc](https://tanstack.com/router/latest/docs/guide/ssr) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/ssr.md)
**O que é:** o suporte a SSR no roteador puro, com desidratação e reidratação do estado.
**Para que serve:** SSR sem adotar o Start inteiro.
**Quando usar:** se você faz SSR só com Router. Usando o Start, a doc dele cobre isso com mais
contexto.

```tsx
// servidor: renderiza com o router já carregado para a URL do request
import { renderToString } from 'react-dom/server'
import { RouterProvider, createRouter } from '@tanstack/react-router'

const router = createRouter({ routeTree })
await router.load() // sem isto o HTML sai com os loaders ainda pendentes
const html = renderToString(<RouterProvider router={router} />)
```

#### guide/render-optimizations
[doc](https://tanstack.com/router/latest/docs/guide/render-optimizations) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/render-optimizations.md)
**O que é:** as otimizações automáticas do roteador (comparação estrutural, seletores) e como não
atrapalhá-las.
**Para que serve:** evitar re-render em cascata a cada mudança de search param.
**Quando usar:** quando notar re-render excessivo. Costuma ser uso de hook sem seletor.

```tsx
// ERRADO: re-renderiza a cada mudança de QUALQUER search param
const search = Route.useSearch()
const page = search.page

// CERTO: o seletor faz o componente acordar só quando `page` mudar
const page = Route.useSearch({ select: (s) => s.page })
```

## Configuração do router

#### guide/creating-a-router
[doc](https://tanstack.com/router/latest/docs/guide/creating-a-router) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/creating-a-router.md)
**O que é:** `createRouter` e suas opções: contexto, defaults de preload, componentes de erro e de
404, e o registro de tipos.
**Para que serve:** o ponto único de configuração global do roteamento.
**Quando usar:** na configuração inicial. É aqui que ficam os padrões que valem para o app todo, e
onde mora o `declare module` que faz a tipagem global funcionar.

```tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true })
}

// o registro é o que dá tipo a `to=` em TODO o app. Sem ele nada quebra em
// runtime, mas o autocomplete some e o erro de rota vira erro de produção.
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

#### guide/outlets
[doc](https://tanstack.com/router/latest/docs/guide/outlets) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/outlets.md)
**O que é:** o componente `<Outlet />`, o buraco onde a rota filha renderiza dentro do layout.
**Para que serve:** layouts aninhados com cabeçalho e menu compartilhados.
**Quando usar:** em toda rota de layout. Esquecer o `<Outlet />` é o motivo de "a rota casa mas a
tela fica vazia".

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  component: () => (
    <div className="flex">
      <aside>menu</aside>
      <main>
        <Outlet /> {/* a rota filha renderiza AQUI, e só aqui */}
      </main>
    </div>
  ),
})
```

#### guide/router-events
[doc](https://tanstack.com/router/latest/docs/guide/router-events) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/router-events.md)
**O que é:** a assinatura de eventos do ciclo de navegação, como início e fim de carregamento.
**Para que serve:** barra de progresso global, e envio de page view para analytics.
**Quando usar:** ao adicionar indicador de carregamento global ou rastreamento de navegação.

```ts
// a assinatura devolve a função de cancelamento: guardar e chamar no unmount,
// senão cada hot reload empilha mais um ouvinte
const cancelar = router.subscribe('onResolved', ({ toLocation }) => {
  analytics.pageView(toLocation.pathname)
})

// em desenvolvimento: cancelar() no cleanup do efeito
```

#### guide/type-safety
[doc](https://tanstack.com/router/latest/docs/guide/type-safety) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/type-safety.md)
**O que é:** como a tipagem funciona de ponta a ponta, o registro do router via `declare module`, e
os pontos onde os tipos se propagam.
**Para que serve:** entender por que o autocomplete funciona, e por que às vezes ele some.
**Quando usar:** **quando os tipos quebrarem**. O registro ausente ou o `routeTree.gen.ts`
desatualizado explicam a maioria dos casos.

```ts
// O diagnóstico, em ordem de probabilidade:
// 1. routeTree.gen.ts velho          -> pnpm tsr generate
// 2. `declare module` ausente        -> ver creating-a-router
// 3. useNavigate sem `from`          -> destino relativo não tem como ser tipado
// 4. wrapper de <Link> feito na mão  -> usar createLink

import { useNavigate } from '@tanstack/react-router'
const navigate = useNavigate({ from: '/users/' }) // o `from` é o que tipa o relativo
```

#### guide/type-utilities
[doc](https://tanstack.com/router/latest/docs/guide/type-utilities) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/type-utilities.md)
**O que é:** os tipos utilitários exportados para extrair tipos de rota, de params e de search.
**Para que serve:** tipar funções e componentes próprios que recebem dados de rota.
**Quando usar:** ao escrever helpers genéricos sobre rotas, sem duplicar tipos na mão.

```ts
import type { RegisteredRouter, RouteIds } from '@tanstack/react-router'

// o tipo sai da árvore de rotas real: rota removida vira erro de compilação
// em quem a citava, em vez de string morta esperando o runtime
type IdDeRota = RouteIds<RegisteredRouter['routeTree']>

export function tituloDe(id: IdDeRota) {
  return id
}
```

#### guide/router-context
[doc](https://tanstack.com/router/latest/docs/guide/router-context) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/router-context.md)
**O que é:** um objeto tipado injetado no router e disponível em loaders, `beforeLoad` e
componentes, com possibilidade de enriquecer por rota.
**Para que serve:** distribuir dependências, como o cliente do TanStack Query, a sessão do usuário
ou um cliente de API.
**Quando usar:** **é o mecanismo de injeção de dependência do roteador**. Leia junto com
`authenticated-routes` e `integrations/query`, porque as duas dependem dele.

```tsx
import { createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

type Contexto = { queryClient: QueryClient; user: { id: string } | null }

// declarar o contexto na raiz é o que o torna tipado em TODO loader e beforeLoad
export const Route = createRootRouteWithContext<Contexto>()({})

// o beforeLoad de um filho pode ENRIQUECER o contexto, e o tipo desce junto:
// beforeLoad: ({ context }) => ({ user: exigirUsuario(context) })
```

#### guide/not-found-errors
[doc](https://tanstack.com/router/latest/docs/guide/not-found-errors) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/not-found-errors.md)
**O que é:** `notFound()` e os componentes de 404, globais e por rota.
**Para que serve:** distinguir "URL não existe" de "o registro não existe", com telas diferentes.
**Quando usar:** em toda rota de detalhe. Lançar `notFound()` do loader quando o registro sumiu é o
padrão correto.

```tsx
import { createFileRoute, notFound } from '@tanstack/react-router'

export const Route = createFileRoute('/users/$id')({
  loader: async ({ params }) => {
    const user = await buscar(params.id)
    // `throw notFound()`, não `return null`: o roteador precisa saber que o
    // registro sumiu para renderizar o 404 em vez do componente com dado vazio
    if (!user) throw notFound()
    return user
  },
  notFoundComponent: () => <p>User não encontrada</p>,
})
```

#### guide/authenticated-routes
[doc](https://tanstack.com/router/latest/docs/guide/authenticated-routes) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/authenticated-routes.md)
**O que é:** proteger rotas com `beforeLoad`, redirecionar quem não está autenticado e voltar para a
página pretendida depois do login.
**Para que serve:** a área logada do app.
**Quando usar:** ao implementar login. **Proteja no layout pai, não em cada rota filha**, para que
rota nova nasça protegida por estar no lugar certo.

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      // guardar a origem é o que permite voltar para a tela pretendida depois
      throw redirect({ to: '/authentication/sign-in', search: { redirect: location.href } })
    }
  },
})
// Mesma ideia do grupo de rotas com middleware no backend: a exigência fica no
// GRUPO, e rota nova nasce protegida por estar dentro dele.
```

#### guide/static-route-data
[doc](https://tanstack.com/router/latest/docs/guide/static-route-data) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/static-route-data.md)
**O que é:** anexar metadados estáticos à definição da rota, via `staticData`.
**Para que serve:** rótulo de breadcrumb, ícone de menu, permissão exigida, tudo declarado junto da
rota.
**Quando usar:** ao montar breadcrumb ou menu a partir da árvore de rotas, em vez de manter uma
lista paralela que sempre dessincroniza.

```tsx
import { createFileRoute, useMatches } from '@tanstack/react-router'

export const Route = createFileRoute('/users/')({
  staticData: { titulo: 'Users' },
})

// o breadcrumb se monta sozinho a partir das rotas casadas: rota nova aparece
// no menu por existir, sem editar uma lista paralela
const trilha = useMatches().map((m) => m.staticData.titulo).filter(Boolean)
```

## Integrações

#### integrations/query
[doc](https://tanstack.com/router/latest/docs/integrations/query) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/integrations/query.md)
**O que é:** a integração oficial com TanStack Query: `queryClient` no contexto do router,
`ensureQueryData` no loader e SSR combinado.
**Para que serve:** o loader garante que o dado exista antes de renderizar, e o componente consome
com `useSuspenseQuery` já do cache. Sem cascata e sem cache duplicado.
**Quando usar:** **obrigatória se o projeto usa Router e Query juntos**. É a página que define quem
faz o quê, e ignorá-la leva a dois caches concorrentes.

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

const postsQuery = () => ({ queryKey: ['posts'], queryFn: listarPosts })

export const Route = createFileRoute('/posts/')({
  // loader: GARANTE que o dado existe (não devolve dado)
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQuery()),
  // componente: LÊ do cache do Query, já quente, sem suspender de verdade
  component: () => <p>{useSuspenseQuery(postsQuery()).data.length}</p>,
})
```

## ESLint

#### eslint/eslint-plugin-router
[doc](https://tanstack.com/router/latest/docs/eslint/eslint-plugin-router) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/eslint/eslint-plugin-router.md)
**O que é:** o plugin de ESLint oficial do roteador e como habilitá-lo.
**Para que serve:** pegar erro de uso do roteador na hora de escrever, não em runtime.
**Quando usar:** na configuração do lint do projeto. Custo baixo, retorno alto.

```ts
// eslint.config.js
import pluginRouter from '@tanstack/eslint-plugin-router'

export default [
  // duas regras que valem sozinhas o plugin: ordem de propriedades da rota e
  // uso correto dos hooks de rota
  ...pluginRouter.configs['flat/recommended'],
]
```

#### eslint/create-route-property-order
[doc](https://tanstack.com/router/latest/docs/eslint/create-route-property-order) | [markdown](https://raw.githubusercontent.com/tanstack/router/main/docs/router/eslint/create-route-property-order.md)
**O que é:** a regra que exige a ordem correta das propriedades em `createFileRoute`, porque a ordem
afeta a inferência de tipos.
**Para que serve:** evitar a perda silenciosa de tipagem por ordem errada de propriedades.
**Quando usar:** deixe ligada. É exatamente o tipo de detalhe que ninguém lembra e que custa uma
tarde de depuração.

```ts
// ERRADO: loader declarado antes de beforeLoad. O contexto enriquecido pelo
// beforeLoad não aparece tipado no loader, e o erro é só de tipo, silencioso.
// createFileRoute('/x')({ loader: ..., beforeLoad: ... })

// CERTO: params -> validateSearch -> beforeLoad -> loader -> component.
// Cada etapa alimenta a seguinte, e a ordem no objeto é o que a inferência lê.
createFileRoute('/x')({
  validateSearch: (s: Record<string, unknown>) => ({ page: Number(s.page ?? 1) }),
  beforeLoad: () => ({ user: { id: '1' } }),
  loader: ({ context }) => context.user.id,
})
```
