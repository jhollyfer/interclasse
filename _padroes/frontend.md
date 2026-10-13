# Padrão de frontend

Base comum para todo frontend React 19 + TanStack Start/Router/Query/Table +
React Hook Form + VineJS + shadcn (Base UI) + Tailwind v4. Entidades de
exemplo são sempre `User`, `Team`, `Post` — nunca um domínio real.

Fonte de autoridade igual à do backend: `_doc-lib/<lib>.md` > tipo instalado >
este documento > código existente. Quando nem o snapshot nem o tipo cobrem o
ponto, declare "não coberto" e decida pelo critério daqui.

---

## 1. Árvore de `src/`

```
src/
├── router.tsx                # createRouter() com routeTree + queryClient no context
├── routeTree.gen.ts          # gerado, nunca editado
├── routes/                   # file-based routing
│   ├── __root.tsx
│   ├── health-check.ts       # GET /health-check, rota de servidor (arquitetura.md §7)
│   ├── _authentication/      # layout público (pathless, prefixo `_`)
│   └── _private/
│       ├── layout.tsx        # guard + shell (sidebar/header)
│       └── <area>/
│           ├── index.tsx         # createFileRoute: beforeLoad/loader/validateSearch
│           ├── index.lazy.tsx    # createLazyFileRoute: só `component`
│           └── -components/      # a tela e suas peças (pasta ignorada pelo router)
├── components/
│   ├── ui/                   # design system (shadcn/Base UI), não se edita à mão
│   └── common/                # kit de negócio, um subdiretório por peça reutilizável
├── hooks/                     # use-kebab-case.ts; tanstack-query/ guarda _query-keys.ts (§2.1)
├── validators/
│   └── <módulo>/<recurso>.validator.ts   # espelho de app/features/<módulo>/<recurso>/<recurso>.validator.ts
├── lib/                        # constant.ts, interfaces.ts, validator.ts (vine configurado + regras + mensagens), utils.ts, entity.ts, labels.ts (§8)
└── integrations/
    ├── tanstack-query/        # http.ts, http.server.ts, queries.ts, mutations.ts
    └── react-hook-form/       # AppField (Controller) + binding de campo
```

**Regra**: rota é só rota. `index.tsx` carrega dado e decide o guard;
`index.lazy.tsx` é o stub de componente; a tela de verdade desce para
`-components/`, que lê a rota por `getRouteApi()` em vez de prop drilling.
**Por quê**: sem a separação, `index.tsx` cresce até acumular lógica de UI que
não participa do code-splitting por rota — o próprio motivo de existir
`index.lazy.tsx`. _doc-lib/tanstack-router.md#routing/route-trees.

`-components/` é ignorado pelo gerador de rotas (prefixo `-`); arquivo posto
direto em `routes/<area>/` sem esse prefixo vira rota fantasma.
_doc-lib/tanstack-router.md#routing/routing-concepts.

**O que sobe para `components/common/` é decidido por rota alcançada, não por arquivo que
importa** *(opinião da casa)*: o critério "usado em mais de um lugar" conta arquivo e sobe
peça cedo demais; contar quantas **rotas** diferentes a peça serve é mais objetivo — duas
telas da mesma rota que importam o mesmo arquivo não é reuso de verdade.

`layout.tsx` de `_private/` é o único portão: ele roda `beforeLoad` (guard +
`queryClient.query()` da sessão — `ensureQueryData` está deprecated desde o TanStack Query
5.102, `_doc-lib/tanstack-query.md`) uma vez, e toda rota nova nascida ali dentro
herda a proteção por estar no lugar — não por lembrar de repetir o guard.
Breadcrumb/título de tela sai do segmento de path casado contra um lookup
object (`{ <segmento>: <rótulo> }`), nunca de um `if/else-if` por rota — regra
6 de `_padroes/typescript.md`, aplicada à navegação.

---

## 2. Onde cada dado mora

