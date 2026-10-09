# TanStack Query

Gerenciador de estado de servidor: cache, revalidação, deduplicação e sincronização.

> Conferido contra `@tanstack/react-query@5.101.4` e `@tanstack/query-core@5.101.4` instalados. Duas
> coisas mudaram dentro da v5 e não quebram o build, então passam despercebidas: os callbacks de
> mutação ganharam um **quarto parâmetro** (`context`, com `client` dentro) e o terceiro virou
> `onMutateResult`; e existe agora um **`mutationOptions()`**, irmão do `queryOptions()`, que a doc
> do site ainda quase não menciona.

**O que é:** uma biblioteca que cuida de todo dado que **não pertence ao cliente**, ou seja, o que
vem de uma API. Ela guarda o resultado em cache por chave, deduplica requisições iguais feitas ao
mesmo tempo, revalida quando a janela volta ao foco, tenta de novo em caso de falha, e devolve
`isPending`, `isError` e `data` prontos. O que ela não é: um gerenciador de estado de interface.

**Para que serve:** apagar o `useEffect` com `fetch`, `setLoading`, `setError` e `setData` que todo
projeto reescreve dez vezes. Em troca você declara "esta chave corresponde a esta função de busca" e
a biblioteca resolve o resto, incluindo cache compartilhado entre componentes distantes.

**Como usar:**

```bash
pnpm add @tanstack/react-query
```

```tsx
const { data, isPending, error } = useQuery({
  queryKey: ['posts', { page }],
  queryFn: () => api.posts.list({ page }),
})

const { mutate } = useMutation({
  mutationFn: api.posts.create,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
})
```

**Quando usar a biblioteca:** em qualquer app que leia dados de uma API e mostre em mais de uma tela.
Só não use para estado que nasce e morre no cliente, como um modal aberto ou o valor de um input,
porque isso não é dado de servidor.

**A ideia que resolve 80% das dúvidas:** a `queryKey` **é** a identidade do cache. Se dois lugares
usam a mesma chave, compartilham o mesmo dado. Se a chave muda, é outra consulta. Invalidar por
prefixo (`['posts']` atinge `['posts', { page: 2 }]`) é o mecanismo que mantém a tela em dia depois
de uma escrita.

**A convenção que evita metade dos bugs:** nunca escreva `queryKey` e `queryFn` soltos num
componente. Declare-os juntos num `queryOptions()` e reuse esse objeto em toda parte — hook,
prefetch, `getQueryData`, invalidação. É o que a regra de ESLint `prefer-query-options` cobra, e o
que impede a mesma chave de acabar com duas funções diferentes.

**Links:** 57.

---

## Fundamentos

