# Padrão de frontend

Base comum para todo frontend React 19 + TanStack Start/Router/Query/Table + React Hook Form +
Zod + shadcn (Base UI) + Tailwind v4. Entidades de exemplo são sempre `User`, `Team`, `Post`,
nunca um domínio real.

Autoridade igual à do backend: `_doc-lib/<lib>.md` (a entrada e a página oficial do link,
`DECISIONS.md` #114) > tipo instalado > este documento > código existente. Quando nem a doc nem o
tipo cobrem o ponto, declare "não coberto" e decida pelo critério daqui. Regra que depende de
página oficial que não foi aberta sai marcada **(página oficial não conferida)**.

Este arquivo diz **como** cada pasta trabalha. **Onde** cada pasta e cada arquivo moram está na
árvore fechada de `architecture.md` §4; o que vem de `@<projeto>/shared` (validators, mensagens,
enums, value objects, tipos de request e response) está em `architecture.md` §9 e §10. Idioma de
código e de texto: `typescript.md` §12. Texto que o usuário vê sai sempre de chave de mensagem
(`m.*()`, `i18n.md`), inclusive nos exemplos daqui.

---

## 1. Rotas e pastas

### 1.1 O que cada pasta guarda

| Pasta | Regra |
|---|---|
| `routes/_public/` | vitrine: SSR completo, indexável (§9.2, §9.7) |
| `routes/_authentication/` | login, cadastro, recuperação; `layout.tsx` é o guard inverso (sessão válida sai para o painel); `noindex` |
| `routes/_private/layout.tsx` | portão único de sessão (§1.3); declara `ssr` (§9.2) e `noindex` |
| `routes/_private/<área>/layout.tsx` | guard de capacidade da área (§3.4) |
| `routes/_private/<área>/<recurso>/` | molde de recurso (§1.2) |
| `routes/**/-components/` | a tela e as peças dela; ignorada pelo gerador (prefixo `-`) |
| `routes/**/-<nome>.ts` | módulo privado da rota, testável sem a árvore gerada: `-search.ts`, `-redirect.ts`, `-use-<nome>.ts` (hook de uma rota só) |
| `components/ui/` | shadcn (Base UI), editável só como diz §6 |
| `components/common/<peça>/` | kit de negócio (§8), uma pasta por peça, compound (§6.1) |
| `hooks/` | `use-<nome>.ts`, hook usado por 2+ rotas; nunca `.tsx` |
| `hooks/tanstack-query/_query-keys.ts` | a fábrica única de chaves (§2.1) |
| `integrations/tanstack-query/` | cliente HTTP, `queryOptions` e hooks de mutation por módulo, invalidação (§2, §3) |
| `integrations/react-hook-form/app-field.tsx` | binding único de campo (§4) |
| `lib/<tema>.ts` | lógica pura sem casa de domínio, sempre com `<tema>.test.ts` ao lado |

Fora da árvore (desvio): `src/validators/`, `lib/validator.ts`, `lib/entity.ts`,
`lib/interfaces.ts`, `lib/utils.ts`, `lib/utils/`, `lib/constants/`, `stores/`, `locales/`,
componente de negócio dentro de `ui/`, hook fora de `hooks/` ou da rota. Validator, enum e tipo de
resposta vêm de `@<projeto>/shared`; o frontend nunca importa `@vinejs/vine` (nem em projeto
Adonis) e só importa `zod` nos schemas locais que o `shared/` não cobre, nunca para redeclarar
validator (`architecture.md` §6; `tooling.md` §0.1).

`-components/` é ignorado pelo gerador de rotas pelo prefixo `-`; arquivo posto direto em
`routes/<área>/` sem esse prefixo vira rota fantasma. _doc-lib/tanstack-router.md#routing/routing-concepts.

Peça de rota que passa de ~5 arquivos ganha pasta `-components/<peça>/` com `index.ts`, e de fora
só se importa o `index.ts`. Import lateral entre rotas (`-components/` de uma rota importado por
outra) é desvio: a peça sobe para `common/` *(opinião da casa)*.

**O que sobe para `components/common/` é decidido por rota alcançada, não por arquivo que
importa** *(opinião da casa)*: a peça sobe quando serve duas ou mais **rotas** com a **mesma
intenção**. Duas telas da mesma rota que importam o mesmo arquivo não é reuso; dois botões
parecidos com propósito diferente ficam separados.

### 1.2 Molde de recurso do painel

```
<recurso>/
├── index.tsx  index.lazy.tsx         # lista
├── new.tsx  new.lazy.tsx             # new.tsx leva o `head` (e o loader, se houver); ver abaixo
├── $id/index.tsx  $id/index.lazy.tsx # detalhe
├── $id/edit.tsx   $id/edit.lazy.tsx  # edição
├── -search.ts
└── -components/{table,columns,filters,row-actions,bulk-actions,detail,
                 form-fields,form-create,form-edit}.tsx
```

**`new.tsx` existe em toda tela que tem `head`** *(opinião da casa, `DECISIONS.md` #257)*: o
`createLazyFileRoute` só aceita `component`, `errorComponent`, `pendingComponent` e
`notFoundComponent` (_doc-lib/tanstack-router.md#guide/code-splitting,
https://raw.githubusercontent.com/tanstack/router/main/docs/router/guide/code-splitting.md, aberta em
2026-10-31), e o título da tela (§9.7) tem de estar no arquivo crítico para sair no HTML do
servidor. Sem loader, `new.tsx` é só `createFileRoute` com `head`; a regra do §1.3 (configuração
no `index.tsx`, UI no `.lazy.tsx`) vale igual.

Detalhe e edição são URLs separadas (`$id` e `$id/edit`), nunca a mesma rota com `?mode=edit`:
cada uma tem `head`, guard e `pendingComponent` próprios (`DECISIONS.md` #113, C8).
_doc-lib/tanstack-router.md#routing/route-trees.

### 1.3 Rota é só rota

`index.tsx` declara a configuração: `validateSearch` (importado de `-search.ts`), `loaderDeps`,
`loader`, `pendingComponent`, `notFoundComponent`, `head`. `index.lazy.tsx` só exporta
`component`, um stub que renderiza a tela de `-components/`. A tela lê a rota por
`getRouteApi('<id>')` no escopo do módulo, nunca importando `Route` do arquivo da rota e nunca
por prop drilling.

**Por quê** (reescrito): com `autoCodeSplitting` ligado o plugin já separa componente e loader em
chunks, e a divisão manual "quase sempre é desnecessária"
(_doc-lib/tanstack-router.md#guide/automatic-code-splitting, #guide/code-splitting). O par
`index.tsx`/`index.lazy.tsx` deixa de ser o mecanismo do chunk e fica como **convenção de forma**
*(opinião da casa)*: o arquivo de configuração cabe numa tela, e a UI desce para `-components/`.
O `getRouteApi()` continua obrigatório por outro motivo: importar `Route` cria aresta estática
entre chunks, e ciclo de chunk derruba o SSR em runtime com o build verde (§9.10).

`_private/layout.tsx` é o único portão: o `beforeLoad` roda o guard e enche o cache da sessão com
`context.queryClient.query()` (`ensureQueryData` está deprecated desde o TanStack Query 5.102,
_doc-lib/tanstack-query.md#guides/query-options). Toda rota nascida ali herda a proteção por
estar no lugar, não por lembrar de repetir o guard. Redireciona para o login só em 401/403, com
`?redirect=` validado (§3.5); 5xx sobe ao `defaultErrorComponent`, nunca vira "deslogado".
_doc-lib/tanstack-router.md#guide/authenticated-routes.

### 1.4 Router e navegação

```ts
// src/router.tsx
export function getRouter() {
  const queryClient = createQueryClient()
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })
}
```

- `QueryClient` nasce **dentro** de `getRouter()`, um por requisição (§3.1).
- `defaultPreload: 'intent'` e `defaultPreloadStaleTime: 0`: o router antecipa, o Query decide o
  que está fresco. Prefetch manual em `onMouseEnter` não existe em `<Link>`.
  _doc-lib/tanstack-router.md#guide/preloading, #guide/scroll-restoration.
- Menu e navegação por `linkOptions()`; link interno sempre pelo `Link` tipado, nunca `href`
  literal nem template string em `to` (rota inexistente quebra no typecheck).
  _doc-lib/tanstack-router.md#guide/link-options.
- Tipo de rota sai da árvore registrada: `RouteIds<RegisteredRouter['routeTree']>`,
  `useNavigate({ from })`, wrapper de `Link` por `createLink`.
  _doc-lib/tanstack-router.md#guide/type-utilities, #guide/custom-link.
- Breadcrumb e título de tela saem do segmento de path casado contra um lookup object
  (`{ <segmento>: () => m.<chave>() }`), nunca de `if/else-if` por rota (`typescript.md` §3).

---

## 2. Onde cada dado mora

| Origem | Mora em | Nunca em |
|---|---|---|
| Veio do servidor (lista, detalhe, sessão) | TanStack Query (cache) | `useState` + `useEffect` manual, store |
| Filtro, paginação, aba, painel aberto | search params da URL (`validateSearch`) | `useState` local |
| Estado de formulário | React Hook Form | `useState` por campo |
| Valor derivável de props/estado | expressão no render | `useState` + `useEffect` que recalcula |
| Estado efêmero de UI (aberto/fechado) | `useState` local | Query cache, store global |
| Estado cliente que cruza telas (ambiente ativo, tema) | cookie, ou `lib/local-store.ts` + `useSyncExternalStore` | espelho manual de um endpoint |
| Listener global (online, resize, media query) | um `useSyncExternalStore` num `hooks/use-<nome>.ts` | `addEventListener` por componente |

**Por quê**: um `useAuthStore` espelhando `GET /profile` foi a origem de dois bugs reais:
identidade de um visitante vazando para o render de outro no SSR, e perfil cacheado sobrevivendo
ao logout. O cache do Query já é a fonte única; duplicá-lo cria duas verdades que um `invalidate`
só acerta uma. _doc-lib/tanstack-query.md#guides/queries, #guides/does-this-replace-client-state.

Filtro na URL é o que faz back/forward e link copiado reproduzirem a mesma tela.
_doc-lib/tanstack-router.md#guide/search-params. Leitura com seletor
(`Route.useSearch({ select })`) para a tela não re-renderizar por parâmetro que não usa
(_doc-lib/tanstack-router.md#guide/render-optimizations).

`lib/local-store.ts` é a casa única de `localStorage`: chave versionada `<app>:<tema>:v1`, leitura
em `try/catch`, valor `unknown` convertido pelo schema de `@<projeto>/shared` e default quando o
parse falha (`typescript.md` §2). Nunca `localStorage` direto num componente *(opinião da casa)*.

**Efeitos** *(opinião da casa sobre o React, página oficial não conferida)*:

- Reação a interação do usuário fica no handler, não num efeito que observa estado.
- Efeito que assina evento, timer ou observer devolve a limpeza.
- Dependência de efeito é primitiva (`user.id`, não `user`); resultado de `useEffectEvent` nunca
  entra nas deps.
- **"Reset de estado no render" não é espelho de estado**: um rascunho local que se resincroniza
  comparando uma chave "vista" contra a atual, no corpo do componente (nunca em `useEffect`), é a
  técnica do React para resetar estado quando o input muda. Usada em filtro com rascunho antes de
  aplicar; não confundir com o anti-padrão da tabela.

### 2.1 Chaves, `queryOptions` e busca

**Uma** fábrica central, `hooks/tanstack-query/_query-keys.ts`, com seção por módulo e a mesma
forma em todo recurso *(opinião da casa; a doc mostra a fábrica, não o lugar)*:

```ts
export const queryKeys = {
  administrator: {
    posts: {
      all: ['administrator', 'posts'] as const,
      lists: () => [...queryKeys.administrator.posts.all, 'list'] as const,
      list: (search: AdministratorPostListSearch) =>
        [...queryKeys.administrator.posts.lists(), search] as const,
      details: () => [...queryKeys.administrator.posts.all, 'detail'] as const,
      detail: (id: string) => [...queryKeys.administrator.posts.details(), id] as const,
    },
  },
} as const
```

Arquivo central porque invalidação cruza módulos; `all` como prefixo é o que invalida a família
inteira (lista, infinite, detalhe) de uma vez; detalhe nunca mora sob o prefixo da lista. Array
literal de chave escrito fora da fábrica é desvio. _doc-lib/tanstack-query.md#guides/query-keys.

`queryOptions` mora **por módulo** em `integrations/tanstack-query/queries/<módulo>.ts`,
espelhando `features/<módulo>/` (`DECISIONS.md` #113, C3): plural para a lista
(`postsQueryOptions(search)`, com `placeholderData: keepPreviousData`), singular para o detalhe
(`postQueryOptions(id)`), `signal` repassado ao `request()`. Toda leitura usa `queryOptions()`,
nunca `queryKey`/`queryFn` soltos no componente: é o que faz `loader`, `beforeLoad` e
`useSuspenseQuery` lerem o mesmo cache. Cobrança por `@tanstack/eslint-plugin-query`
(`prefer-query-options`, `exhaustive-deps`; `tooling.md` §4).
_doc-lib/tanstack-query.md#guides/query-options, #eslint/prefer-query-options.

**Todo loader e todo guard** leem por
`context.queryClient.query({ ...postQueryOptions(id), staleTime: 'static' })`.

**`validateSearch` nunca inline no `createFileRoute`** (C2). Uma rota lê: `-search.ts` ao lado.
Duas ou mais rotas leem: `lib/<tema>-search.ts`. Lista do painel usa a fábrica de
`lib/list-search.ts` (`listValidateSearch`, `withExtra([...] as const)`), que lê os tetos
(`page ≥ 1`, `perPage ≤ 100`) do validator de `@<projeto>/shared` em vez de redigitá-los, e
`stripSearchParams` tira o default da URL. _doc-lib/tanstack-router.md#how-to/validate-search-params.

**Retry só para erro de servidor ou rede.** `defaultOptions.queries.retry` é uma função nomeada e
testada (`shouldRetryQuery`) que repete 5xx/rede e devolve `false` para todo 4xx.
_doc-lib/tanstack-query.md#guides/query-retries.

**Combobox com busca no servidor**: um hook por entidade,
`hooks/use-<entidade>-read-paginated-infinite.ts` (`useInfiniteQuery` + `keepPreviousData`),
nunca `useInfiniteQuery` solto no combobox. O debounce é no valor que entra na chave, não na
`queryFn` *(opinião da casa)*. _doc-lib/tanstack-query.md#guides/infinite-queries.

**Job assíncrono por WebSocket** (importação, migração): hook genérico
`useJobSocket<TProgress, TCompleted, TError>` que conecta, entra na sala, ouve
`progress`/`completed`/`error` e limpa ao desmontar; cada job declara namespace e tipos num hook
fino. Polling de status é o fallback (`socket ?? status`) quando o socket cai. Namespace e sala vêm
dos nomes do backend (`backend.md` §3) *(opinião da casa)*.
_doc-lib/socket-io.md; _doc-lib/tanstack-query.md#guides/polling.

### 2.2 Leitura sem cascata

O `loader` dispara em paralelo tudo que a tela precisa; o componente lê com `useSuspenseQuery`.
Nunca o pai busca, renderiza e só então o filho busca.
_doc-lib/tanstack-router.md#guide/external-data-loading; _doc-lib/tanstack-query.md#guides/request-waterfalls.

```ts
loader: async ({ context, params }) => {
  await Promise.all([
    context.queryClient.query({ ...teamQueryOptions(params.id), staleTime: 'static' }),
    context.queryClient.query({ ...teamMembersQueryOptions(params.id), staleTime: 'static' }),
  ])
},
```

- Várias leituras suspensas no mesmo componente usam `useSuspenseQueries`; `useSuspenseQuery` em
  sequência roda em série. _doc-lib/tanstack-query.md#guides/suspense.
- O que entra no `head()` e no primeiro quadro acima da dobra é aguardado no `loader`; o lento
  abaixo da dobra fica fora dele, num `<Suspense>` próprio (§9.3).
- **Vitrine resistente à queda da API**: o `loader` da rota pública usa `Promise.allSettled`, cada
  seção lê o próprio `useQuery` com erro/vazio/lista, e a seção sem dado some em vez de derrubar a
  página *(opinião da casa)*. _doc-lib/tanstack-query.md#guides/ssr.

### 2.3 Mutação e invalidação

Hook de mutation é fino: em `integrations/tanstack-query/mutations/<módulo>.ts`, só `mutationFn` e
`...options` (`MutationProps<TData, TPayload>`). Toast, `navigate` e invalidação ficam com quem
chama (`useResourceForm`, §4) *(opinião da casa)*. _doc-lib/tanstack-query.md#guides/mutations.

- **Um veículo de invalidação**: `useInvalidate()` em `integrations/tanstack-query/invalidate.ts`,
  com o mapa `DEPENDENTS` (recurso → famílias de chave que dependem dele) ao lado. Mutation que não
  invalida o que mudou é defeito.
- O `onSuccess` **devolve a promessa** da invalidação: o `isPending` cobre o refetch e o botão não
  libera com a lista velha. _doc-lib/tanstack-query.md#guides/invalidations-from-mutations.
- Escrita por `mutate(vars, { onSuccess })`. `mutateAsync` só com `await` dentro de `try/catch`;
  nunca `.then/.catch`, nunca `void mutateAsync(...)`: sem `await` a rejeição fica sem dono.
- **Otimista** só em ação de baixo risco (marcar, curtir); pagamento e exclusão esperam o servidor.
  Receita: `cancelQueries` → snapshot → `setQueryData` imutável → rollback no `onError` →
  invalidação no `onSettled`. Sem `!` no `old` (narrowing). `setQueryData` com a resposta só quando
  ela é o registro completo; senão invalida.
  _doc-lib/tanstack-query.md#guides/optimistic-updates, #guides/updates-from-mutation-responses.

---

## 3. Sessão, ambiente e cliente HTTP

### 3.1 Estado por requisição

No SSR, módulo do Nitro é memória do processo, compartilhada entre visitantes. Nada de estado de
requisição em variável de módulo: `QueryClient` nasce em `getRouter()` (§1.4), e o escopo de cada
requisição (dedup de refresh de sessão) abre num request middleware de `start.ts` com
`AsyncLocalStorage`. _doc-lib/tanstack-query.md#guides/ssr (regra 1);
_doc-lib/tanstack-start.md#guide/middleware.

### 3.2 Sessão e ambiente sem store

Sessão é dado do servidor: mora no cache do Query, lida pela **mesma** `queryOptions` que o
`beforeLoad` usa. Ambiente/tenant ativo é uma string em **cookie**, nunca `localStorage`: é o único
canal que o navegador manda junto do documento no SSR. Tema claro/escuro também vem de cookie
(§6). _doc-lib/tanstack-start.md#guide/server-functions.

Render do SSR não lê nada que só existe no cliente (`localStorage`, fuso do navegador,
`Date.now()`, aleatório). `suppressHydrationWarning` só no nó que diverge por natureza.
_doc-lib/tanstack-start.md#guide/hydration-errors.

**Sessão vencida no meio do uso**: o layout privado assina o `QueryCache` e o `MutationCache` e
redireciona ao login em 401, com `?redirect=` da tela atual *(opinião da casa)*.

### 3.3 Ambiente e cliente HTTP

- **Segredo nunca vai para o frontend.** Toda `VITE_*` é pública por definição: entra no bundle e
  qualquer pessoa lê pelo navegador. Chave de API de terceiro (IA, pagamento, e-mail, mapa com
  cota) fica no ENV do backend, e a chamada passa por um service de `services/` exposto por uma ação
  (`architecture.md` §3). `VITE_*` só guarda endereço público e identificador que o fornecedor
  declara público. Cobrado pelo `pattern:check` (nome de variável `VITE_*` com `KEY`, `SECRET`,
  `TOKEN` ou `PASSWORD` reprova).
- **Cabeçalhos de segurança no servidor do frontend** *(opinião da casa; página do Nitro não
  conferida)*: o Nitro não manda nenhum por padrão. `routeRules` com `headers` em `'/**'`
  (`_doc-lib/nitro.md#config`) ou middleware em `src/server.ts` enviam `Content-Security-Policy` com
  `frame-ancestors 'none'` e `connect-src`/`img-src` só para a API e, com upload pré-assinado
  (`backend.md` §5.4), a origem pública do storage, nada além, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin` e HSTS sem `preload`. Sem `frame-ancestors`, a
  tela de login pode ser embutida em `iframe` por outro site (clickjacking).
- **Endereço da API sem default de rede.** `src/env.ts` lê `VITE_API_URL` uma vez e o build falha
  sem ela; `http://localhost:3333` como fallback publica um site que manda senha para a máquina de
  quem visita. O passo de build do CI recebe a variável (`tooling.md` §8).
- **Dado pessoal não fica em `localStorage`**: sem validade, fica para o próximo usuário do
  computador. Guarde o id e busque o resto na API, ou expire.
- `src/env.ts` lê só `VITE_*`, uma vez, de forma síncrona, checado à mão (o módulo roda antes do
  router montar). `SERVER_API_URL` é lida por requisição só no ramo `.server()`.
  _doc-lib/vitejs.md#env-and-mode; _doc-lib/tanstack-start.md#guide/environment-variables.
- Código que diverge entre cliente e servidor (base de URL, leitura de cookie, dedup de refresh)
  usa `createIsomorphicFn()`, nunca `typeof window` no meio da função.
  _doc-lib/tanstack-start.md#guide/environment-functions.
- **Um `request()` só**, em `integrations/tanstack-query/http.ts` (`http.server.ts` para o ramo
  de servidor). Ele:
  - lança `HTTPError`, espelho do `ErrorEnvelope` de `@<projeto>/shared`, registrado como
    `Register['defaultError']` (_doc-lib/tanstack-query.md#typescript); a UI compara `code`, nunca
    `message` (`typescript.md` §5);
  - converte o corpo `unknown` pelo schema `…Response` de `@<projeto>/shared`
    (`architecture.md` §10). É o **único** ponto onde o corpo vira tipo; `as` espalhado e
    `json()` tratado como `T` são desvio (`typescript.md` §2, §2.1);
  - deduplica o refresh em 401 por requisição (§3.1);
  - soma o `signal` da query com um teto de tempo, `AbortSignal.any([signal, timeout])`
    *(opinião da casa, API do runtime)*: sem o teto, API que não responde prende a tela ou o SSR;
  - manda `Accept-Language` com o idioma atual (`i18n.md` §2).

### 3.4 Guard de área e capacidade

O guard de capacidade de uma área mora no `layout.tsx` da área (`_private/<área>/layout.tsx`),
nunca num middleware central nem repetido em cada rota *(opinião da casa)*: a área que exige a
capacidade é a que declara o guard. O `_private/layout.tsx` cobre a sessão; o da área, a permissão.

O que decide **o que renderizar dentro** de uma rota já carregada (esconder botão, desabilitar
célula) é hook de permissão (`use<Recurso>Permission`), nunca `if` de papel espalhado pela tela.

### 3.5 Redirect e datas

- **`?redirect=` só aceita caminho interno.** `validateRedirectSearch` em `lib/redirect-search.ts`
  recusa o que não começa com `/` e tudo que começa com `//` ou `/\` (open redirect), caindo na
  home *(opinião da casa; mecanismo em _doc-lib/tanstack-router.md#guide/authenticated-routes)*.
- **Data exibida tem fuso fixo**: `DateTime` do Luxon (`tooling.md` §0.1) com `setZone` explícito
  (o do negócio ou `'UTC'`) e `setLocale` do idioma atual, num formatador de `lib/i18n.ts`. O fuso
  do navegador faz SSR e hidratação renderizarem strings diferentes *(opinião da casa)*.

---

## 4. Formulários

```ts
const form = useForm<AdministratorPostCreatePayload>({
  resolver: zodResolver(AdministratorPostCreateValidator),
  mode: 'onTouched',
})
```

- **Schema e tipo vêm de `@<projeto>/shared`**: `resolver: zodResolver(<Validator>)`
  (`@hookform/resolvers/zod`) e tipo `z.infer<typeof <Validator>>`
  (`<Módulo><Recurso><Ação>Payload`). Nunca schema declarado no componente, nunca `vine.*` no
  frontend. No projeto Fastify é o **mesmo arquivo** que o backend usa; no projeto Adonis o
  backend valida com o par VineJS (mesmo caminho e nome, `app/validators/`) e o spec de paridade
  confere campo, tipo e teto dos dois (`architecture.md` §9, §10): o formulário não aceita o que a
  API rejeita. _doc-lib/zod.md#basics, _doc-lib/react-hook-form.md#docs/useform.
- Mensagem de validação sai do locale do Zod e do mapa por idioma de `shared/src/validator.ts`,
  nunca string no campo (`i18n.md` §2). _doc-lib/zod.md#error-customization.
- `mode: 'onTouched'` (valida ao sair do campo, não a cada tecla). Campo liga por `AppField`
  (`Controller`), nunca `register`. `shouldFocusError` fica no padrão (ligado).
  _doc-lib/react-hook-form.md#docs/usecontroller/controller.
- Valor observado num filho por `useWatch({ control, name })`; `form.watch` só na raiz que
  precisa. _doc-lib/react-hook-form.md#docs/usewatch.
- **Erro da API no formulário** por uma função central, `applyHTTPErrorToForm` em
  `lib/form-errors.ts`: cada entrada de `error.errors` vai para o campo quando o campo está em
  `X_FIELDS`; o resto vai para `setError('root')` ou para um toast com `id` fixo. Nunca
  `try/catch` por tela. _doc-lib/react-hook-form.md#docs/useform/seterror.
- **"Tentar de novo"** é oferecido em 409, 5xx e falha de rede, mantendo o digitado; nunca em
  401/403/404/422, que reenviar não resolve. Mesmo critério de `shouldRetryQuery` (§2.1)
  (`DECISIONS.md` #113, C16; revisa a #46).
- Máscara (telefone, CPF, moeda) usa a lib de máscara instalada e lê o valor **sem máscara** por
  `.parse()` antes de submeter, nunca regex tirando caractere.
  _doc-lib/use-mask-input.md#tutorial-basics/static-mask.
- **Formulário dinâmico** (campos definidos em runtime): o resolver recebe o schema montado pelo
  construtor de `@<projeto>/shared` a partir da definição dos campos (`architecture.md` §10);
  `rules` por campo e `resolver` nunca convivem no mesmo form (o RHF ignora `rules` quando há
  `resolver`). _doc-lib/react-hook-form.md#get-started#Applyvalidation.
- **Formulário sensível** (login, cadastro, senha) tem `method="post"`: antes da hidratação, o
  envio nativo não põe senha na query string *(opinião da casa)*.
- **Alteração não salva**: `useBlocker` quando `formState.isDirty`.
  _doc-lib/tanstack-router.md#guide/navigation-blocking.

**`useResourceForm` sobre `useMutationForm`** *(opinião da casa)*: `useMutationForm` é a base
(form + mutation + `applyHTTPErrorToForm` + retry) para diálogo, login e cadastro em linha;
`useResourceForm` acrescenta `formId`, `validator`, `defaults`/`values`, `fields`, `mutation`,
`invalidate`, `backTo`, `success`, `retry` e `payload`, e é o padrão de todo formulário de criação
e edição de recurso. Os dois moram em `hooks/`.

**Arquivos do formulário de recurso** *(opinião da casa)*:

- `-components/form-fields.tsx` exporta `PostFormFields({ form, idPrefix })` (só os campos, sem
  envio), `POST_FIELDS` (`as const`, os campos que a API pode acusar), `POST_FORM_DEFAULTS` e
  `postToValues(post)`. A conversão entre formulário e API mora aqui, com teste.
- `form-create.tsx` e `form-edit.tsx` são cascas que chamam `useResourceForm` e renderizam o
  mesmo `form-fields.tsx`, com `idPrefix` diferente (ids não colidem). Recurso com um modo só tem
  só a casca dele.
- **Edição valida com o validator de criação**: o de `Update`, todo opcional, aprovaria campo
  obrigatório apagado. Exceção: campo "em branco = não trocar" (senha), que sai do payload quando
  vazio; `passwordConfirmation` é declarado no validator.

**Upload em voo trava o submit** *(opinião da casa)*: campo que sobe o arquivo na escolha
registra uma chave em `components/common/uploading-context.tsx` (`Set<string>`, não contador) e
a remove ao terminar ou falhar; o salvar fica desabilitado enquanto o `Set` não estiver vazio.

**Formulário dentro de Dialog/Sheet** é um componente interno montado só quando aberto, e
`form.reset()` vem antes de fechar: dispensa `useEffect` atrelado a `open` (§6.2).

Acessibilidade do formulário (rótulo, `aria-invalid`, `aria-describedby`, atributos de entrada):
§10.3.

---

**Envio duplo é conforto, não proteção**: o botão de enviar fica desabilitado durante o envio
(`formState.isSubmitting`, que fica `true` só enquanto a promise do envio está pendente;
`_doc-lib/react-hook-form.md#docs/useform`, página `useform/formstate`), e a regra que impede o efeito duplicado mora no backend (`backend.md`
§4.11, recurso limitado e `Idempotency-Key`). Preço, desconto, permissão e limite de plano mostrados
na tela são cópia do que o servidor calculou; o frontend nunca manda valor para o servidor confiar
(`backend.md` §5.7, item 3).

## 5. Erros, carregamento e não encontrado

`QueryErrorResetBoundary` com `react-error-boundary` em volta do `Outlet` é o que permite "tentar
de novo" sem recarregar a página: um `try/catch` por componente não limpa o estado de erro que a
boundary guardou. Rota declara `errorComponent` próprio só quando o erro pede tela diferente.
_doc-lib/tanstack-query.md#guides/important-defaults; _doc-lib/tanstack-start.md#guide/error-boundaries.

- **Carregamento**: rota de listagem declara `pendingComponent` com o `table-skeleton` do kit
  (§8), do mesmo tamanho da tela final; nunca `<Loading />` genérico nem tela em branco
  *(opinião da casa)*. `defaultPendingMs` fica no padrão até haver medida.
- `useSuspenseQuery` só abaixo de uma boundary. A rota inteira é o `pendingComponent`; dentro da
  tela, seção que carrega sozinha tem `<Suspense>` próprio com esqueleto.
  _doc-lib/tanstack-query.md#guides/suspense.
- **Não encontrado**: o loader de detalhe passa por `loadOrNotFound` (`lib/load-or-not-found.ts`):
  404 da API vira `throw notFound()`, todo o resto relança. A rota declara `notFoundComponent`.
  5xx nunca vira 404, e "não encontrado" nunca responde 200 (soft 404).
  _doc-lib/tanstack-router.md#guide/not-found-errors.
- **Mapa de status para a tela** *(opinião da casa)*: 401 → login, 403 → tela de permissão,
  404 → não encontrado, 422 → campo (§4), 429 → aguarde, 5xx e rede → genérico com "tentar de
  novo". Erro de um bloco não derruba a tela inteira.

Os quatro estados de toda tela que lê dado (carregando, vazio, erro, preenchido): §10.1.

---

## 6. Design system e estilo

### `components/ui/` é arquivo do projeto, editável com marca

O shadcn copia o componente para o repositório: "um arquivo seu, versionado, editável"
(_doc-lib/shadcn.md#docs). A régua antiga ("não se edita") contradizia a doc e todo projeto já
editava; vale a doc (`DECISIONS.md` #113, C10):

- **Pode**: variante nova no `cva` do próprio arquivo e rótulo traduzido (`m.*()`), cada linha
  alterada marcada com `// casa:` e o motivo em inglês (`// casa: success variant for status
  badges`). A marca é o que permite reaplicar a mudança quando o componente vem de novo do
  registry.
- **Não pode**: hook do app, regra de negócio, fetch, componente que não veio do registry (vai
  para `common/`).
- Componente de `ui/` sem nenhum consumidor sai.

_doc-lib/shadcn.md#docs/theming, #docs/components-json.

### Tokens e tema

- Componente consome **token semântico** (`primary`, `destructive`, `muted-foreground`,
  `success`, `warning`), nunca paleta fixa. Modo escuro redefine só o semântico.
  _doc-lib/shadcn.md#docs/theming; _doc-lib/tailwindcss.md#dark-mode.
- Tailwind v4 pelo plugin do Vite, sem `tailwind.config.js`; tema em `@theme` dentro de
  `styles.css`. _doc-lib/tailwindcss.md#installation/using-vite, #theme.
- **Todo valor de design é token no `@theme`**, pelo namespace dele (`--color-*`, `--text-*`,
  `--font-*`, `--leading-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--breakpoint-*`,
  `--ease-*`, `--animate-*`). Valor arbitrário em classe (`text-[13px]`, `z-[9999]`,
  `-[var(--x)]` repetido) é desvio; valor repetido vira token ou `@utility`.
  _doc-lib/tailwindcss.md#theme, #adding-custom-styles.
- Nome de token diz papel, não valor (`--text-heading`, nunca `--font-size-16`). z-index é escala
  nomeada em token (`sticky < overlay < modal < dropdown < toast < tooltip`) *(opinião da casa,
  `DECISIONS.md` #257)*: o `dropdown` (popup de select, menu, popover e combobox do Base UI) fica
  **acima** do `modal`, porque abre de dentro de dialog e sheet, e popup abaixo do modal que o
  abriu é inalcançável. A doc não fixa a ordem; só pede o `isolation: isolate` do app
  (_doc-lib/base-ui.md#react/overview/quick-start). z-index local (`z-10`) fica fora da escala.
- Tema claro/escuro decidido no servidor (cookie lido no `loader` da raiz), sem flash.
  _doc-lib/shadcn.md#docs/dark-mode/tanstack-start.
- Popup do Base UI anima entrada e saída por `data-starting-style`/`data-ending-style` com
  `transition`. _doc-lib/base-ui.md#react/handbook/animation.
- Identidade visual (cor, família, raio, direção) é do projeto e mora em `docs/DESIGN.md` e no
  tema (`documentation.md`); esta régua só diz onde e como.

### Classe e variante

- `cn()` mora em `lib/cn.ts`, sozinho (convenção shadcn; `components.json` aponta o alias), com
  `extendTailwindMerge` quando o tema tem escala custom; a exceção nomeada está em
  `typescript.md` §6 (`DECISIONS.md` #113, C19). *(opinião da casa: `tailwind-merge` não é lib
  oficial do Tailwind; _doc-lib/tailwindcss.md#styling-with-utility-classes não contradiz.)*
- Classe condicional por `cn('base', { 'is-active': isActive })` ou lookup; nunca ternário nem
  concatenação de string em `className`/`style`.
- Variante visual mora no `cva` do componente e é tipada por `VariantProps<typeof xVariants>`;
  nunca `if` de classe na tela nem union de string redigitada (`DECISIONS.md` #95).

### 6.1 Compound component, nunca componente de muitas props

Componente com mais de uma área de conteúdo é **compound**: uma raiz que guarda o estado em
contexto e partes que se compõem como filhos. Forma do shadcn: cada parte é **named export**
(`Card`, `CardHeader`, `CardTitle`) e toda parte leva `data-slot`
(_doc-lib/shadcn.md#docs/components, #docs/tailwind-v4). O Base UI compõe da mesma forma
(_doc-lib/base-ui.md#react/handbook/composition).

```tsx
// errado: cada variação vira mais uma prop, e o componente decide o layout por if
<UserCard user={user} showAvatar showActions actionsPosition="bottom" title="..." />

// certo: quem usa monta; cada parte é pequena e substituível
<UserCard user={user}>
  <UserCardHeader>
    <UserCardAvatar />
    <UserCardTitle>{m.users_card_title()}</UserCardTitle>
  </UserCardHeader>
  <UserCardActions />
</UserCard>
```

```tsx
// certo: components/common/user-card/user-card-context.ts
type UserCardContextValue = { readonly user: AdministratorUserShowResponse }

export const UserCardContext = createContext<UserCardContextValue | null>(null)

export function useUserCardContext(consumer: string): UserCardContextValue {
  const context = use(UserCardContext)
  if (!context) throw new Error(`<${consumer}> must be rendered inside <UserCard>`)
  return context
}

// certo: components/common/user-card/user-card-avatar.tsx
export function UserCardAvatar({ className, ...props }: Readonly<ComponentProps<'img'>>): React.JSX.Element {
  const { user } = useUserCardContext('UserCardAvatar')
  return <img data-slot="user-card-avatar" src={user.avatarUrl} alt={user.name} className={cn('size-8 rounded-full', className)} {...props} />
}

// certo: components/common/user-card/index.ts
export { UserCard } from './user-card'
export { UserCardAvatar } from './user-card-avatar'
export { UserCardHeader } from './user-card-header'
```

Regras:

- **Named export por parte**, prefixado pela raiz, reexportado pelo `index.ts` da pasta. Nunca
  objeto `{ Root, Header }` com acesso por ponto (`DECISIONS.md` #88).
- **Pasta própria** (`DECISIONS.md` #89): `<nome>.tsx` (raiz), `<nome>-context.ts`,
  `<nome>-<parte>.tsx` por parte grande, `index.ts`, `<nome>.test.tsx`. Parte de poucas linhas pode
  morar no arquivo da raiz. Compound **route-local** (`-components/<peça>/`) segue a mesma forma.
- `index.ts` só por peça. Barrel agregador (`components/common/index.ts`, `hooks/index.ts`,
  `lib/index.ts`) é proibido; de fora da peça só se importa o `index.ts` dela (`tooling.md` §4).
- **Toda parte leva `data-slot="<nome>-<parte>"`.** Layout que muda conforme a parte existe lê
  `has-data-[slot=<nome>-<parte>]:` no pai, nunca prop booleana. Slot nunca é detectado por
  `child.type`, `React.Children.map` ou `cloneElement`
  (_doc-lib/react-hook-form.md#advanced-usage#SmartFormComponent).
- **Estado no contexto da raiz**, lido por `use()` através do hook com o nome de quem chama, que
  lança apontando a parte fora do lugar. Contexto com mais de uma fonte possível tem a forma
  `{ state, actions, meta }`, e o provider é o único que sabe de onde o estado vem: trocar
  `useState` por mutation não toca a parte *(opinião da casa)*.
- Contexto partido por preocupação; valor de alta frequência (posição, digitação) não vai em
  contexto lido por muitos. Contexto não carrega genérico: a instância de `useTable<TData>` segue
  por prop, nunca `Context` com `as`.
- Prop booleana de mostrar/esconder (`showX`) é compound faltando: a parte existe ou não no JSX.
  Modo distinto vira componente-variante explícito (`PostFormCreate`, `PostFormEdit`), nunca
  `<PostForm isEditing />`.
- Elemento renderizado se troca pela prop `render` do Base UI, nunca `asChild` nem prop `as`
  (_doc-lib/base-ui.md#react/handbook/composition).
- `children` no lugar de `renderX`. Render prop só quando o pai entrega dado ao filho (linha
  virtualizada, `table.Subscribe`), e nunca se chama `render`.
- Prop continua certa para **dado** (`user`, `value`, `onChange`) e para variante de estilo do
  próprio componente (`variant`, `size` via `cva`). Estrutura é JSX, não prop.

**Nem toda estrutura de partes ganha `Context`** (`DECISIONS.md` #48): quando as partes não
compartilham estado, compound sem `createContext` já resolve, e contexto a mais é cerimônia sem
leitor.

Skills: `compound-pattern`, `react-composition-patterns` (vale a régua onde elas divergem:
`X.Part`, `as`, `useContext`).

### 6.2 Sobreposições: Dialog, AlertDialog, Sheet

A forma única está nas skills `dialog-pattern` e `sheet-pattern`; o resumo que vale aqui:

- **Uncontrolled e trigger-forward**: o componente recebe as props do `Trigger`
  (`Merge<Omit<ComponentProps<typeof DialogTrigger>, ...>, {...}>`) e espalha `{ ref, ...rest }`
  nele; sem `open`/`onOpenChange`/`useState` de abertura. Header sempre com Title e Description
  (`sr-only` quando esconder); "Cancelar" é `DialogClose render={<Button variant="outline" />}`.
- **Abrir sem clique do usuário** (atalho, alvo vindo de linha ou menu, efeito) usa
  `Dialog.createHandle()` e `open()`/`openWithPayload()`; nunca `useEffect` que clica um `ref`,
  nunca botão escondido. O `ref.click()` programático falha em silêncio no Base UI.
  `ref.current?.click()` dentro do `onClick` de um clique real continua válido.
  _doc-lib/base-ui.md#react/components/dialog.
- Dialog aberto de menu é irmão do `DropdownMenu`, fora do `DropdownMenuContent`; um handle por
  Dialog, não por lugar que abre.
- Dialog de formulário foca o primeiro campo (`initialFocus`); conteúdo montado só aberto (§4).
- Sheet de filtro não guarda filtro: desenha os controles e navega search params (§2). Link de menu
  mobile vai em `<SheetClose render={<Link ... />} />`.
- Modal não é a primeira opção: só para tarefa que precisa interromper ou proteger o foco; o resto
  é inline, Sheet ou página *(opinião da casa)*.
- Ação destrutiva: `ConfirmDialog` do kit (AlertDialog) e as regras de §10.6.
  _doc-lib/base-ui.md#react/components/alert-dialog.
- Texto de toda sobreposição sai de `m.*()`.

### 6.3 Componentes e hooks

- Componente nunca é declarado dentro de outro componente, de hook ou de `useMemo`: tipo novo a
  cada render desmonta a subárvore e perde estado.
- React 19: `ref` é prop (sem `forwardRef`); contexto se lê com `use()`.
  _doc-lib/shadcn.md#docs/react-19.
- Lógica reutilizável sobe para hook; HOC e componente-container não entram em código novo. A tela
  recebe dado por hook (`useTeamPermission`) ou por `getRouteApi()`, não por wrapper que só busca
  (`solid.md` §4).
- Hook que devolve coisas com dependências independentes se parte em dois (quem lê `isMobile` não
  re-renderiza por `width`).
- Props `Readonly<...>` e retorno `React.JSX.Element` explícito em componente de `common/` e de
  `-components/`; hook e função exportada com retorno anotado (`typescript.md` §7)
  *(opinião da casa)*.
- Elemento clicável que não é `<button>`: §10.2.

### 6.4 Referência visual e componente de terceiro *(opinião da casa sobre a doc)*

Duas coisas diferentes, com regra diferente.

**Referência (só olhar)**: Godly (`godly.website`) e Awwwards (`awwwards.com`) para direção e nível
de acabamento; Motionsites (`motionsites.com`) para landing animada. Entram **antes** do layout, na
direção visual (`design-taste-frontend`, `design-dna`), e o que se escolheu vai para
`docs/DESIGN.md` §12 com o porquê. O prompt pronto do Motionsites é ponto de partida para a
conversa, não especificação: o resultado passa pelos tokens do projeto e por esta régua. Marca,
logo, texto e imagem do site de referência nunca entram.

**Componente (copia e cola)**: 21st.dev e React Bits (`reactbits.dev`) entregam código que vira
arquivo do projeto. O 21st.dev é registry comunitário instalável por `shadcn add <url>`, e registry
comunitário "não passa por nenhuma curadoria do shadcn" (_doc-lib/shadcn.md#docs/directory): é
código de terceiro e se revisa **antes** de instalar. Ao trazer:

- **Só vitrine e efeito de marketing** (hero, fundo, texto animado, seção de landing). Formulário,
  tabela, Dialog, menu e qualquer primitivo interativo vêm do shadcn sobre Base UI (§6, §6.2), nunca
  de bloco copiado, porque teclado, foco e `role` já estão resolvidos lá.
- **Primitivo de Radix no código copiado** é trocado pelo equivalente do Base UI ou o bloco não
  entra (`SKILLS-MAP.md`, "Quando a skill contradiz a casa").
- **Dependência nova** que o bloco puxa (GSAP, Three.js, OGL) só entra com
  `_doc-lib/<lib>.md` e linha em `docs/DECISIONS.md` (`AGENTS.md`, "Autoridade"). Sem isso, a versão em CSS
  do bloco (o React Bits oferece variante CSS e Tailwind) ou nada. Motion já tem entrada
  (`_doc-lib/motion.md`): `motion/react` com `LazyMotion` + `m`, e Motion+ só com decisão do projeto.
- **Licença conferida** e anotada no topo do arquivo: React Bits é MIT com Commons Clause, 21st.dev
  varia por autor. Sem licença declarada, o bloco não entra.
- **O arquivo passa pela régua inteira**: TypeScript sem `any`/`as`/`!`, sem ternário, cores e
  raios só por token (§6, "Tokens e tema"), texto por chave de i18n (`i18n.md`),
  `prefers-reduced-motion` por componente (§10), e o lugar na árvore de `architecture.md`
  (`components/common/` só se duas rotas usam; senão `-components/` da rota).
- **Efeito pesado** (WebGL, canvas, shader) entra com `lazy` e fora do caminho crítico (§9.4, §9.8):
  fundo animado não pode piorar o LCP da página.

---

## 7. Nomenclatura

| Tipo | Forma | Exemplo |
|---|---|---|
| Componente | PascalCase, arquivo kebab | `TeamTable` em `team-table.tsx` |
| Props de componente | `<Componente>Props`, `Readonly` | `TeamTableProps` |
| Hook | `use-kebab-case.ts`, export `useCamelCase` | `use-team-permission.ts` |
| Hook de uma rota só | `-use-<nome>.ts` ao lado da rota | `teams/-use-team-filters.ts` |
| Rota config / stub | `index.tsx` / `index.lazy.tsx` | `teams/index.lazy.tsx` |
| Search da rota | `-search.ts` | `teams/-search.ts` |
| Peças do recurso | molde de §1.2 | `teams/-components/row-actions.tsx` |
| Parte de compound | `<nome>-<parte>.tsx`, export `<Nome><Parte>` | `user-card-avatar.tsx` → `UserCardAvatar` |
| Chaves | `queryKeys.<módulo>.<recurso>.<forma>` | `queryKeys.administrator.posts.detail(id)` |
| `queryOptions` | plural para lista, singular para detalhe | `postsQueryOptions(search)`, `postQueryOptions(id)` |
| Hook de mutation | `use<Recurso><Ação>Mutation` | `usePostArchiveMutation` |
| Hook de combobox | `use-<entidade>-read-paginated-infinite.ts` | `use-team-read-paginated-infinite.ts` |
| Módulo de `lib/` | `<tema>.ts`, nome do domínio | `lib/list-search.ts`, `lib/page-head.ts` |
| Teste Vitest | `<x>.test.ts(x)` ao lado | `lib/bulk.test.ts` |
| Teste E2E | `e2e/<fluxo>.spec.ts` | `e2e/post-publish.spec.ts` |
| `data-testid` | kebab, só onde um E2E lê (§11) | `data-testid="posts-row-actions"` |
| Tipo | PascalCase, sem prefixo | `AdministratorPostShowResponse`, `PostStatus` |
| Enum | trinca objeto/tipo/array de `@<projeto>/shared` (`typescript.md` §4) | `POST_STATUS`, `PostStatus`, `POST_STATUSES` |
| Chave de mensagem | `snake_case` prefixada pela área (`i18n.md` §2) | `posts_empty_title` |

Prefixo em nome de tipo e de enum: `typescript.md` §4. Arquivo "utilitário" genérico (`utils.ts`,
`helpers.ts`, `handle-*.ts`) não existe: função tem casa (`typescript.md` §6).

Regras de código (sem ternário, sem `any`, sem `as` exceto `as const`, sem `!`, `type` nunca
`interface`, `Merge` no lugar de `&`, lookup object, sem verificação de tipo dentro da função) são
as de `typescript.md`; este documento não as repete.

---

## 8. Kit comum *(opinião da casa)*

Todo frontend da casa tem estas peças, com o mesmo nome e a mesma API. Projeto novo traz o kit,
não reescreve (`architecture.md` §1, princípio 9); peça nova nasce compound (§6.1) e entra no
`docs/DESIGN.md` §7 (Componentes) no mesmo commit.

| Onde | Peça | Para quê |
|---|---|---|
| `components/common/page-shell/` | casca de tela: título, ações, corpo | toda tela do painel |
| `components/common/form-shell/` | casca de formulário: título, corpo, ações | submit travado por upload em voo (§4) |
| `components/common/submit-button/` | botão de envio com estado de envio | sem duplo envio (§10.1) |
| `components/common/table/` | data table: `useTable({ rows, columns, getRowId, persistKey, actions, selectable })`, paginação, colunas visíveis, redimensionar, `table-skeleton`, virtualização opcional (§9.9) | toda listagem; layout persistido validado pelo schema de `shared/` |
| `components/common/row-actions/` | menu de ações por linha | ação de linha igual em toda tabela |
| `components/common/bulk-archive/` | arquivar, restaurar, remover em massa | detalhe e lista não reescrevem o ciclo |
| `components/common/confirm-dialog/` | confirmação de ação destrutiva (AlertDialog) | §10.6 |
| `components/common/empty-state/` | estado vazio por motivo, sobre `ui/empty` | §10.1; _doc-lib/shadcn.md#empty |
| `components/common/not-found-page/` | `notFoundComponent` padrão | §5 |
| `components/common/option-combobox/` | combobox de opções (+ `toOptions`) | combobox local e paginado |
| `components/common/input-password/` | senha com mostrar/ocultar | formulário de sessão |
| `components/common/picture/` | imagem com dimensão, `alt` e carregamento por posição | §9.6 |
| `components/common/image-field/`, `multi-file-upload/` | campo que sobe o arquivo na escolha | registra no `uploading-context` |
| `components/common/rich-editor/` | editor de texto rico, carregado sob demanda (§9.4); grava o JSON do Tiptap | _doc-lib/tiptap.md |
| `components/common/rich-text/` | leitura de conteúdo rico (JSON do editor ou Markdown de fora via `MarkdownManager.parse`) por `renderToReactElement` do `@tiptap/static-renderer`, sem editor e sem `innerHTML` | _doc-lib/tiptap.md#api/utilities/static-renderer |
| `components/common/uploading-context.tsx` | registro de upload em voo | §4 |
| `lib/cn.ts` | `cn()` | §6 |
| `lib/labels.ts` | rótulo e variante visual de enum | abaixo |
| `lib/i18n.ts` | `localized()`, formatador de data (Luxon) e de número e moeda (`Intl`) | `i18n.md` §2, §3.5 |
| `lib/form-errors.ts`, `lib/form-a11y.ts` | `applyHTTPErrorToForm`; `invalidProps`, `errorId` | §4, §10.3 |
| `lib/list-search.ts`, `lib/redirect-search.ts` | fábrica de search de lista; `validateRedirectSearch` | §2.1, §3.5 |
| `lib/page-head.ts`, `lib/load-or-not-found.ts` | `pageHead()`; `loadOrNotFound` | §9.7, §5 |
| `lib/local-store.ts` | `localStorage` versionado e validado | §2 |
| `lib/bulk.ts` | ação em massa sem endpoint dedicado | abaixo |
| `lib/chunking.ts`, `upload-transport.ts`, `upload-resume.ts` | upload em partes, retomável | arquivo grande sem refazer do zero |

**Link em conteúdo rico**: `href` só `https:`, `http:` e `mailto:`, conferido no validator do backend ao
gravar o JSON. O React 19 bloqueia `javascript:`, mas não `data:` (skill `security-audit`, CLIENT-SIDE.md).

**Conteúdo rico é só Tiptap** *(doc do Tiptap; `DECISIONS.md` #196)*: editar, ler e converter
Markdown usam as peças nativas do Tiptap, e nenhuma outra lib de Markdown entra (`react-markdown`,
`remark-*`, `rehype-*`, `marked` direto, `markdown-it` saem).

- **Gravar**: o editor grava JSON (`editor.getJSON()`).
- **Typography só com `emDash: false`**: a extensão troca `--` por travessão no texto do usuário, o
  que a régua não aceita em texto (`i18n.md` §5); as outras trocas (reticências, aspas curvas)
  ficam (_doc-lib/tiptap.md, "Catálogo: extensões", linha Typography;
  https://tiptap.dev/docs/editor/extensions/functionality/typography, "Disabling rules").
- **Ler**: o mesmo JSON vai para `renderToReactElement` (`@tiptap/static-renderer`), que a doc chama
  de caminho preferido para leitura em React: devolve elemento React, sem `innerHTML`
  (_doc-lib/tiptap.md#api/utilities/static-renderer).
- **Markdown que vem de fora** (resposta de IA, importação, conteúdo legado): `MarkdownManager.parse()`
  do `@tiptap/markdown` converte em JSON **sem editor** e o JSON segue pelo mesmo renderizador
  (https://tiptap.dev/docs/editor/markdown/api/markdown-manager). HTML embutido no Markdown só vira nó
  se uma extensão registrada o reconhece no `parseHTML`: o schema das extensões é a lista de
  permissão, no lugar de um schema de sanitização mantido à mão. Isso depende do `DOMParser`: no servidor (SSR) o
  `@tiptap/markdown@3.32` devolve todo HTML embutido como texto literal (código instalado,
  `parseHTMLToken`). Por isso a conversão roda **num lado só** (no backend, ao gravar, ou só no
  cliente) e a tela recebe JSON; converter no SSR e de novo no cliente quebra a hidratação.
- **Exportar Markdown**: `renderToMarkdown` do static renderer.
- Um componente só em `components/common/rich-text/` recebe JSON ou Markdown e devolve o elemento,
  com a mesma lista de extensões do editor.
- Custo aceito: o `@tiptap/markdown` é *early release* na doc (https://tiptap.dev/docs/editor/markdown);
  versão fixada e teste de ida e volta (Markdown → JSON → Markdown) cobrem a mudança de API.

**Ação em massa sem endpoint dedicado**: `Promise.allSettled` sobre as chamadas unitárias,
devolvendo `{ done, failed }`, e a mensagem relata "N de M". Nunca `Promise.all`: a primeira falha
esconde o que já foi feito.

**`lib/labels.ts`**: o enum vem de `@<projeto>/shared` (`architecture.md` §9); o rótulo é uma
função por valor que chama `m.*()` (é a função que faz o rótulo mudar com o idioma, `i18n.md` §2),
e a variante visual sai do `cva`. `satisfies Record<PostStatus, ...>` sobre o objeto literal cobra
no typecheck os dois sentidos: valor sem rótulo e rótulo sem valor. Nunca `if`/`switch` de rótulo
na tela.

```ts
// certo: lib/labels.ts
import { type PostStatus } from '@<projeto>/shared'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

export const POST_STATUS_LABELS = {
  DRAFT: () => m.post_status_draft(),
  PUBLISHED: () => m.post_status_published(),
} satisfies Record<PostStatus, () => string>

export const POST_STATUS_VARIANTS = {
  DRAFT: 'outline',
  PUBLISHED: 'default',
} satisfies Record<PostStatus, BadgeVariant>
```

- Plural e concordância (`1 post`, `2 posts`) saem da própria mensagem (variante com seletor
  `plural`, que usa `Intl.PluralRules` e devolve categoria, `one`/`other`, nunca número;
  _doc-lib/paraglide.md#/variants), nunca de `if` por tela nem de ternário.
- `lib/<tema>.ts` com lógica não trivial tem `lib/<tema>.test.ts` ao lado (§11).

---

## 9. Render, desempenho e SEO

### 9.1 Render do React

- **React Compiler ligado** (`babel-plugin-react-compiler` no `vite.config.ts`; regras do
  compiler no `eslint-plugin-react-hooks`, `tooling.md` §4). Sem `useMemo`/`useCallback`/`memo`
  manual por padrão; memo manual só depois de medir, com comentário do porquê. Componente que só
  recebe objetos da tabela (`row`, `cell`) lê estado por `table.Subscribe`.
  _doc-lib/tanstack-table.md#framework/react/guide/react-compiler (página oficial do React não
  conferida).
- Atualização não urgente em `startTransition`; valor que alimenta render caro em
  `useDeferredValue`; pendência por `isPending`, não por `useState` de loading.
- **Condicional de JSX com expressão booleana explícita**: `{count > 0 && <Badge />}`,
  `{items.length > 0 && <List />}`, nunca o valor cru (`{count && ...}` renderiza `0`). Dois ramos
  são o par `{c && <A />}{!c && <B />}` ou lookup; ternário é erro de lint (`no-ternary`).
- Painel caro que alterna visível/oculto e precisa manter estado pode usar `<Activity mode>`, com
  `mode` por lookup.

### 9.2 SSR por grupo de rota

| Grupo | `ssr` | Por quê |
|---|---|---|
| `_public/` | padrão (SSR completo, não declara) | o HTML do servidor é o único que crawler e preview de link leem |
| `_authentication/` | padrão | formulário funciona antes da hidratação (§4, `method="post"`) |
| `_private/` | `'data-only'` quando o cookie de sessão chega ao SSR (mesmo domínio-pai); `false` quando não chega | `beforeLoad` e `loader` seguem no servidor e o cache chega hidratado, sem o servidor renderizar tabela, editor e gráfico que ninguém indexa |

_doc-lib/tanstack-start.md#guide/selective-ssr. A herança vale para baixo e só fica mais
restritiva (página oficial não conferida). Projeto que já hidrata o painel mede antes de trocar
(o primeiro quadro passa a ser o `pendingComponent`).

- Componente que depende de API só de navegador (mapa, canvas, câmera, leitor de QR) vai em rota
  `ssr: false` ou atrás de `ClientOnly`; nunca `typeof window` no corpo do componente.
- SPA mode não é padrão da casa: todo projeto tem área pública. _doc-lib/tanstack-start.md#guide/spa-mode.
- Página institucional que só muda por deploy (sobre, termos) pode usar `prerender` com a lista de
  caminhos explícita; nunca página que lê cookie. _doc-lib/tanstack-start.md#guide/static-prerendering.
- RSC não entra. Biblioteca pesada só de servidor (markdown, PDF) roda em `createServerFn` chamada
  pelo `loader`, e o módulo de servidor só é importado dentro do handler.
  _doc-lib/tanstack-start.md#guide/server-components, #guide/import-protection.

### 9.3 Dados e streaming

- Dado do `head()` e do elemento de LCP é aguardado no `loader` (§2.2); LCP nunca nasce de fetch
  no cliente.
- O lento abaixo da dobra fica fora do `loader`: o componente lê com `useSuspenseQuery` dentro de
  `<Suspense>` próprio, com fallback de altura fixa, e a integração do Query com o router transmite
  o resultado no stream (página oficial não conferida). `Await` com promessa sem `await` só onde
  não há Query. _doc-lib/tanstack-router.md#guide/deferred-data-loading;
  _doc-lib/tanstack-start.md#guide/tanstack-query.
- Proxy e CDN não podem bufferizar o HTML em stream (mesma família do gzip que quebra SSE):
  conferir com `curl -N` que o primeiro byte chega antes do fim.

### 9.4 Divisão de código

- `autoCodeSplitting` ligado no plugin; o par `index`/`index.lazy` é convenção de forma (§1.3).
  _doc-lib/tanstack-router.md#guide/automatic-code-splitting.
- Componente pesado fora do primeiro quadro (editor rico, gráfico, mapa, upload multipart) é
  `lazy` + `<Suspense>`, carregado no gesto ou na visibilidade, com fallback da mesma altura:

```tsx
// routes/_private/posts/-components/form-fields.tsx
const RichEditor = lazy(async () => {
  const module = await import('#/components/common/rich-editor')
  return { default: module.RichEditor }
})

<Suspense fallback={<Skeleton className="h-64" />}>
  <RichEditor name="body" />
</Suspense>
```

- `import()` dinâmico por mapa de funções literais, nunca caminho em variável:
  `const CHART_MODULES = { bar: () => import('./bar-chart') } as const`.
- Sem `manualChunks`/`advancedChunks` por padrão: chunk manual só com medida antes/depois e
  `check-chunk-cycles` verde (§9.10).
- SDK de terceiro não crítico (analytics, Sentry de navegador, chat) entra por `import()` depois
  da hidratação e só nas rotas que usam; script externo por `head().scripts` com `defer`, nunca
  `<script>` síncrono no `<head>`. _doc-lib/tanstack-start.md#guide/observability.
- Antes de instalar dependência pesada, o nativo (`fetch`, `Intl`, `structuredClone`,
  `crypto.randomUUID`) e a política de `tooling.md` §0.

### 9.5 Preload

- Rota e dado: configuração do router (§1.4).
- Navegação que não é `<Link>` (clique na linha, card) antecipa o dado com
  `queryClient.query({ ...postQueryOptions(id), staleTime: 'static' })` em `onPointerEnter` e
  `onFocus`. _doc-lib/tanstack-query.md#guides/prefetching.
- `<link rel="preload">` por `head().links` só para a imagem de LCP e a fonte principal (fonte com
  `crossorigin` e `type="font/woff2"`); nunca `modulepreload` à mão.
- `preconnect` para a origem da API e do storage de mídia no `head()` de `__root.tsx`, montado do
  `env.ts`.

### 9.6 Imagens, fontes e assets

- Toda `<img>` tem `width`/`height` (ou `aspect-*`) e `alt` (§10.4). A posição decide o
  carregamento por lookup, na peça `picture/` do kit:

```tsx
const IMAGE_LOADING = {
  lcp: { loading: 'eager', fetchPriority: 'high' },
  fold: { loading: 'lazy', fetchPriority: 'auto' },
} as const

<img src={post.coverUrl} alt={post.title} width={1200} height={630} decoding="async" {...IMAGE_LOADING[placement]} />
```

- Imagem de LCP nunca é `lazy`; abaixo da dobra, sempre. AVIF/WebP com `srcset`/`sizes`.
- Fonte auto-hospedada (woff2, subconjunto latino), importada para ganhar hash; nunca CSS de fonte
  de terceiro no caminho crítico. `font-display: swap` com métrica de fallback ajustada
  (`size-adjust`, `ascent-override`) no `@theme`.
- `public/` só para nome estável (`favicon.ico`, `manifest.json`, ícones do manifest); todo o resto
  se importa de `src/assets/`. _doc-lib/vitejs.md#assets.

### 9.7 Head, SEO e idiomas

Toda rota pública monta o `head` por `pageHead()` de `lib/page-head.ts`, pelo mecanismo oficial
de `head()`/`loaderData` (_doc-lib/tanstack-router.md#guide/document-head-management;
_doc-lib/tanstack-start.md#guide/seo). O formato é da casa (`DECISIONS.md` #47):

- título com o sufixo do site e descrição, por `m.*()`; título e descrição únicos por página;
- **canonical** absoluto: a URL do idioma atual sem query string, exceto o parâmetro de página;
  filtro e ordenação nunca geram canonical próprio;
- **hreflang** recíproco para `pt-BR`, `es` e `en`, mais `x-default` (a URL de `pt-BR`), pelo
  `localizeUrl(canonical, { locale }).href` do Paraglide: a função recebe URL absoluta (string ou
  `URL`) e devolve sempre `URL` absoluta, por isso o `.href` (_doc-lib/paraglide.md#/runtime;
  `i18n.md` §2);
- **Open Graph**: `og:title`, `og:description`, `og:image`, `og:url`, `og:locale`;
- **JSON-LD** por `head().scripts` com `type: 'application/ld+json'`, com `<` escapado
  (`JSON.stringify(data).replaceAll('<', '\\u003c')`): `Organization` na raiz, `BreadcrumbList`
  em detalhe, e o tipo do domínio (`Product`, `Course`, `Event`, `NewsArticle`) a partir do
  `loaderData` (formato de `scripts`: página oficial não conferida);
- `robots: noindex, nofollow` em `_private/`, `_authentication/` e no 404; ambiente que não é
  produção responde `noindex` global.

Mais:

- `<html lang>` no `shellComponent` de `__root.tsx`: regra em `i18n.md` §2.
  _doc-lib/tanstack-router.md#guide/internationalization-i18n.
- Recurso inexistente responde 404 de verdade (§5); slug público é estável, e trocar slug exige
  redirect 301 no backend.
- **`sitemap.xml` e `robots.txt` são rotas de servidor** (`src/routes/sitemap[.]xml.ts`,
  `robots[.]txt.ts`), não arquivos de `public/`: a URL absoluta e o `Disallow: /` de staging
  dependem do ambiente. Sitemap só com URL canônica e indexável, `lastmod` do `updatedAt`, uma
  entrada por idioma com `xhtml:link` de `hreflang`, `Cache-Control: public, max-age=3600`, cada
  fonte num `try` próprio; acima de 50 mil URLs, sitemap index. A lógica pura mora em
  `lib/sitemap.ts`, com teste. _doc-lib/tanstack-start.md#guide/server-routes.

### 9.8 Core Web Vitals e entrega

- Metas no p75 de campo, mobile *(opinião da casa)*: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1,
  TTFB ≤ 0,8 s. Medida de campo por `web-vitals` é opcional (sem `_doc-lib`).
- **CLS**: espaço reservado sempre (imagem, embed, fallback de `Suspense`, `pendingComponent`);
  conteúdo novo nunca empurra o de cima (toast em camada).
- **INP**: filtro digitado vai para a URL com debounce; atualização pesada em transição (§9.1);
  laço longo cede a vez (`scheduler.yield()` com recuo para `setTimeout`).
- **Cache**: asset com hash `public, max-age=31536000, immutable`; HTML `no-cache`; resposta que é
  igual para todo visitante pode ter `public, s-maxage=<n>, stale-while-revalidate=<n>`; HTML ou
  API que varia por cookie é `private, no-store`, sempre. Por `headers()` da rota ou `routeRules`
  do Nitro. _doc-lib/tanstack-start.md#guide/isr, #guide/production-checklist; _doc-lib/nitro.md#config.
- Compressão numa camada só, no proxy, excluindo `text/event-stream`; sem plugin de compressão no
  build.
- Sourcemap de produção nunca publicado: `build.sourcemap: 'hidden'` quando a observabilidade
  precisa, enviado ao coletor e fora de `.output/public`. _doc-lib/vitejs.md#build.
- Early Hints (103) fica por último, e só depois de `curl` provar que o 103 atravessa o proxy.
  _doc-lib/tanstack-start.md#guide/early-hints.

### 9.9 Virtualização

Paginação de servidor é o padrão. Virtualizar só lista longa onde a paginação não serve (planilha,
combobox com milhares de opções, log), com `@tanstack/react-virtual`, nunca `react-window`. O
índice virtual indexa `table.getRowModel().rows`; lista virtualizada mantém rolagem por teclado e
`aria-rowcount`/`aria-rowindex`. Lista estática longa da vitrine tenta `content-visibility: auto`
com `contain-intrinsic-size` antes. _doc-lib/tanstack-table.md#framework/react/guide/virtualization.

### 9.10 Orçamento de bundle e ciclo de chunk

- **Ciclo de chunk**: `node scripts/check-chunk-cycles.mjs` roda depois do build (lê `.output/`)
  e é passo do portão do frontend (`tooling.md` §7). Ciclo entre chunks derruba o SSR em runtime
  com o build verde; a causa típica é import de `Route` fora do arquivo da rota (§1.3).
- **Orçamento** *(opinião da casa)*: JS inicial de rota pública ≤ 170 KB gzip; nenhum chunk acima
  de 200 KB gzip. Diagnóstico por `vite-bundle-visualizer` sob demanda, sem virar dependência.
- Projeto com vitrine pode rodar Lighthouse CI no PR contra duas ou três URLs públicas (mobile,
  mediana de 3), em workflow próprio (`tooling.md` §7).

---

## 10. UX e acessibilidade

Meta: WCAG 2.1 AA *(página oficial não conferida; sem `_doc-lib` de WCAG)*. Teclado, foco e
`role` de diálogo, menu, abas e popover são do Base UI; o nome acessível é sempre do projeto
(_doc-lib/base-ui.md#react/overview/accessibility). Identidade visual fica fora daqui
(`docs/DESIGN.md`).

### 10.1 Estados de tela

- Toda tela que lê dado tem **quatro estados**: carregando, vazio, erro, preenchido. Carregando é
  esqueleto com a forma do conteúdo; spinner só no botão que enviou.
- **Vazio distingue o motivo**, pela peça `components/common/empty-state/` (compound sobre
  `ui/empty`, _doc-lib/shadcn.md#empty): primeiro uso (o que vai aparecer + ação de criar), busca
  ou filtro sem resultado ("limpar filtros"), sem permissão (por quê + como obter). Nunca "Nenhum
  item" solto.

```tsx
<EmptyState>
  <EmptyStateTitle>{m.posts_empty_title()}</EmptyStateTitle>
  <EmptyStateDescription>{m.posts_empty_description()}</EmptyStateDescription>
  <EmptyStateAction render={<Link to="/posts/new" />}>{m.posts_create()}</EmptyStateAction>
</EmptyState>
```

- **Erro** oferece a recuperação (tentar de novo, voltar, entrar de novo), pelo mapa de §5.
- **Feedback de ação**: toda mutation confirma o resultado (toast curto, sem exclamação) e o botão
  que disparou fica `disabled` com indicador enquanto voa; nunca duplo envio.
- Mudança assíncrona é anunciada: toast, validação e status em `role="status"`
  (`aria-live="polite"`); erro urgente em `role="alert"`.

### 10.2 Controles, nome e teclado

- Todo controle tem os estados default, hover, `focus-visible`, active, disabled, loading e erro;
  hover sem foco equivalente é defeito.
- **Nativo antes de ARIA**: `<button>` para ação, `<Link>` para navegação; nunca `<div onClick>`,
  nunca `<a><button>`.
- **Nome acessível**: botão só de ícone leva `aria-label` por `m.*()`; ícone decorativo
  `aria-hidden`; o nome contém o texto visível.
- **Ícone (Phosphor, `tooling.md` §0.1)**: o componente não põe `aria-hidden` nem `role`, então o
  padrão sai de um `IconContext.Provider` na raiz (`__root.tsx`) com `'aria-hidden': true`, o
  `size` e o `weight` da casa. O `value` substitui o padrão inteiro em vez de mesclar: sem `size`,
  o `<svg>` sai sem `width`/`height`. O raro ícone que carrega sentido sozinho recebe
  `aria-hidden={false}`, `role="img"` e `alt` por `m.*()`. Import pelo nome canônico `<Nome>Icon`
  (`TrashIcon`); o nome sem sufixo é `@deprecated`. `@phosphor-icons/react/ssr` não lê o
  `IconContext` e perde o `aria-hidden` comum: não se usa (TanStack Start não é RSC)
  (_doc-lib/phosphor.md, "O que muda a experiência", e _doc-lib/phosphor.md#react#props).
- **Foco visível** em todo interativo (`focus-visible:ring-*`, contraste ≥ 3:1); nunca
  `outline-none` sem substituto; ordem de foco igual à visual; sem armadilha de teclado; o foco
  volta ao gatilho quando a sobreposição fecha.
- Elemento clicável que não é `<button>`, quando inevitável, recebe `onActivateKey`
  (Enter/Espaço) junto do `onClick`, e a área sem rótulo próprio entra na allowlist de
  `label-has-associated-control` (`jsx-a11y`, `tooling.md` §4.2) em vez de ganhar `<label>` cosmético
  (`DECISIONS.md` #48).
- Alvo de toque ≥ 44×44 px, por área invisível se preciso *(opinião da casa: AA não exige)*; hover
  nunca é o único caminho para uma função; gesto (arrastar, deslizar) tem alternativa de um
  ponteiro.
- Sessão que expira avisa e permite estender.

### 10.3 Formulário acessível

- Rótulo visível sempre, acima do campo; placeholder é exemplo, nunca rótulo.
- Erro abaixo do campo, ligado por `aria-describedby`, com `aria-invalid`; nunca só a cor. O par
  central `invalidProps(invalid, id)` + `errorId(id)` mora em `lib/form-a11y.ts`, e o `id` usa o
  `idPrefix` da casca (§4). _doc-lib/react-hook-form.md#advanced-usage#AccessibilityA11y.

```tsx
<Field data-invalid={fieldState.invalid}>
  <FieldLabel htmlFor={id}>{m.users_form_email()}</FieldLabel>
  <Input {...field} id={id} type="email" autoComplete="email" {...invalidProps(fieldState.invalid, id)} />
  <FieldError id={errorId(id)} errors={[fieldState.error]} />
</Field>
```

- No envio com erro, o foco vai ao primeiro campo inválido (`shouldFocusError`, §4).
- Atributos de entrada certos: `type` (`email`, `tel`, `url`), `inputMode`, `autoComplete`, `name`;
  `spellCheck={false}` em e-mail e código; nunca bloquear colar; input com fonte ≥ 16 px.
- Obrigatório e opcional marcados do mesmo jeito no produto inteiro; formato exigido aparece antes
  do envio (texto de ajuda), não só no erro. O digitado sobrevive ao erro.
- `Select` do Base UI sempre com `items`, para o rótulo (e não o valor cru) aparecer selecionado.
  _doc-lib/base-ui.md#react/components/select.

### 10.4 Estrutura, conteúdo e responsividade

- `<html lang>` do idioma atual (§9.7); um `<h1>` por tela, hierarquia sem pular nível; landmarks
  (`header`, `nav`, `main`, `footer`); skip link para `#main`; título por rota (`head()`); link
  ativo com `aria-current="page"`.
- Imagem com sentido tem `alt` que diz a informação (por `m.*()` ou do dado); decorativa `alt=""`.
- Contraste AA nos dois temas e em todo estado: texto 4,5:1 (inclui placeholder e ajuda), texto
  grande e componente 3:1. Cor nunca é o único sinal (erro = cor + ícone + texto).
- Celular primeiro: base sem prefixo, camadas `md:`/`lg:`, breakpoint em `--breakpoint-*`. Sem
  rolagem horizontal a 320 px, uso a 200% de zoom, nunca `user-scalable=no`/`maximum-scale=1`.
  _doc-lib/tailwindcss.md#responsive-design.
- Altura cheia com `min-h-dvh`, nunca `h-screen`; filho de flex com `min-w-0`; texto longo com
  `truncate`/`line-clamp`/`break-words`; contêiner de texto sem largura fixa (es e en são mais
  longos que pt-BR). Celular adapta, não amputa: tabela vira lista de cartões ou rola dentro do
  próprio contêiner.
- Prosa em 65 a 75 caracteres de largura; `tabular-nums` em coluna numérica; corpo ≥ 1 rem.

### 10.5 Movimento

- Movimento explica estado, relação ou feedback; tela de operação não tem coreografia de
  carregamento.
- Duração e curva são token (`--ease-*`, `--animate-*`): feedback 100 a 150 ms, estado 150 a
  300 ms, overlay 300 a 500 ms; saída mais curta que a entrada.
- Animar só `transform` e `opacity`; nunca `transition: all`; `will-change` só durante a animação.
- **`prefers-reduced-motion` tem caminho por componente**: `motion-safe:`/`motion-reduce:` tiram
  deslocamento, parallax, loop e rolagem animada e mantêm a opacidade e a cor que carregam estado.
  O "kill global" (`* { animation-duration: 0.01ms !important }`) é proibido: apaga o feedback.
  _doc-lib/tailwindcss.md#hover-focus-and-other-states.

```tsx
<PopoverPopup className="transition-[transform,opacity] motion-reduce:transition-opacity data-starting-style:opacity-0 motion-safe:data-starting-style:scale-95" />
```

- Nada pisca mais de três vezes por segundo; loop não essencial para fora da tela e pode ser
  pausado. Transição de navegação, se houver, só pela opção do router (página oficial não
  conferida).

### 10.6 Ação destrutiva

- Nunca imediata: **desfazer** (toast com ação) quando a recuperação é segura; **confirmação**
  (`ConfirmDialog`) quando é irreversível, cara ou em lote. AlertDialog não fecha por clique fora,
  fecha por Esc.
- A confirmação nomeia ação, objeto e consequência ("Remover a equipe Design?", nunca "Tem
  certeza?"); botões com verbo + objeto ("Excluir 5 posts" / "Manter"), nunca "Sim/Não/OK". O
  botão destrutivo usa a variante `destructive`; "Cancelar" nunca é `destructive`.

### 10.7 Texto de interface

Todo texto é chave de mensagem (`i18n.md`); a regra aqui é o conteúdo da chave:

- Botão diz verbo + objeto ("Salvar alterações"), nunca "OK", "Enviar", "Clique aqui"; o toast
  repete o verbo ("Publicar" → "Publicado"). Um termo por conceito no produto inteiro.
- Erro diz o que falhou, por quê (se útil) e como resolver; sem culpar, sem humor, sem código
  interno como mensagem principal.
- Carregando diz a operação ("Salvando…", reticência tipográfica).
- Caixa de frase em título e botão, nunca Title Case.
- Frase inteira por chave, com variável estruturada; nunca concatenar pedaços.
- Sem travessão em texto visível: reescrever com vírgula, dois-pontos, ponto ou parênteses.

### 10.8 Anti-padrões universais

Valem para qualquer identidade; o `docs/DESIGN.md` do projeto aponta para cá e acrescenta os dele.

- Card dentro de card, caixa dentro de caixa, card como contêiner padrão.
- Grade de cards iguais (ícone + título + texto) como estrutura da página; "métrica herói".
- Rótulo decorativo acima de título, numeração de seção "01/02/03", micro-UI falsa (pílula de
  status, "v0.6").
- Texto em gradiente, glass decorativo, neon, borda lateral colorida grossa em card ou alerta.
- Emoji ou caractere no lugar de ícone; famílias e espessuras de ícone misturadas.
- Conteúdo falso: lorem ipsum, "John Doe", "Acme", número redondo inventado, verbo-clichê.
- Toda ação como botão primário; mais de uma ação primária por área.
- Texto cinza sobre fundo colorido; seção de tema invertido no meio da página.
- `window.alert()`/`confirm()`; link para `#`; tela sem caminho de volta; 404 genérico do
  framework.
- Cursor personalizado, rolagem sequestrada, dica "role para baixo".
- Superfície do navegador sem tema (seleção, scrollbar, caret, anel de foco).

### 10.9 Gráfico (Recharts pelo `chart` do shadcn)

- **Tipo**: todo gráfico tem o genérico do dado (`<Bar<MonthlyRevenue, number>>`) ou nasce de um
  helper tipado (`createHorizontalChart<T, X, Y>()`); sem isso `data` e `dataKey` caem em `any` e o
  `dataKey` errado passa no typecheck (_doc-lib/recharts.md#en-US/guide/typescript).
- **Cor** só por `var(--color-<chave>)`, a variável que o `ChartConfig` do `ChartContainer` gera a
  partir de `--chart-N`; nunca hex. `Bar` e `Scatter` sem `fill` saem pretos
  (_doc-lib/recharts.md, "O que muda a experiência"; _doc-lib/shadcn.md#chart).
- **Animação** fica em `isAnimationActive` `'auto'` (o padrão), que respeita
  `prefers-reduced-motion`; `isAnimationActive={true}` ignora a preferência do sistema e é proibido
  (_doc-lib/recharts.md#en-US/guide/animations; §10.5).
- **Carga**: gráfico fora do primeiro quadro entra por `lazy` + `<Suspense>` (§9.4).
- **Acessibilidade**: `accessibilityLayer` já é `true` na v3 e não se desliga (teclado e leitor de
  tela no tooltip); a raiz recebe `title` e `desc` com texto de `m.*()`
  (https://recharts.github.io/en-US/api/BarChart/). *(Opinião da casa, sem `_doc-lib` de WCAG)*:
  cor nunca é o único sinal entre séries (rótulo, legenda ou padrão junto, §10.4); o valor exato não
  depende só do hover do tooltip; gráfico que carrega informação essencial (não só tendência) tem a
  mesma informação numa tabela de dados, visível ou atrás de um "Ver como tabela".

### 10.10 Arrastar e reordenar (dnd kit)

- `sensors` e `plugins` do `DragDropProvider` sempre na forma de função
  (`(defaults) => [...defaults, X]`): o array substitui o padrão e some com o `KeyboardSensor` e o
  plugin `Accessibility` (_doc-lib/dnd-kit.md#react/components/drag-drop-provider,
  #react/guides/sensors).
- Os anúncios e as instruções de leitor de tela do `Accessibility` saem do i18n
  (`Accessibility.configure({ announcements, screenReaderInstructions })` com `m.*()`); o padrão é
  em inglês (_doc-lib/dnd-kit.md, "O que muda a experiência").
- Teclado não é a alternativa de um ponteiro (§10.2): a lista reordenável tem também a ação
  "mover" por clique (menu "Mover para cima/baixo" ou botões).

---

## 11. Teste de UI

A matriz por camada está em `architecture.md` §8; aqui fica o como do frontend. Sufixo separa o
runner (`DECISIONS.md` #113, C17): `<x>.test.ts(x)` é Vitest, ao lado do arquivo; `e2e/<fluxo>.spec.ts`
é Playwright. As regras de Playwright abaixo seguem `_doc-lib/playwright.md`; onde a casa escolhe
dentro do que a doc permite, a linha diz *(opinião da casa)*.

### 11.1 Vitest + Testing Library

- Hook e componente de `common/`, `-components/` com lógica, e todo `lib/<tema>.ts` não trivial têm
  teste. Ambiente `jsdom` declarado por arquivo. _doc-lib/vitest.md#config/environment.
- Componente se testa pelo que o usuário vê: `getByRole('button', { name })` e `userEvent`, nunca
  por classe nem por `data-testid` quando há papel. O nome vem da mesma chave (`m.*()`), nunca de
  string redigitada.
- Teste com Query: `QueryClient` novo por teste, com `retry: false`.
  _doc-lib/tanstack-query.md#guides/testing.
- Dado parcial por `fromPartial()` (`@total-typescript/shoehorn`), nunca `as` nem `fromAny()`.
- Lista e tabela têm um caso para cada um dos quatro estados (§10.1).
- **Hook que centraliza fiação repetida** (invalidar, avisar, navegar) tem teste próprio: o
  typecheck não vê a ligação removida.
- **Schema local** (o que `shared/` não cobre, em `lib/`) nasce com teste dos limites no mesmo
  commit: o tipo não vê um teto trocado.
- Tempo por `vi.useFakeTimers()` com `vi.useRealTimers()` no `afterEach`.
  _doc-lib/vitest.md#mocking/timers.

### 11.2 Playwright

- **Seletor**: `getByRole(papel, { name })` → `getByLabel` → `getByText` → `getByTestId` só onde
  não há papel e nome estáveis (célula, canvas, item sem texto). CSS de classe/id e XPath nunca.
  O nome vem da mensagem compilada do idioma base:

```ts
import { m } from '../src/paraglide/messages'

await page.getByRole('button', { name: m.common_save() }).click()
await expect(page.getByRole('alert')).toHaveText(m.posts_archived_conflict())
```

- **`data-testid`** (default do Playwright, sem configuração; nunca `data-test-id`) só existe
  onde um E2E lê (`DECISIONS.md` #113, C22).
- Sem espera fixa: nunca `waitForTimeout`, `sleep` nem `networkidle`. Espera é asserção web-first
  (`await expect(locator).toHaveText(x)`, nunca `expect(await locator.textContent())`),
  `waitForResponse` para fato de rede, `page.clock` para tempo.
- Ator e helpers por fixture (`test.extend`) em `e2e/support/test.ts`; helpers por domínio em
  `e2e/support/<tema>.ts`; nada de Page Object com `new`, nada de função solta no spec. Sessão por
  `storageState` gravado num projeto `setup`.
- Isolamento: cada teste cria o próprio dado (prefixo + id único), pela API quando a tela não é o
  alvo, e limpa em `finally`; nenhum teste depende de ordem.
- **`page.route`** alcança só o que o **navegador** pede: o fetch do SSR, feito no Nitro, não passa
  por ele (_doc-lib/playwright.md#docs/network). A doc o recomenda para API de terceiro que o
  projeto não controla (gateway, CEP, mapa), com `route.fulfill`
  (_doc-lib/playwright.md#docs/best-practices, #docs/mock): esse é o uso livre. Contra o backend do
  próprio projeto *(opinião da casa)*, só para o que ele não produz sob demanda (5xx, latência para
  ver o esqueleto, offline); sucesso simulado do próprio backend é proibido, porque o E2E existe para
  pegar a costura com ele. Rota não precisa de `unrouteAll`: cada teste recebe contexto novo, e o
  `route` morre com ele.
- Todo spec termina sem erro de console inesperado (fixture `errors`); fluxo crítico roda
  `@axe-core/playwright` (falha em violação séria ou crítica) e tem um caso com
  `reducedMotion: 'reduce'` e viewport de 320 px.
- Formulário crítico em quatro tempos: vazio, inválido, 409/422 no campo, válido (com F5 e duplo
  clique gerando uma requisição só, e 5xx com "Tentar de novo").
- Configuração do runner (`forbidOnly`, `retries: 0`, trace na falha, credencial por env) e o passo
  de CI: `tooling.md` §7.

---

## Decisões de forma

- **Query key factory: arquivo central com seção por módulo** (§2.1; `DECISIONS.md` #78, substitui
  a #9); `queryOptions` e mutations por módulo (#113, C3).
- **`components/ui/` editável com `// casa:`** (§6; #113, C10).
- **Par `index`/`index.lazy` como convenção de forma**, não como mecanismo de chunk (§1.3).
- **`verbatimModuleSyntax` ligado**: ver `typescript.md` §9 e `tooling.md` §3.
- **Semicolon/prettier**: `tooling.md` §5, a mesma régua no frontend e no backend.