| Origem | Mora em | Nunca em |
|---|---|---|
| Veio do servidor (lista, detalhe, sessão) | TanStack Query (cache) | `useState` + `useEffect` manual |
| Filtro/paginação de tela | Search params da URL (`validateSearch`) | `useState` local |
| Estado de formulário | React Hook Form | `useState` por campo |
| Estado efêmero de UI (aberto/fechado, aba ativa) | `useState` local | Query cache, store global |
| Estado cliente que cruza telas (ambiente ativo, tema) | Cookie/`localStorage` + `useSyncExternalStore`, ou TanStack Store só se isso não bastar | Mirror manual de um endpoint |

**Por quê**: um `useAuthStore` espelhando `GET /profile` foi a origem de dois
bugs reais — identidade de um visitante vazando pro render de outro em SSR, e
perfil cacheado sobrevivendo ao logout. O cache do Query já é a fonte única;
duplicá-lo num store cria duas verdades que um `invalidate` só acerta uma.
_doc-lib/tanstack-query.md#guides/queries.

Filtro de tela na URL (não em `useState`) é o que faz back/forward do
navegador e link copiado reproduzirem a mesma tela — `useState` perde os dois.
_doc-lib/tanstack-router.md#guide/search-params (ver índice de slugs do
arquivo para o nome exato da seção de search params instalada).

**"Reset de estado no render" não é mirror de estado** *(opinião da casa)*: um rascunho local
(`useState`) que se resincroniza comparando uma chave "vista" contra a atual, **no corpo do
componente** (nunca em `useEffect`), é a técnica oficial do React para "resetar estado quando
o input muda" sem efeito — usada em filtro com rascunho antes de aplicar. Documentado aqui para
não ser confundido com o anti-padrão da tabela acima e reescrito para `useEffect` por engano.

### 2.1 Query key factory

**Uma** fábrica central, `hooks/tanstack-query/_query-keys.ts`, com uma seção por módulo
(`queryKeys.<módulo>.<recurso>`), nunca array literal (`['users', id]`) escrito em dois
arquivos *(opinião da casa — a doc mostra a fábrica, não o lugar)*. Arquivo central porque
invalidação cruza módulos (mutation de um recurso invalida a lista de outro) e um import só
acha qualquer chave; a seção por módulo é o limite de crescimento. **Por quê** da fábrica: a chave duplicada é como
`beforeLoad` e componente acabam buscando o mesmo dado com chaves que não
batem byte a byte, e a tela nunca lê do cache que o guard já encheu — dois
requests onde devia haver um. `queryKeys.<recurso>.all` como prefixo comum é
o que permite invalidar a família inteira (lista + infinite + detail) de uma
vez. _doc-lib/tanstack-query.md#guides/query-keys.

Toda leitura usa `queryOptions()` (nunca `queryKey`/`queryFn` soltos no
componente) — é o que garante que `loader`, `beforeLoad` e
`useSuspenseQuery` apontam pro mesmo cache.
_doc-lib/tanstack-query.md#guides/query-options.

O mesmo princípio de fábrica tipada vale para `validateSearch` de rota de listagem
*(opinião da casa)*: `withExtra([...] as const)` sobre as chaves de search param evita o
mesmo problema de array literal duplicado, agora do lado da URL em vez da query key.

**Retry só para erro de servidor/rede.** `defaultOptions.queries.retry` do `QueryClient` é uma
função nomeada e testada (`shouldRetryQuery`) que repete 5xx/rede e devolve `false` para todo 4xx
— repetir 401/403/404/422 só atrasa a tela de erro. _doc-lib/tanstack-query.md#guides/query-retries.