#### overview
[doc](https://tanstack.com/query/latest/docs/framework/react/overview) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/overview.md)
**O que é:** a apresentação do problema — por que estado de servidor é diferente de estado de
cliente — e o exemplo mínimo.
**Para que serve:** entender que a biblioteca resolve cache, deduplicação e sincronização, e não
"buscar dados".
**Quando usar:** primeira leitura, e quando precisar justificar a dependência para alguém.

```tsx
// O contrato inteiro numa chamada: uma chave, uma função, três estados prontos.
const { isPending, error, data } = useQuery({
  queryKey: ['repoData'],
  queryFn: () => fetch('https://api.github.com/repos/TanStack/query').then((res) => res.json()),
})
```

#### installation
[doc](https://tanstack.com/query/latest/docs/framework/react/installation) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/installation.md)
**O que é:** instalação do pacote e do plugin de ESLint.
**Para que serve:** deixar o projeto com as duas peças que andam juntas.
**Quando usar:** na instalação. Instale o plugin de ESLint **junto**, não depois: ele pega uma classe
de erro que nenhum tipo pega.

```bash
pnpm add @tanstack/react-query                 # requer React 18+
pnpm add -D @tanstack/eslint-plugin-query      # não é opcional na prática
pnpm add -D @tanstack/react-query-devtools     # pacote separado
```

#### quick-start
[doc](https://tanstack.com/query/latest/docs/framework/react/quick-start) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/quick-start.md)
**O que é:** os três conceitos numa tela só: query, mutation e invalidação.
**Para que serve:** ver o ciclo completo de leitura e escrita antes de entrar em detalhe.
**Quando usar:** na primeira integração. É o molde de praticamente toda tela de CRUD.

```tsx
const queryClient = new QueryClient()

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

```tsx
const queryClient = useQueryClient()

const query = useQuery({ queryKey: ['posts'], queryFn: getPosts })

const mutation = useMutation({
  mutationFn: createPost,
  // fecha o ciclo: sem isto a lista fica um item atrasada
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
})
```

#### devtools
[doc](https://tanstack.com/query/latest/docs/framework/react/devtools) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/devtools.md)
**O que é:** o painel que mostra cada query, seu estado, seus dados e seus observadores.
**Para que serve:** ver por que uma query está `stale`, quem a está observando e o que tem no cache.
**Quando usar:** **no primeiro dia.** Praticamente toda dúvida de "por que não atualizou" se responde
olhando o painel em vez de raciocinando.

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
</QueryClientProvider>

// Só entra no bundle quando NODE_ENV === 'development': não é preciso remover o
// componente nem envolver em condicional para o build de produção.
```

#### comparison
[doc](https://tanstack.com/query/latest/docs/framework/react/comparison) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/comparison.md)
**O que é:** a tabela de comparação contra SWR, Apollo, RTK-Query e React Router.
**Para que serve:** munição objetiva para decisão técnica.
**Quando usar:** ao justificar a escolha, ou ao avaliar se vale trocar. As quatro diferenças que a
tabela destaca são as que mais aparecem no dia a dia.

```txt
O que a tabela aponta como diferencial, e o que cada um significa na prática:

  lagged query data     dado anterior visível enquanto a próxima página carrega
  render optimization   re-render só quando um campo LIDO muda, com batching
  partial matching      invalidar ['posts'] atinge todas as variações da chave
  garbage collection    cache inativo é liberado sozinho; SWR e Apollo não fazem
```

#### typescript
[doc](https://tanstack.com/query/latest/docs/framework/react/typescript) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/typescript.md)
**O que é:** como os tipos fluem, e por que anotar generics manualmente piora tudo.
**Para que serve:** ter `data` tipado sem escrever tipo nenhum.
**Quando usar:** **antes de escrever o primeiro `useQuery<Algo>()`.** A regra é: tipe a `queryFn`, não
o hook. Passar generic explícito desliga a inferência dos outros.

```ts
// ERRADO: um generic explícito derruba a inferência dos demais
// useQuery<Post[], Error>({ ... })

// CERTO: o tipo vem do retorno da queryFn e flui sozinho
const { data } = useQuery({
  queryKey: ['posts'],
  queryFn: (): Promise<Array<Post>> => api.posts.list(),
})
// data: Array<Post> | undefined
```

```ts
// O erro é `Error` por padrão. Para trocar globalmente, o caminho é o Register,
// e não um generic em cada chamada:
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: AxiosError
  }
}
```

#### graphql
[doc](https://tanstack.com/query/latest/docs/framework/react/graphql) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/graphql.md)
**O que é:** usar Query com GraphQL, já que ela é agnóstica de transporte.
**Para que serve:** consumir GraphQL sem trazer Apollo junto.
**Quando usar:** só com backend GraphQL. Leia o aviso: **não existe cache normalizado aqui**, e essa é
a diferença real em relação ao Apollo.

```ts
// A biblioteca só quer uma Promise. Qualquer cliente serve.
import request from 'graphql-request'

useQuery({
  queryKey: ['posts', page],
  queryFn: () => request('/graphql', POSTS_QUERY, { page }),
})

// Cache normalizado (uma entidade, um lugar, atualizada em todas as telas) NÃO
// existe: o cache é por chave. Se o seu modelo depende disso, é o caso de
// considerar Apollo ou urql.
```

#### react-native
[doc](https://tanstack.com/query/latest/docs/framework/react/react-native) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/react-native.md)
**O que é:** o que precisa ser ligado à mão em React Native: online, foco e refetch por tela.
**Para que serve:** ter o comportamento que na web vem de graça.
**Quando usar:** só em React Native. Na web, pule — nada disso é necessário.

```tsx
import NetInfo from '@react-native-community/netinfo'
import { onlineManager, focusManager } from '@tanstack/react-query'
import { AppState, Platform } from 'react-native'

// não existe evento de rede do navegador aqui
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
)

// nem `window focus`: o equivalente é o AppState
AppState.addEventListener('change', (status) => {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active')
})
```

## Conceitos centrais

#### guides/important-defaults
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/important-defaults.md)
**O que é:** os padrões que surpreendem quem chega: tudo nasce `stale`, refetch agressivo, cache de 5
minutos.
**Para que serve:** entender por que "está buscando de novo sem eu pedir".
**Quando usar:** **a primeira página a ler, antes de qualquer outra.** Metade das reclamações sobre a
biblioteca é sobre um destes defaults.

```ts
// Os defaults, em números:
//   staleTime: 0            → o dado nasce velho, e revalida na próxima chance
//   gcTime: 5 min           → query inativa é coletada depois disso
//   retry: 3                → com backoff exponencial
//   refetchOnMount: true
//   refetchOnWindowFocus: true
//   refetchOnReconnect: true
//
// `staleTime: 0` é a origem de "por que ele buscou de novo quando voltei pra
// aba". Não é bug: é o default fazendo o trabalho dele.

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
})
```

```ts
// Structural sharing: se o dado novo é igual ao antigo, a REFERÊNCIA é mantida.
// É o que faz `useMemo` e `useEffect` sobre `data` não dispararem à toa.
```

#### guides/queries
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/queries) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/queries.md)
**O que é:** `status` e `fetchStatus` — dois estados, não um.
**Para que serve:** distinguir "não tenho dado" de "estou buscando", que são coisas diferentes e
combinam livremente.
**Quando usar:** **ao montar a primeira tela com carregamento.** Confundir os dois é o que produz
spinner piscando a cada revalidação em segundo plano.

```tsx
const { status, fetchStatus, data, error } = useQuery({ queryKey: ['posts'], queryFn: getPosts })

// status     → sobre o DADO:    'pending' | 'error' | 'success'
// fetchStatus → sobre a FUNÇÃO: 'fetching' | 'paused' | 'idle'
//
// success + fetching  = tem dado e está revalidando (não mostre spinner grande)
// pending + paused    = quer buscar mas está sem rede

if (status === 'pending') return <span>Carregando…</span>
if (status === 'error') return <span>Erro: {error.message}</span>
return <ul>{data.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
```

#### guides/query-keys
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/query-keys.md)
**O que é:** as regras de hash da chave.
**Para que serve:** a chave É o cache. Errar aqui é servir dado de um usuário para outro.
**Quando usar:** **sempre.** É a página mais importante da biblioteca junto de `important-defaults`.

```ts
// Chave é ARRAY no topo. O hash é determinístico, e a ordem das chaves de um
// OBJETO não importa — estas três são a mesma query:
useQuery({ queryKey: ['posts', { status, page }] })
useQuery({ queryKey: ['posts', { page, status }] })
useQuery({ queryKey: ['posts', { page, status, other: undefined }] })

// Mas a ordem dos ITENS do array importa — estas são duas queries diferentes:
useQuery({ queryKey: ['posts', status, page] })
useQuery({ queryKey: ['posts', page, status] })
```

```ts
// A regra que resume tudo: TODA variável usada dentro da queryFn entra na chave.
// Faltando, o cache devolve o dado do id anterior, sem erro nenhum.
useQuery({ queryKey: ['post', postId], queryFn: () => api.posts.get(postId) })
```

#### guides/query-functions
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/query-functions.md)
**O que é:** o contrato da `queryFn` e o contexto que ela recebe.
**Para que serve:** fazer erro virar erro. A biblioteca só sabe que falhou se a promessa **rejeitar**.
**Quando usar:** **ao usar `fetch`.** É a pegadinha número um: `fetch` não rejeita em 404 nem em 500,
então a tela mostra "sucesso" com um corpo de erro dentro.

```ts
useQuery({
  queryKey: ['post', postId],
  queryFn: async () => {
    const res = await fetch(`/posts/${postId}`)
    // sem esta linha, um 500 vira `data` e o `error` fica null
    if (!res.ok) throw new Error('resposta não ok')
    return res.json()
  },
})
```

```ts
// O contexto que a queryFn recebe: queryKey, signal, meta, client e — em query
// infinita — pageParam.
function fetchPosts({ queryKey, signal }) {
  const [, { status, page }] = queryKey
  return api.posts.list({ status, page }, { signal }) // signal dá cancelamento de graça
}
```

#### guides/query-options
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/query-options) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/query-options.md)
**O que é:** o helper que mantém `queryKey` e `queryFn` juntos e tipados.
**Para que serve:** reusar a mesma definição no hook, no prefetch, no `setQueryData` e na
invalidação, sem repetir a chave.
**Quando usar:** **em toda query.** É a convenção que este pacote recomenda, e a que a regra
`prefer-query-options` do ESLint cobra.