**Combobox com busca no servidor** usa um hook por entidade, `use<Entidade>ReadPaginatedInfinite`
(`useInfiniteQuery` + `placeholderData: keepPreviousData`), nunca `useInfiniteQuery` solto no
componente do combobox *(opinião da casa; mecanismo em _doc-lib/tanstack-query.md#guides/infinite-queries)*.

**Job assíncrono por WebSocket** (progresso de importação, migração) é um hook genérico
`useJobSocket<TProgress, TCompleted, TError>` que conecta, entra na sala, ouve
`progress`/`completed`/`error` e limpa ao desmontar; cada job só declara namespace e tipos num
hook fino (`use<Job>Socket`). Namespace e sala vêm dos mesmos nomes do backend (`backend.md` §3,
linha "socket") *(opinião da casa)*.

---

## 3. Sessão e ambiente sem store

Sessão é dado do servidor; mora no cache do Query, lido pela **mesma query
options** que o `beforeLoad` usa para encher o cache — não por um hook que
repete a chamada com uma chave parecida. Ambiente/tenant ativo (quando a app
tem mais de um) é só uma string, e essa string vive em **cookie**, nunca
`localStorage`: é o único canal que o navegador manda junto do documento no
SSR. Sem cookie, o `request()` do lado servidor não sabe qual ambiente usar
no primeiro render e o loader busca no ambiente errado.
_doc-lib/tanstack-start.md#guide/server-functions.

Variável de ambiente do build (chave pública, URL de API) é lida uma vez em
`env.ts`, checada à mão e de forma síncrona — não um schema que resolve
promessa, porque o módulo roda antes do router montar.
_doc-lib/vitejs.md (ver slugs de `env-and-mode` no índice do arquivo).

Código que diverge entre cliente e servidor (base de URL, leitura de cookie, dedup de
refresh de sessão) usa `createIsomorphicFn()` — um branch nomeado por ambiente, nunca
`typeof window !== 'undefined'` solto no meio da função.
_doc-lib/tanstack-start.md#guide/environment-functions.

Timeout de requisição soma o abort próprio do React Query com um teto de tempo via
`AbortSignal.any([signal, timeout])` *(opinião da casa — API nativa do runtime, fora do
escopo de qualquer `_doc-lib`)*: sem o teto, uma API que nunca responde deixa a tela parada
(client) ou o SSR preso (server) — o `signal` da query sozinho só aborta quando o próprio
componente desmonta.

`beforeLoad` da própria rota, não um middleware central, é onde um guard de capacidade
específica de área (`requireAreaCapability`) deve morar *(opinião da casa)*: a área que
exige a capacidade é a mesma que declara o guard, sem acoplar todas as capacidades da app
num único lugar. Isto não contradiz "`layout.tsx` é o único portão" da seção 1 — o layout
cobre a sessão (autenticado/não), o guard de área cobre uma permissão daquela área
especificamente.

**Guard de rota × hook de capacidade** *(opinião da casa)*: o que decide **se a rota carrega**
fica no `beforeLoad` (acima). O que decide **o que renderizar dentro** de uma rota já carregada
(esconder botão, desabilitar célula) é hook de permissão lido no componente
(`use<Recurso>Permission`) — nunca `if` de papel espalhado pela tela, nunca o guard repetido.

**`?redirect=` só aceita caminho interno.** `validateRedirectSearch` recusa o que não começa com
`/` e tudo que começa com `//` ou `/\` (open redirect), caindo na home. Mora em
`lib/redirect-search.ts`, fora de `routes/`, para ser testado sem a árvore gerada *(opinião da
casa — mitigação padrão de open redirect; o mecanismo de `redirect` está em
_doc-lib/tanstack-router.md#guide/authenticated-routes)*.

**Data exibida tem fuso fixo.** Toda formatação sai de um `Intl.DateTimeFormat` com `timeZone`
explícito (o do negócio ou `'UTC'`), num helper de `lib/labels.ts` — nunca o fuso do navegador,
que faz o SSR e a hidratação renderizarem strings diferentes *(opinião da casa)*.

---

## 4. Formulários

```ts
const form = useForm({
  resolver: vineResolver(UserCreateValidator),
  mode: 'onTouched',
})
```

- `resolver: vineResolver(XValidator)`, nunca schema local redeclarado no
  componente. O validator vem de `src/validators/<módulo>/<recurso>.validator.ts`,
  que é o **par** de `app/features/<módulo>/<recurso>/<recurso>.validator.ts` do
  backend — mesmo caminho lógico, mesmo nome de export, mesmo campo, mesma regra
  (`arquitetura.md` §4). Regra compartilhada e mensagens vêm de `lib/validator.ts`,
  par de `app/core/validator.ts`; ninguém importa `@vinejs/vine` direto.
  **Por quê**: validação duplicada por conta própria diverge na primeira
  mudança de regra no backend, e o formulário aceita o que a API rejeita (ou
  o contrário) sem aviso. _doc-lib/vinejs.md#schema_101.
- Mensagem de erro de validação sai de um `messagesProvider` central em
  pt-BR, nunca string inline no `rules` do campo — um label por recurso, não
  um por formulário. _doc-lib/vinejs.md#custom_error_messages.
- Erro 422 da API volta para o campo certo por uma função central
  (`applyHTTPErrorToForm`), que lê `error.errors` (`Record<campo, mensagem>`)
  e chama `form.setError` — nunca um `try/catch` manual por tela.
  _doc-lib/react-hook-form.md#docs/useform/seterror.
- Máscara de campo (telefone, CPF, moeda) usa a lib de mask já instalada e
  lê o valor **sem máscara** via `.parse()` antes de submeter — nunca regex
  manual tirando caractere. **Por quê**: regex ad-hoc que "parece funcionar"
  quebra no primeiro formato regional diferente (DDD de 2 dígitos, CEP com
  hífen opcional); `.parse()` é a mesma lib que desenhou a máscara, então os
  dois nunca divergem. _doc-lib/use-mask-input.md#tutorial-basics/static-mask.
- Formulário **dinâmico** (campos montados em runtime a partir de uma lista
  de definições, ex.: `IField[]`) não usa `resolver`: usa `rules={{ validate: ... }}`
  por campo. React Hook Form ignora `rules` quando há `resolver` — os dois
  nunca convivem no mesmo form. _doc-lib/react-hook-form.md#get-started#Applyvalidation.

**Hook único de formulário de recurso** *(opinião da casa)*: um `useResourceForm` que recebe
`formId`, `validator`, `defaults`/`values`, `fields`, `mutation`, `invalidate`, `backTo`,
`success`, `retry` e `payload` cobre as ~25 linhas repetidas de `useForm` + `useMutation` +
toast + `navigate` que `form-create.tsx`/`form-edit.tsx` reescreviam por tela. É o padrão
recomendado para todo formulário de criação/edição de recurso, complementando os bullets
acima (que descrevem o resolver, não quem dispara a mutation).

**Split de arquivo por recurso** *(opinião da casa)*: `-components/form-fields.tsx` só com os
campos (sem envio), e `form-create.tsx`/`form-edit.tsx` como cascas que chamam `useResourceForm`
e renderizam o mesmo `form-fields.tsx`. Um modo só (só edita) tem só a casca dele.

**Upload em voo trava o submit** *(opinião da casa)*: campo que sobe o arquivo na escolha
registra uma chave num contexto compartilhado (`uploading-context.tsx`, `Set<string>`, não
contador) e a remove ao terminar/falhar; o botão de salvar fica desabilitado enquanto o `Set`
não estiver vazio.

**Reenvio ("tentar de novo") só quando o erro é retry-seguro** *(opinião da casa)*: o critério
fino é oferecer retry quando o use-case rejeitou por duplicata (**409**), não em qualquer
4xx/5xx — reenviar um 422 de validação ou um 403 de autorização não resolve nada e confunde
quem clica. Erro de rede/servidor sem esse tratamento (`toast.error(error.message)` cru, sem
ação) é o mesmo problema resolvido de outro jeito — ver `useResourceForm` acima.

Rota pública multilíngue declara `head` com canonical + hreflang + Open Graph pelo mecanismo
oficial de `head()`/`loaderData` (_doc-lib/tanstack-router.md#guide/document-head-management);
o formato exato de canonical/hreflang por rota é convenção da casa, não do framework
*(opinião da casa)* — centralizar num helper (`pageHead()`) evita repetir os três blocos de
meta tag em cada rota.

---

## 5. Error boundaries e carregamento

`QueryErrorResetBoundary` (TanStack Query) envolvendo o `Outlet`, com
`react-error-boundary`, é o que permite "tentar de novo" sem recarregar a
página inteira — um `try/catch` por componente não propaga pro cache do
Query, então o retry re-executa a query que falhou mas não limpa o estado de
erro que a boundary guardou. Rota declara `errorComponent` próprio só quando
o erro pede uma tela diferente da genérica (ex.: 404 de recurso vs erro de
rede). _doc-lib/tanstack-query.md#guides/important-defaults.

**Carregamento**: rota de listagem declara `pendingComponent` com o esqueleto de tabela comum
(`table-skeleton`, §8), nunca `<Loading />` genérico nem tela em branco *(opinião da casa)*.

---

## 6. Design system e estilo

- `components/ui/` é gerado pelo shadcn (Base UI) e não se edita module a
  module — mudança de variante/token vai no tema (`components.json`,
  `styles.css`), não no componente copiado. _doc-lib/shadcn.md#docs/theming.
- Cor semântica (`success`, `warning`, `destructive`, `muted`, `primary`),
  nunca paleta fixa fora de `components/ui/`. **Por quê**: cor fixa hard-coded
  sobrevive à troca de tema/dark-mode; a classe semântica resolve em runtime.
  _doc-lib/tailwindcss.md#dark-mode.
- Tailwind v4 via plugin do Vite, sem `tailwind.config.js` separado — tema em
  CSS (`@theme`) dentro de `styles.css`. _doc-lib/tailwindcss.md#installation/using-vite.
- `cn()` (`clsx` + `tailwind-merge`) para toda composição condicional de
  classe — concatenação de string (`` `base ${cond ? 'a' : 'b'}` ``) perde o
  merge de conflito (`p-2` + `p-4` vira os dois, não o último).
  *(opinião da casa — `tailwind-merge` não é biblioteca oficial do Tailwind,
  é convenção difundida no ecossistema shadcn; a doc oficial em
  _doc-lib/tailwindcss.md#styling-with-utility-classes não menciona nem
  contradiz o padrão.)*

### 6.1 Compound component, nunca componente de muitas props

Componente com mais de uma área de conteúdo é **compound**: uma raiz que guarda o estado em
contexto e partes que se compõem como filhos. Forma do shadcn, que já é o `components/ui/` da
casa: cada parte é um **named export** (`Card`, `CardHeader`, `CardTitle`, `CardContent`) e
toda parte leva `data-slot` (_doc-lib/shadcn.md#docs/components, #docs/tailwind-v4). O Base UI
compõe por partes da mesma forma (_doc-lib/base-ui.md#react/handbook/composition); a casa
segue a forma do shadcn, que embrulha o Base UI, para `ui/` e `common/` lerem igual.

```tsx
// errado: cada variação vira mais uma prop, e o componente decide o layout por if
<UserCard user={user} showAvatar showActions actionsPosition="bottom" title="Perfil" />

// certo: quem usa monta; cada parte é pequena e substituível
<UserCard user={user}>
  <UserCardHeader>
    <UserCardAvatar />
    <UserCardTitle>Perfil</UserCardTitle>
  </UserCardHeader>
  <UserCardActions />
</UserCard>
```

```tsx
// certo: components/common/user-card/user-card-context.ts
type UserCardContextValue = { user: IUser }

export const UserCardContext = createContext<UserCardContextValue | null>(null)

export function useUserCardContext(consumer: string): UserCardContextValue {
  const context = use(UserCardContext)
  if (!context) throw new Error(`<${consumer}> precisa estar dentro de <UserCard>`)
  return context
}

// certo: components/common/user-card/user-card-avatar.tsx
export function UserCardAvatar({ className, ...props }: ComponentProps<'img'>) {
  const { user } = useUserCardContext('UserCardAvatar')
  return <img data-slot="user-card-avatar" src={user.avatarUrl} alt={user.name} className={cn('size-8 rounded-full', className)} {...props} />
}

// certo: components/common/user-card/index.ts
export { UserCard } from './user-card'
export { UserCardAvatar } from './user-card-avatar'
export { UserCardHeader } from './user-card-header'
```

Regras:

- **Named export por parte**, prefixado pelo nome da raiz (`UserCardHeader`), reexportado pelo
  `index.ts` da pasta. Nunca objeto `{ Root, Header } as const` com acesso por ponto.
- **Pasta própria** em `components/common/<nome>/`: `<nome>.tsx` (raiz), `<nome>-context.ts`,
  um `<nome>-<parte>.tsx` por parte quando a parte é grande, `index.ts`. Parte de poucas linhas
  pode morar no arquivo da raiz.
- **Toda parte leva `data-slot="<nome>-<parte>"`.** Layout que muda conforme a parte existe lê
  `has-data-[slot=<nome>-<parte>]:` no pai — nunca prop booleana.
- **Estado compartilhado no contexto da raiz**; o hook recebe o nome de quem chama
  (`useUserCardContext('UserCardAvatar')`) e lança apontando a parte fora do lugar. Nada de prop
  drilling.
- Prop booleana de mostrar/esconder (`showX`, `hideY`) é sinal de compound faltando: a parte
  existe ou não existe no JSX.
- Elemento renderizado se troca pela prop `render` do Base UI, não por `asChild` nem por prop
  `as` (_doc-lib/base-ui.md#react/handbook/composition).
- Prop continua certa para **dado** (`user`, `value`, `onChange`) e para variante de estilo do
  próprio componente (`variant`, `size` via `cva`). O limite é estrutura: estrutura é JSX, não prop.

Skills: `compound-pattern`, `react-composition-patterns`.

**Nem toda estrutura de múltiplas partes ganha `Context`** *(opinião da casa)*: quando as
partes não compartilham estado (cada ação de um grupo de ações é independente, sem seleção
nem aberto/fechado em comum), compound sem `createContext` — só composição de JSX — já
resolve, e `Context` a mais é cerimônia sem leitor. Documentar essa escolha por escrito evita
que uma revisão futura "corrija" para contexto onde não há nada para compartilhar.

**Elemento clicável que não é `<button>` precisa do mesmo tratamento de teclado** *(opinião
da casa — a11y, sem `_doc-lib` que cubra o caso)*: `onActivateKey` (Enter/Espaço) junto do
`onClick`, e a área clicável sem rótulo próprio entra na allowlist de
`label-has-associated-control` em vez de ganhar um `<label>` cosmético.

---

## 7. Nomenclatura

| Tipo | Forma | Exemplo |
|---|---|---|
| Componente | PascalCase | `TeamTable` |
| Hook | `use-kebab-case.ts` | `use-team-permission.ts` |
| Rota config | `index.tsx` | `teams/index.tsx` |
| Rota stub | `index.lazy.tsx` | `teams/index.lazy.tsx` |
| Tela/peça de tela | `-components/<nome>.tsx` | `-components/team-table.tsx` |
| Campos / casca de formulário | `-components/form-fields.tsx`, `form-create.tsx`, `form-edit.tsx` | `teams/-components/form-fields.tsx` |
| Hook de combobox paginado | `use-<entidade>-read-paginated-infinite.ts` | `use-team-read-paginated-infinite.ts` |
| Parte de compound | `<nome>-<parte>.tsx`, export `<Nome><Parte>` | `user-card-avatar.tsx` → `UserCardAvatar` |
| Teste de `lib/` | `lib/<módulo>.test.ts`, ao lado | `lib/bulk.test.ts` |
| Utilitário | kebab-case | `handle-api-error.ts` |
| Tipo/Interface | `I<Nome>` ou `E_<NOME>` | `IUser`, `E_ROLE` |

Regras de código (sem ternário de controle, sem `any`, sem `as`, `type` nunca
`interface`, `Merge` no lugar de `&`, lookup object no lugar de 3+
`if/else-if`) são as mesmas de `_padroes/typescript.md` — este documento não
as repete.

---

## 8. Kit comum *(opinião da casa)*

Todo frontend da casa tem estas peças, com o mesmo nome e a mesma API. Projeto novo traz o kit,
não reescreve (`arquitetura.md` §1, princípio 9); peça nova do kit nasce compound (§6.1).

| Onde | Peça | Para quê |
|---|---|---|
| `components/common/confirm-dialog/` | confirmação de ação destrutiva | um diálogo só, texto por parte |
| `components/common/form-shell/` | casca de formulário: título, corpo, ações | submit desabilitado por upload em voo (§4) |
| `components/common/table/` | data table (TanStack Table): tabela, paginação, colunas visíveis, redimensionar, `table-skeleton` | toda listagem; o skeleton é o `pendingComponent` (§5) |
| `components/common/row-actions/` | menu de ações por linha | ação de linha igual em toda tabela |
| `components/common/image-field/`, `multi-file-upload/` | campo que sobe o arquivo na escolha | registra no `uploading-context` (§4) |
| `components/common/rich-editor/` | editor de texto rico | _doc-lib/tiptap.md |
| `components/common/uploading-context.tsx` | registro de upload em voo | §4 |
| `lib/bulk.ts` | ação em massa | abaixo |
| `lib/chunking.ts`, `upload-transport.ts`, `upload-resume.ts` | upload em partes, retomável | arquivo grande sem refazer do zero |
| `lib/redirect-search.ts` | `validateRedirectSearch` | §3 |
| `lib/entity.ts`, `lib/labels.ts` | vocabulário do domínio e rótulos | abaixo |

**Ação em massa sem endpoint dedicado**: `Promise.allSettled` sobre as chamadas unitárias,
devolvendo `{ done, failed }`, e `bulkMessage()` relata "N de M". Nunca `Promise.all`: a
primeira falha esconde o que já foi feito.

**`lib/entity.ts` + `lib/labels.ts`**: o enum do domínio nasce em `entity.ts` (sem import de
`vine`, para quem só lê o vocabulário não arrastar o validator) como trinca objeto/tipo/array
(forma do objeto: `typescript.md` §4). Rótulo pt-BR e variante visual moram em `labels.ts`,
com tipo largo (aceita valor desconhecido da API) e `satisfies` cobrando toda chave no código.
Nunca `if`/`switch` de rótulo na tela.

```ts
// certo: lib/entity.ts
export const POST_STATUS = { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED' } as const
export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS]
export const POST_STATUSES = Object.values(POST_STATUS)

// certo: lib/labels.ts
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

export const POST_STATUS_LABELS: Record<string, string | undefined> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
} satisfies Record<PostStatus, string>