```ts
import { queryOptions } from '@tanstack/react-query'

export function postOptions(id: string) {
  return queryOptions({
    queryKey: ['posts', id],
    queryFn: () => api.posts.get(id),
    staleTime: 5_000,
  })
}

// o mesmo objeto serve em todos estes lugares:
useQuery(postOptions(id))
useSuspenseQuery(postOptions(id))
queryClient.prefetchQuery(postOptions(id))
queryClient.setQueryData(postOptions(id).queryKey, novo) // e a chave sai TIPADA
```

```ts
// Existem os irmãos `infiniteQueryOptions` e — novidade que a doc do site ainda
// não cobre, mas está exportada na 5.101.4 — `mutationOptions`.
import { mutationOptions } from '@tanstack/react-query'
```

#### guides/network-mode
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/network-mode.md)
**O que é:** os três modos de rede e o estado `paused`.
**Para que serve:** decidir o que acontece sem conexão.
**Quando usar:** ao suportar offline, e ao consumir algo que não é HTTP (onde o default atrapalha).

```ts
// 'online' (default) → não dispara sem conexão; fetchStatus fica 'paused'
// 'always'           → ignora o estado de rede. É o modo certo quando a queryFn
//                      não vai à rede: cache local, AsyncStorage, IndexedDB
// 'offlineFirst'     → roda uma vez e pausa as tentativas seguintes

useQuery({ queryKey: ['config'], queryFn: lerDoDisco, networkMode: 'always' })
```

## Padrões de consulta

#### guides/parallel-queries
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/parallel-queries) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/parallel-queries.md)
**O que é:** várias queries ao mesmo tempo, com número fixo ou variável.
**Para que serve:** não serializar buscas que são independentes.
**Quando usar:** quando a quantidade de queries **varia**, que é o caso em que hooks soltos violam as
regras de hooks.

```tsx
// número fixo: hooks soltos bastam, e já rodam em paralelo
const users = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
const teams = useQuery({ queryKey: ['teams'], queryFn: fetchTeams })

// número variável: useQueries, porque um `map` de useQuery é ilegal
const results = useQueries({
  queries: ids.map((id) => ({ queryKey: ['user', id], queryFn: () => fetchUser(id) })),
})
```

#### guides/dependent-queries
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/dependent-queries.md)
**O que é:** uma query que só pode rodar depois de outra.
**Para que serve:** o caso "preciso do id do usuário para buscar os projetos dele".
**Quando usar:** com cuidado. A própria página avisa: **isto é um waterfall por definição** e dobra o
tempo de carregamento. Antes de aceitar, veja se o backend não pode devolver os dois juntos.

```tsx
const { data: user } = useQuery({ queryKey: ['user', email], queryFn: getUserByEmail })

const userId = user?.id
const { data: projects } = useQuery({
  queryKey: ['projects', userId],
  queryFn: () => getProjects(userId),
  enabled: !!userId, // sem isto, roda com undefined
})
```

#### guides/disabling-queries
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/disabling-queries.md)
**O que é:** `enabled: false` e o `skipToken`, mais a diferença entre query desabilitada e preguiçosa.
**Para que serve:** segurar uma query até ter o que ela precisa.
**Quando usar:** **sempre que usar `enabled` com uma variável opcional.** O `skipToken` resolve o
mesmo problema sem o `!` que o `enabled` obriga a escrever.

```tsx
import { skipToken } from '@tanstack/react-query'

// Com `enabled`, o TS não sabe que `filtro` existe dentro da queryFn, e você
// acaba escrevendo `filtro!`:
useQuery({ queryKey: ['posts', filtro], queryFn: () => busca(filtro!), enabled: !!filtro })

// Com skipToken, o próprio tipo garante: a função só existe quando o valor existe.
useQuery({
  queryKey: ['posts', filtro],
  queryFn: filtro ? () => busca(filtro) : skipToken,
})

// O preço: com skipToken, `refetch()` lança "Missing queryFn". Se você precisa
// disparar na mão, volte para `enabled: false`.
```

#### guides/query-retries
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/query-retries) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/query-retries.md)
**O que é:** a política de nova tentativa e o atraso exponencial.
**Para que serve:** parar de tentar de novo o que nunca vai dar certo — um 404, um 401.
**Quando usar:** ao configurar o `QueryClient`. Repetir três vezes um 404 atrasa a tela de erro em
vários segundos, sem nenhum ganho.

```ts
// defaults: 3 tentativas no cliente, 0 no servidor (para o SSR não ficar lento)
// atraso: Math.min(1000 * 2 ** tentativa, 30_000)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (contagem, erro) => {
        if (erro instanceof HTTPError && erro.status < 500) return false // não insista em 4xx
        return contagem < 3
      },
    },
  },
})
```

#### guides/background-fetching-indicators
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/background-fetching-indicators) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/background-fetching-indicators.md)
**O que é:** `isFetching` por query e `useIsFetching` global.
**Para que serve:** mostrar "atualizando" discreto em vez de trocar a tela por um spinner.
**Quando usar:** logo depois da primeira tela pronta. É a diferença entre uma interface que pisca e
uma que não pisca.

```tsx
const { status, data, isFetching } = useQuery({ queryKey: ['posts'], queryFn: getPosts })

// status 'pending' → primeira carga, tela vazia, spinner grande
// isFetching       → revalidação com dado na tela, indicador discreto
{isFetching ? <span>Atualizando…</span> : null}
```

```tsx
import { useIsFetching } from '@tanstack/react-query'

// indicador global, para a barra do topo
const quantas = useIsFetching()
```

#### guides/window-focus-refetching
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/window-focus-refetching) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/window-focus-refetching.md)
**O que é:** o refetch ao voltar para a aba, e como desligá-lo.
**Para que serve:** dado fresco sem o usuário pedir.
**Quando usar:** ao ouvir "está chamando a API toda hora". Antes de desligar, considere subir o
`staleTime`: o refetch só acontece se a query estiver velha.

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // default: true
      // Quase sempre a resposta melhor é esta, e não desligar:
      // staleTime: 30_000
    },
  },
})
```

```ts
// Para trocar o evento (webview, app embarcado):
import { focusManager } from '@tanstack/react-query'
focusManager.setEventListener((handleFocus) => { /* … */ })
```

#### guides/polling
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/polling) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/polling.md)
**O que é:** `refetchInterval`, inclusive na forma de função.
**Para que serve:** acompanhar algo que muda sozinho — um job, uma fila, uma cotação.
**Quando usar:** antes de pensar em websocket. Um polling que **se desliga sozinho** resolve a maioria
dos casos com uma linha.

```tsx
useQuery({
  queryKey: ['job', jobId],
  queryFn: () => api.jobs.get(jobId),
  // a forma de função é a que importa: devolver `false` para o timer parar
  refetchInterval: (query) => (query.state.data?.status === 'complete' ? false : 2_000),
})

// Por padrão o polling PAUSA quando a aba perde o foco. Para continuar:
// refetchIntervalInBackground: true
```

#### guides/paginated-queries
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/paginated-queries.md)
**O que é:** paginação com a página anterior visível durante a troca.
**Para que serve:** não piscar a tabela inteira a cada clique em "próxima".
**Quando usar:** **em toda listagem paginada.** Sem isto, mudar de página passa por `pending` e a tela
esvazia.

```tsx
import { keepPreviousData, useQuery } from '@tanstack/react-query'

const { data, isPlaceholderData } = useQuery({
  queryKey: ['posts', page],
  queryFn: () => fetchPosts(page),
  placeholderData: keepPreviousData, // na v4 isto era a opção `keepPreviousData: true`
})

// enquanto isPlaceholderData é true, o que está na tela é a página ANTERIOR:
// travar o botão evita o usuário pular duas páginas de uma vez
<button disabled={isPlaceholderData || !data?.hasMore}>Próxima</button>
```

#### guides/infinite-queries
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/infinite-queries.md)
**O que é:** `useInfiniteQuery`, para "carregar mais" e rolagem infinita.
**Para que serve:** acumular páginas em vez de trocá-las.
**Quando usar:** em feed e em lista sem fim. Repare que `initialPageParam` é **obrigatório** na v5 e
que o dado vem numa estrutura diferente.

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: ({ pageParam }) => fetchPosts(pageParam),
  initialPageParam: 0,                                   // obrigatório na v5
  getNextPageParam: (lastPage) => lastPage.nextCursor,   // undefined = acabou
  maxPages: 5,                                           // limita memória e refetch
})

// `data` NÃO é um array: é { pages: [...], pageParams: [...] }
const todos = data?.pages.flatMap((p) => p.items) ?? []

// A ordem das propriedades importa para a inferência: queryFn, depois
// getPreviousPageParam, depois getNextPageParam. É o que a regra
// infinite-query-property-order do ESLint cobra.
```

#### guides/initial-query-data
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/initial-query-data) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/initial-query-data.md)
**O que é:** `initialData` — dado real, que **vai para o cache**.
**Para que serve:** aproveitar dado que você já tem, de SSR ou de outra query.
**Quando usar:** só com dado **completo e verdadeiro**. Para dado parcial ou falso, a opção é
`placeholderData`, e confundir os dois envenena o cache.

```tsx
useQuery({
  queryKey: ['post', id],
  queryFn: () => api.posts.get(id),
  initialData: postVindoDoServidor,
  // sem isto o dado é tratado como recém-chegado e não revalida quando devia
  initialDataUpdatedAt: quandoOServidorBuscou,
})
```

```tsx
// Semear a partir do cache de uma listagem, com a idade correta:
initialData: () => queryClient.getQueryData<Array<Post>>(['posts'])?.find((p) => p.id === id),
initialDataUpdatedAt: () => queryClient.getQueryState(['posts'])?.dataUpdatedAt,
```

#### guides/placeholder-query-data
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/placeholder-query-data) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/placeholder-query-data.md)
**O que é:** dado de enfeite, que **nunca** entra no cache.
**Para que serve:** mostrar o esqueleto certo — ou o dado anterior — enquanto o real chega.
**Quando usar:** sempre que o dado for parcial, aproximado ou emprestado de outra tela.

```tsx
// como valor
useQuery({ queryKey: ['post', id], queryFn: buscar, placeholderData: esqueleto })

// como função, recebendo o anterior — é o que `keepPreviousData` faz por dentro
useQuery({ queryKey: ['posts', page], queryFn: buscar, placeholderData: (anterior) => anterior })

// A query entra em `success` direto, e `isPlaceholderData` avisa que o que está
// na tela ainda não é real. Nada disso é gravado no cache.
```

## Mutações

#### guides/mutations
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/mutations.md)
**O que é:** `useMutation`, seus estados e seus quatro callbacks.
**Para que serve:** toda escrita — criar, editar, apagar.
**Quando usar:** **em toda escrita**, e vale ler a ordem dos callbacks: os de `useMutation` rodam antes
dos passados no `mutate()`.

```tsx
const { mutate, mutateAsync, isPending, error, reset } = useMutation({
  mutationFn: api.posts.create,
  onMutate: async (variaveis, context) => { /* antes de tudo; o retorno vira onMutateResult */ },
  onError: (erro, variaveis, onMutateResult, context) => { /* … */ },
  onSuccess: (data, variaveis, onMutateResult, context) => { /* … */ },
  onSettled: (data, erro, variaveis, onMutateResult, context) => { /* sempre */ },
})

// Conferido no query-core 5.101.4: o 3º parâmetro é `onMutateResult` (o retorno
// do onMutate) e o 4º é `context`, que é { client, meta, mutationKey }. Ter o
// `client` ali dispensa o useQueryClient dentro do componente.
```

```tsx
// `mutate` não devolve promessa e não lança: erro vai para `onError` e para
// `error`. `mutateAsync` devolve promessa e LANÇA — e um await sem try/catch
// vira unhandled rejection.
mutate(novoPost)
await mutateAsync(novoPost).catch(() => {})

// Mutação NÃO tem retry por padrão (query tem 3). É proposital: repetir uma
// escrita pode duplicar registro.
```

#### guides/query-invalidation
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/query-invalidation.md)
**O que é:** marcar query como velha e refazer as que estão na tela.
**Para que serve:** o mecanismo padrão de "a tela precisa atualizar depois disso".
**Quando usar:** **é o padrão a usar por default.** Só troque por escrita manual no cache quando
medir que a revalidação incomoda.