export const POST_STATUS_VARIANTS: Record<string, BadgeVariant | undefined> = {
  DRAFT: 'outline',
  PUBLISHED: 'default',
} satisfies Record<PostStatus, BadgeVariant>
```

- Variante visual tipada por `VariantProps<typeof xVariants>` do próprio componente `cva`,
  nunca union de string redigitada.
- Concordância de número (`1 post`, `2 posts`) sai de `plural(count, singular, plural)` em
  `labels.ts` — o `no-ternary` proíbe o ternário, e `if` por tela repete a regra.
- Formatação de data: §3.
- `lib/<módulo>.ts` com lógica não trivial tem `lib/<módulo>.test.ts` ao lado (Vitest; glob em
  `tooling.md` §7).

---

## Decisões de forma

- **Query key factory — arquivo central com seção por módulo**: §2.1 (`DECISOES.md`, substitui a #9).
- **`verbatimModuleSyntax` ligado** — ver `_padroes/typescript.md` para o porquê (import que
  sobrevive à elisão de tipo evita o bug de DI por barrel, mesmo não se aplicando a este
  contexto de SSR da mesma forma que no backend).
- **Semicolon/prettier**: ver `_padroes/tooling.md` §Prettier — a mesma régua
  vale para frontend e backend.

**Armadilha documentada uma vez, não por `CLAUDE.md`** *(opinião da casa)*: abrir um dialog
sem gatilho clicado (ex.: atalho de teclado, ação de outro componente) por `ref.click()` falha
em silêncio no Base UI — o disparo programático não carrega o evento que o dialog espera. Use
o par `handle`/estado controlado do `Root` em vez de simular o clique.