```ts
// prefixo: atinge ['posts'] e ['posts', { page: 2 }] e ['posts', id]
queryClient.invalidateQueries({ queryKey: ['posts'] })

// só a exata
queryClient.invalidateQueries({ queryKey: ['posts'], exact: true })

// controle fino
queryClient.invalidateQueries({
  predicate: (query) => query.queryKey[0] === 'posts' && query.queryKey[1]?.version >= 10,
})

// Invalidar faz duas coisas: marca como stale (ignorando o staleTime) e refaz
// as que estão sendo observadas. As inativas só refazem quando remontarem.
```

#### guides/invalidations-from-mutations
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/invalidations-from-mutations.md)
**O que é:** invalidar a partir do `onSuccess` da mutação.
**Para que serve:** fechar o ciclo escrever → atualizar.
**Quando usar:** em quase toda mutação. O detalhe que muda a experiência é **retornar a promessa**.

```tsx
useMutation({
  mutationFn: api.posts.create,
  onSuccess: async () => {
    // devolver a promessa mantém `isPending` true até o refetch terminar: o
    // botão continua desabilitado até a lista estar realmente nova, em vez de
    // liberar e mostrar dado velho por um instante
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['posts'] }),
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
    ])
  },
})
```

#### guides/updates-from-mutation-responses
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/updates-from-mutation-responses.md)
**O que é:** gravar no cache o que a própria resposta da mutação devolveu.
**Para que serve:** economizar uma ida ao servidor quando a API já respondeu com o registro atualizado.
**Quando usar:** quando a resposta contém o objeto **completo**. Se vier parcial, invalidar é mais
seguro do que remendar o cache.

```tsx
useMutation({
  mutationFn: api.posts.update,
  onSuccess: (postAtualizado) => {
    queryClient.setQueryData(['posts', postAtualizado.id], postAtualizado)
  },
})

// A regra que não pode ser quebrada: NUNCA mutar em cima do que veio do cache.
// setQueryData(['posts'], (old) => { old.push(novo); return old })  ← errado
// setQueryData(['posts'], (old) => [...(old ?? []), novo])          ← certo
```

#### guides/optimistic-updates
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/optimistic-updates.md)
**O que é:** mostrar o resultado antes de o servidor confirmar, por duas vias.
**Para que serve:** interface que responde na hora.
**Quando usar:** em ação de alta frequência (curtir, marcar, reordenar). Comece pela via simples: a
maioria dos casos não precisa mexer no cache.

```tsx
// Via 1, simples: usar as `variables` da própria mutação para desenhar o item
// pendente. Não toca no cache, então não tem rollback para escrever.
const { isPending, variables, mutate } = useMutation({
  mutationFn: criarPost,
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
})

<ul>
  {posts.map((p) => <li key={p.id}>{p.title}</li>)}
  {isPending && <li style={{ opacity: 0.5 }}>{variables.title}</li>}
</ul>
```

```tsx
// Via 2, no cache: necessária quando mais de um lugar da tela precisa enxergar
// a mudança. Os três passos são obrigatórios — cancelar, guardar, restaurar.
useMutation({
  mutationFn: atualizarPost,
  onMutate: async (novo, context) => {
    // cancelar primeiro: um refetch em voo sobrescreveria o otimista
    await context.client.cancelQueries({ queryKey: ['posts'] })
    const anterior = context.client.getQueryData(['posts'])
    context.client.setQueryData(['posts'], (old) => [...old, novo])
    return { anterior }   // vira o `onMutateResult` dos próximos callbacks
  },
  onError: (erro, novo, onMutateResult, context) => {
    context.client.setQueryData(['posts'], onMutateResult.anterior)
  },
  onSettled: (data, erro, vars, res, context) => {
    context.client.invalidateQueries({ queryKey: ['posts'] })
  },
})
```

#### guides/query-cancellation
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/query-cancellation.md)
**O que é:** o `AbortSignal` que a biblioteca entrega para toda `queryFn`.
**Para que serve:** cancelar requisição que ficou obsoleta — busca enquanto digita, navegação rápida.
**Quando usar:** repasse o `signal` sempre; custa um parâmetro e evita resposta antiga sobrescrevendo
resposta nova.

```ts
useQuery({
  queryKey: ['busca', termo],
  queryFn: ({ signal }) => fetch(`/busca?q=${termo}`, { signal }).then((r) => r.json()),
})

// Com o signal repassado, trocar de chave ou desmontar aborta a requisição de
// verdade. Sem ele, a resposta chega e é descartada — mas a rede foi gasta.

queryClient.cancelQueries({ queryKey: ['busca'] })

// Não funciona com os hooks de Suspense.
```

#### guides/filters
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/filters) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/filters.md)
**O que é:** o objeto de filtro que quase todo método do `queryClient` aceita.
**Para que serve:** escolher exatamente quais queries invalidar, refazer, remover ou contar.
**Quando usar:** ao precisar de precisão — "só as ativas", "só as velhas", "só as que não estão
buscando".

```ts
// filtro de QUERY: queryKey, exact, type, stale, fetchStatus, predicate
queryClient.refetchQueries({ queryKey: ['posts'], type: 'active', stale: true })
queryClient.removeQueries({ queryKey: ['posts'], exact: true })

// filtro de MUTATION: mutationKey, exact, status, predicate
useIsMutating({ mutationKey: ['posts', 'create'] })

// `type: 'active'` = tem componente montado observando. É o filtro que evita
// refazer cinquenta queries que ninguém está olhando.
```

## Cache e performance

#### guides/request-waterfalls
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/request-waterfalls) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/request-waterfalls.md)
**O que é:** os quatro tipos de cascata de requisição e como achatar cada um.
**Para que serve:** o problema de performance mais caro de um app com muitas queries, e o mais
invisível no código.
**Quando usar:** **quando a tela demora e nenhuma requisição isolada é lenta.** Abra a aba de rede: se
as barras estão em escada em vez de empilhadas, é isto.

```txt
Os quatro tipos, e o conserto de cada um:

  serial no mesmo componente  → um endpoint que devolva os dois, ou useQueries
  componentes aninhados       → subir a query do filho para o pai, ou prefetch
  code splitting              → prefetch na rota, ou fetch fora do chunk
  queries dependentes         → mudar a API; é o único sem conserto no cliente
```

#### guides/prefetching
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/prefetching.md)
**O que é:** encher o cache antes de o componente pedir.
**Para que serve:** o clique que abre a tela já com dado.
**Quando usar:** no loader de rota (com TanStack Router, é a integração natural — ver
[`tanstack-router.md`](tanstack-router.md)) e no hover de um link.

```ts
// prefetchQuery: devolve Promise<void>, respeita staleTime, ignora erro
await queryClient.prefetchQuery(postOptions(id))

// ensureQueryData: devolve O DADO, e busca só se não houver nada em cache.
// É o que se usa em loader de rota, porque o loader precisa do valor.
const post = await queryClient.ensureQueryData(postOptions(id))
```

```tsx
// no hover: o dado costuma chegar antes do clique terminar
<Link
  onMouseEnter={() => queryClient.prefetchQuery(postOptions(id))}
  onFocus={() => queryClient.prefetchQuery(postOptions(id))}
/>

// `usePrefetchQuery` existe para prefetch dentro de componente sem bloquear o
// render — útil acima de um limite de Suspense.
```

#### guides/caching
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/caching) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/caching.md)
**O que é:** o ciclo de vida de uma entrada de cache, passo a passo.
**Para que serve:** separar `staleTime` de `gcTime`, que é a confusão mais comum da biblioteca.
**Quando usar:** **ao ajustar qualquer um dos dois.** Mexer no errado não faz nada, e a pessoa conclui
que a opção não funciona.

```txt
staleTime  → quando o dado fica VELHO (e passa a revalidar). Default 0.
gcTime     → quando o dado é APAGADO depois que ninguém mais o observa. Default 5 min.

O ciclo:
  1. primeira montagem       → busca, mostra carregando
  2. staleTime passa (0)     → dado marcado velho, continua na tela
  3. segundo componente monta → recebe do cache NA HORA, e revalida atrás
  4. todos desmontam          → começa a contagem do gcTime
  5. remonta antes do fim     → cache ainda está lá, dado aparece instantâneo
  6. 5 min sem ninguém        → entrada apagada; a próxima montagem carrega do zero
```

#### guides/render-optimizations
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/render-optimizations.md)
**O que é:** o que a biblioteca já faz sozinha e o que você pode ajustar.
**Para que serve:** entender que ela **já é otimizada**, e que a maioria das "otimizações" manuais
piora.
**Quando usar:** só com problema medido. Leia especialmente as propriedades rastreadas: elas explicam
por que desestruturar tudo re-renderiza mais.

```tsx
// Propriedades RASTREADAS: um Proxy observa o que você realmente lê. Ler só
// `data` significa não re-renderizar quando `isFetching` muda.
const { data } = useQuery(postOptions(id))

// Isto anula a otimização, porque o rest lê TODOS os campos:
// const { data, ...resto } = useQuery(...)   ← a regra no-rest-destructuring pega

// `select` estreita ainda mais: o componente só re-renderiza quando o RECORTE
// muda. A função precisa ser estável, senão roda a cada render.
const total = useQuery({ ...postsOptions(), select: (posts) => posts.length })
```

#### guides/default-query-function
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/default-query-function) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/default-query-function.md)
**O que é:** uma `queryFn` global, que deriva a URL da própria chave.
**Para que serve:** escrever `useQuery({ queryKey: ['/posts'] })` e nada mais.
**Quando usar:** raramente, e com ressalva: amarra a chave à URL, e aí a chave deixa de ser um
identificador livre de cache. Perde-se a tipagem e o `queryOptions`.

```ts
const defaultQueryFn = async ({ queryKey }) => {
  const { data } = await axios.get(`https://api.exemplo.com${queryKey[0]}`)
  return data
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { queryFn: defaultQueryFn } },
})

useQuery({ queryKey: ['/posts'] })  // sem queryFn
```

#### guides/scroll-restoration
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/scroll-restoration) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/scroll-restoration.md)
**O que é:** por que a posição da rolagem volta sozinha ao navegar de volta.
**Para que serve:** saber que não é preciso fazer nada — e por que às vezes falha.
**Quando usar:** ao investigar "voltei e perdi o scroll". A causa é sempre a mesma.

```txt
Funciona porque o dado vem do cache SÍNCRONO: a lista renderiza com a altura
final no primeiro frame, então o navegador consegue restaurar a posição.

Falha quando o gcTime já expirou (5 min por padrão): sem cache, a lista nasce
vazia, a altura é zero, e não há para onde restaurar. Subir o gcTime da listagem
é o conserto.
```

## SSR e Suspense

#### guides/ssr
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/ssr) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/ssr.md)
**O que é:** as duas formas de levar dado do servidor para o cliente: `initialData` e hidratação.
**Para que serve:** a página chegar com o dado dentro do HTML.
**Quando usar:** **com TanStack Start ou qualquer SSR.** As duas regras abaixo não são detalhe: uma é
vazamento de dado entre usuários, a outra é requisição duplicada em toda carga.

```tsx
// REGRA 1: um QueryClient POR REQUISIÇÃO. No escopo do módulo, o cache é
// compartilhado entre todos os usuários do servidor — dado de um vaza para o outro.
const [queryClient] = useState(() => new QueryClient())

// REGRA 2: staleTime > 0 no SSR. Com o default 0, tudo que veio pronto do
// servidor é considerado velho e refeito assim que hidrata.
new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })
```

```tsx
// Hidratação: prefetch no servidor, dehydrate, HydrationBoundary no cliente
await queryClient.prefetchQuery(postsOptions())
const state = dehydrate(queryClient)

<HydrationBoundary state={state}>
  <Posts />
</HydrationBoundary>
```

#### guides/advanced-ssr
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/advanced-ssr.md)
**O que é:** streaming, prefetch em componente de servidor e desidratação de query ainda pendente.
**Para que serve:** começar a busca cedo sem segurar o HTML até ela terminar.
**Quando usar:** depois de o SSR básico estar de pé, e só se o tempo até o primeiro byte importar.

```ts
// Desde a 5.40: dá para desidratar query em estado `pending`, sem await. O
// prefetch começa no servidor e o resultado chega em streaming para o cliente.
const queryClient = new QueryClient({
  defaultOptions: {
    dehydrate: {
      shouldDehydrateQuery: (query) =>
        defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
    },
  },
})
```

#### guides/suspense
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/suspense) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/suspense.md)
**O que é:** `useSuspenseQuery` e irmãos, onde `data` é sempre definido.
**Para que serve:** tirar `if (isPending)` de dentro do componente.
**Quando usar:** quando já existirem limites de Suspense e de erro na árvore. Sem eles, o app quebra
em vez de mostrar carregando. E leia as três limitações antes de adotar.

```tsx
// `data` é garantido: sem `| undefined`, sem checagem
const { data } = useSuspenseQuery(postsOptions())

// O preço, e não é pequeno:
//   • não existe `enabled` — não dá para condicionar
//   • não existe `placeholderData`
//   • queries do MESMO componente rodam em série, não em paralelo
//     (para paralelo, é `useSuspenseQueries`)
//   • cancelamento não funciona
```

## Testes e estado de cliente

#### guides/testing
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/testing) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/testing.md)
**O que é:** o setup mínimo para testar componente que usa Query.
**Para que serve:** teste que não fica lento nem vaza estado entre casos.
**Quando usar:** no primeiro teste. Sem `retry: false`, um teste de erro espera as três tentativas com
backoff e estoura o timeout.

```tsx
// QueryClient NOVO por teste, e sem retry
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

// Reaproveitar um client entre testes só funciona limpando antes de cada um e
// sem rodar em paralelo — mais simples criar um novo.
// Em Jest, `gcTime: Infinity` evita o aviso de timer pendente no fim da suíte.
```

#### guides/does-this-replace-client-state
[doc](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/guides/does-this-replace-client-state.md)
**O que é:** a resposta oficial para "posso jogar fora o meu gerenciador de estado?".
**Para que serve:** traçar a fronteira entre estado de servidor e de cliente.
**Quando usar:** ao decidir onde um dado novo mora. É a mesma tabela que o índice deste pacote traz —
ver [`../_doc-lib.md`](../_doc-lib.md), seção "onde um dado mora".

```txt
A resposta, resumida: Query substitui o seu estado de servidor, não o de cliente.

Depois de mover tudo que vem de API para cá, o que sobra de estado global de
cliente costuma ser pouco — e para esse pouco ainda faz sentido ter um store.
Ver tanstack-store.md, que é o que Router, Query e Table já usam por dentro.
```

## ESLint

#### eslint/eslint-plugin-query
[doc](https://tanstack.com/query/latest/docs/eslint/eslint-plugin-query) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/eslint/eslint-plugin-query.md)
**O que é:** o plugin e suas oito regras.
**Para que serve:** pegar a classe de erro que o TypeScript não pega — chave incompleta, cliente
instável, ordem de propriedade que quebra inferência.
**Quando usar:** **instale junto com a biblioteca.** Cada regra abaixo corresponde a um bug real que
não aparece no compilador nem no teste.

```js
// eslint.config.js (flat config)
import pluginQuery from '@tanstack/eslint-plugin-query'

export default [...pluginQuery.configs['flat/recommended']]
```

```txt
As oito regras:
  exhaustive-deps               variável usada na queryFn e ausente da queryKey
  no-rest-destructuring         `...resto` anula as propriedades rastreadas
  stable-query-client           QueryClient criado dentro do render
  no-unstable-deps              objeto do hook num array de dependências
  infinite-query-property-order ordem que quebra a inferência de tipo
  no-void-query-fn              queryFn que não devolve nada
  mutation-property-order       mesma coisa, no useMutation
  prefer-query-options          queryKey e queryFn soltos, fora do helper
```

#### eslint/exhaustive-deps
[doc](https://tanstack.com/query/latest/docs/eslint/exhaustive-deps) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/eslint/exhaustive-deps.md)
**O que é:** a regra que exige na chave toda variável usada na `queryFn`.
**Para que serve:** evitar o bug mais silencioso da biblioteca — cache servindo o dado de outro id.
**Quando usar:** **é a regra mais valiosa do plugin.** Ligue mesmo que ignore as outras.

```tsx
// ✗ a chave não muda quando o id muda: o segundo post recebe o dado do primeiro
useQuery({ queryKey: ['post'], queryFn: () => api.posts.get(postId) })

// ✓
useQuery({ queryKey: ['post', postId], queryFn: () => api.posts.get(postId) })
```

#### eslint/stable-query-client
[doc](https://tanstack.com/query/latest/docs/eslint/stable-query-client) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/eslint/stable-query-client.md)
**O que é:** a regra contra criar `new QueryClient()` no corpo do componente.
**Para que serve:** evitar cache novo a cada render, que é o mesmo que cache nenhum.
**Quando usar:** pega um erro de configuração que é feito uma vez e dói para sempre.

```tsx
// ✗ cache novo a cada render
function App() {
  const queryClient = new QueryClient()
}

// ✓ estável dentro do componente (necessário em SSR: um client por requisição)
const [queryClient] = useState(() => new QueryClient())

// ✓ no escopo do módulo — válido em app só de cliente, PROIBIDO com SSR
const queryClient = new QueryClient()
```

#### eslint/no-rest-destructuring
[doc](https://tanstack.com/query/latest/docs/eslint/no-rest-destructuring) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/eslint/no-rest-destructuring.md)
**O que é:** a regra contra `...resto` no resultado da query.
**Para que serve:** preservar as propriedades rastreadas, que são o que evita re-render.
**Quando usar:** desempenho de graça. O rest lê todos os campos e assina todos eles.

```tsx
// ✗ assina tudo, re-renderiza a cada mudança de qualquer campo
const { data, ...resto } = useQuery(postsOptions())

// ✓ guarde o objeto e desestruture o que for usar
const postsQuery = useQuery(postsOptions())
const { data } = postsQuery
```

#### eslint/no-unstable-deps
[doc](https://tanstack.com/query/latest/docs/eslint/no-unstable-deps) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/eslint/no-unstable-deps.md)
**O que é:** a regra contra pôr o objeto do hook num array de dependências.
**Para que serve:** o objeto não é referencialmente estável, então o `useCallback` que depende dele
não memoiza nada.
**Quando usar:** pega um `useCallback` ou `useEffect` que parece certo e não é.

```tsx
// ✗ `mutation` muda de referência, e o callback é recriado todo render
const mutation = useMutation({ mutationFn: salvar })
const cb = useCallback(() => mutation.mutate('x'), [mutation])

// ✓ `mutate` é estável
const { mutate } = useMutation({ mutationFn: salvar })
const cb2 = useCallback(() => mutate('x'), [mutate])
```

#### eslint/infinite-query-property-order
[doc](https://tanstack.com/query/latest/docs/eslint/infinite-query-property-order) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/eslint/infinite-query-property-order.md)
**O que é:** a regra de ordem das propriedades no `useInfiniteQuery`.
**Para que serve:** a inferência de tipo depende literalmente da ordem em que as chaves aparecem no
objeto.
**Quando usar:** ao escrever query infinita. É contraintuitivo o bastante para ninguém adivinhar.

```tsx
// A ordem exigida: queryFn → getPreviousPageParam → getNextPageParam.
// As demais propriedades podem vir em qualquer lugar.
useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  initialPageParam: 0,
  getPreviousPageParam: (first) => first.prevCursor,
  getNextPageParam: (last) => last.nextCursor,
})
```

#### eslint/no-void-query-fn
[doc](https://tanstack.com/query/latest/docs/eslint/no-void-query-fn) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/eslint/no-void-query-fn.md)
**O que é:** a regra contra `queryFn` que não devolve nada.
**Para que serve:** sem retorno não há o que cachear, e `data` fica `undefined` para sempre.
**Quando usar:** pega o `return` esquecido, que é erro de digitação e não de raciocínio.

```ts
// ✗ busca e joga fora
queryFn: async () => { await api.posts.list() }

// ✓
queryFn: async () => { const posts = await api.posts.list(); return posts }
```

#### eslint/mutation-property-order
[doc](https://tanstack.com/query/latest/docs/eslint/mutation-property-order) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/eslint/mutation-property-order.md)
**O que é:** a mesma regra de ordem, agora no `useMutation`.
**Para que serve:** o tipo do `onMutateResult` que chega em `onError` e `onSettled` depende da ordem.
**Quando usar:** ao escrever atualização otimista, que é justamente onde esse tipo importa.

```tsx
// A ordem exigida: onMutate → onError → onSettled
useMutation({
  mutationFn: salvar,
  onMutate: async () => ({ anterior: 1 }),
  onError: (e, v, onMutateResult) => { /* onMutateResult tipado */ },
  onSettled: () => {},
})
```

#### eslint/prefer-query-options
[doc](https://tanstack.com/query/latest/docs/eslint/prefer-query-options) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/eslint/prefer-query-options.md)
**O que é:** a regra que exige o helper `queryOptions` e a reutilização da chave que ele devolve.
**Para que serve:** impedir que a mesma chave acabe com duas funções diferentes, e que a chave seja
redigitada errada num `getQueryData`.
**Quando usar:** é a regra que transforma a convenção do cabeçalho deste arquivo em algo que o CI
cobra.

```tsx
// ✗ soltos no componente, e a chave redigitada na consulta ao cache
useQuery({ queryKey: ['post', id], queryFn: () => api.posts.get(id) })
queryClient.getQueryData(['post', id])

// ✓ um lugar só, e a chave vem tipada do próprio helper
useQuery(postOptions(id))
queryClient.getQueryData(postOptions(id).queryKey)
```

## Persistência

#### plugins/persistQueryClient
[doc](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/plugins/persistQueryClient.md)
**O que é:** gravar o cache inteiro em algum armazenamento e restaurá-lo no próximo carregamento.
**Para que serve:** o app abrir já com dado, mesmo depois de fechar a aba.
**Quando usar:** em app que precisa funcionar offline, ou onde a primeira tela é sempre a mesma.
Prefira o **Provider**: a função crua corre contra o render.

```tsx
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'

const queryClient = new QueryClient({
  // o gcTime precisa ser MAIOR que o maxAge do persistidor, senão a entrada é
  // coletada antes de chegar a ser restaurada
  defaultOptions: { queries: { gcTime: 1000 * 60 * 60 * 24 } },
})

<PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
  <App />
</PersistQueryClientProvider>

// `buster`: string que invalida tudo que foi gravado com outra string. É como
// se descarta cache velho depois de um deploy que mudou o formato do dado.
// `maxAge`: idade máxima do cache gravado, 24h por padrão.
```

#### plugins/createSyncStoragePersister
[doc](https://tanstack.com/query/latest/docs/framework/react/plugins/createSyncStoragePersister) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/plugins/createSyncStoragePersister.md)
**O que é:** o persistidor para armazenamento síncrono, na prática o `localStorage`.
**Para que serve:** o caso comum na web.
**Quando usar:** em app web. Fique de olho no limite de tamanho — é o que quebra em produção, não em
desenvolvimento.

```ts
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  throttleTime: 1000, // default, para não gravar a cada mudança
})

// `localStorage` tem limite (uns 5 MB). Estourou, a gravação lança e o cache
// simplesmente não persiste. A saída documentada é comprimir na serialização:
//   serialize: (data) => compress(JSON.stringify(data)),
//   deserialize: (data) => JSON.parse(decompress(data)),
```

#### plugins/createAsyncStoragePersister
[doc](https://tanstack.com/query/latest/docs/framework/react/plugins/createAsyncStoragePersister) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/plugins/createAsyncStoragePersister.md)
**O que é:** o persistidor para armazenamento assíncrono: AsyncStorage do React Native, IndexedDB.
**Para que serve:** persistir onde não existe API síncrona.
**Quando usar:** em React Native, ou na web quando o `localStorage` for pequeno demais e o IndexedDB
entrar no lugar.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'

const persister = createAsyncStoragePersister({ storage: AsyncStorage })

// Armazenamento síncrono também obedece à interface assíncrona, então este
// persistidor serve nos dois casos. O contrário não é verdade.
```

#### plugins/broadcastQueryClient
[doc](https://tanstack.com/query/latest/docs/framework/react/plugins/broadcastQueryClient) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/plugins/broadcastQueryClient.md)
**O que é:** sincronizar o cache entre abas da mesma origem.
**Para que serve:** editar em uma aba e a outra refletir sem F5.
**Quando usar:** em app que as pessoas abrem em várias abas. É **experimental**, e o pacote diz isso no
próprio nome: quebra em patch.

```ts
import { broadcastQueryClient } from '@tanstack/query-broadcast-client-experimental'

broadcastQueryClient({ queryClient, broadcastChannel: 'meu-app' })
```

#### plugins/createPersister
[doc](https://tanstack.com/query/latest/docs/framework/react/plugins/createPersister) | [markdown](https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/plugins/createPersister.md)
**O que é:** persistência **por query**, em vez do cache inteiro num item só.
**Para que serve:** persistir só o que vale a pena, sem serializar tudo a cada mudança.
**Quando usar:** quando o cache inteiro for grande demais para um item só. Também **experimental** — o
nome exportado carrega o prefixo.

```ts
import { experimental_createQueryPersister } from '@tanstack/query-persist-client-core'

const persister = experimental_createQueryPersister({
  storage: AsyncStorage,
  maxAge: 1000 * 60 * 60 * 12,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { gcTime: 1000 * 30, persister: persister.persisterFn },
  },
})

// A diferença para o persistQueryClient: aqui a chave de gravação é o hash da
// query, um item por query. Lá é um item só com tudo dentro.
```
