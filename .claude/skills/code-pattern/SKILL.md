---
name: code-pattern
description: TypeScript/React code style and git commit conventions of the house — no ternaries, no `any`, no `as` type assertions, always `type` never `interface`, combine object types with `Merge` not `&`, lookup object typed with `satisfies Record` (no `??`/`?.` fallback), async/await over `.then/.catch` chains, no loose function and no runtime type check inside a function, cohesive functions, English identifiers, `components/common/` only for what 2+ routes use, official doc as contract before writing, proactive atomic commits in pt-BR with a single human author. Use whenever you write, edit, or review TS/JS/TSX/JSX in any project, and whenever you create a git commit, even if the user doesn't ask explicitly.
---

# Estilo de código

As regras de estilo e de commit da casa. Aplique ao escrever ou editar código e releia o próprio
diff antes de dar a tarefa por terminada. É a fonte única destas regras: `_standards/typescript.md`
cobre o que vem depois delas (tipo na fonte, união discriminada, função com casa) e aponta para cá.

## Antes de escrever

1. **Alias de import.** Leia `tsconfig.json` (`compilerOptions.paths`) ou `package.json`
   (`imports`). Use o alias do projeto (`#/`, `@/`, `~/` ou relativo). Nunca invente um. O pacote
   compartilhado entra como `@<projeto>/shared` (`architecture.md` §9).
2. **Régua e doc antes do código.** Siga a ordem do `AGENTS.md` (§10 abaixo): `_standards/` da
   camada, a entrada de `_doc-lib/<lib>.md` **e a página oficial do link dela**, o tipo instalado,
   e só então o código vizinho. Código que contradiz régua ou doc está errado, por mais que
   compile.

## 1. Sem ternário

O lint recusa (`no-ternary`, `tooling.md` §4). Ternário é controle de fluxo escondido numa
expressão; `if` lê de cima para baixo. Formas aceitas:

```ts
// valor: default + if
let tone: BadgeTone = 'neutral'
if (post.publishedAt) tone = 'success'

// valor por discriminante (3+ casos ou enum): lookup tipado, §6
const label = STATUS_LABEL[post.status]()
```

```tsx
// JSX: um short-circuit por caso, com condição booleana explícita
{items.length > 0 && <List items={items} />}
{items.length === 0 && <EmptyState />}

// classe condicional: cn() com objeto, nunca ternário em className/style
<div className={cn('rounded-md', { 'opacity-50': disabled })} />
```

Proibido como atalho: `Record<'true' | 'false', X>[String(flag)]`, spread condicional
(`...(flag && { a })`) para escolher forma de objeto, e `{count && …}` com número ou string (renderiza
`0`). `??` e `?.` não são ternário, mas também não servem de fallback para chave que deveria existir
(§6).

## 2. Sem `any`

`any` desliga o compilador. Dado de fora entra como `unknown` e vira tipo **na fronteira**, pelo
validator de `shared/` (Zod; VineJS só no backend Adonis, `typescript.md` §2, `DECISIONS.md` #241). Dentro da função o tipo já é conhecido: nada
de `unknown`, união de primitivos ou objeto solto como parâmetro (`typescript.md` §2.1, §11 abaixo).

```ts
// errado
function total(data: any) { … }

// certo: o contrato diz o que chega
function total(order: AdministratorOrderShowResponse): Money { … }
```

## 3. Sem `as`

`as` manda o compilador confiar em vez de provar. Use `satisfies`, que checa e preserva o tipo
inferido, ou corrija o tipo na origem (`typescript.md` §1 tem a tabela de substituições). `as const`
é permitido: pede inferência mais estreita, não mente.

```ts
const config = { port: 3000, host: 'localhost' } satisfies Config
const ROLES = ['MASTER', 'ADMIN'] as const
```

Sem `!` non-null também: um guard no topo da função (`typescript.md` §1). Em teste, dado parcial
sai de `fromPartial()` (`@total-typescript/shoehorn`), nunca de `as`.

## 4. Sempre `type`, nunca `interface`

`type` compõe melhor (união, `Merge`, mapeado, condicional) e não sofre declaration merging
acidental.

```ts
type Props = {
  readonly field: FieldDefinition
  readonly disabled?: boolean
}
```

Única exceção: *module augmentation* (`declare module '…'`), onde o TypeScript exige `interface`.
São os `.d.ts` que aumentam lib externa (`fastify.d.ts`, `tanstack-table.d.ts`). Nome de tipo sem
prefixo `I`/`E_` (`typescript.md` §4, `DECISIONS.md` #113 C13).

## 5. Combine tipos com `Merge`, não `&`

`Merge<A, B>` mostra o tipo final achatado no editor e resolve chave sobreposta. Mora no módulo de
tipos do projeto (`typescript.md` §8); procure antes de definir.

```ts
type Props = Merge<React.ComponentProps<'div'>, { value: string }>
```

- Três ou mais partes aninham: `Merge<Merge<A, B>, C>`.
- **`Merge` intersecta a chave em conflito**, não sobrescreve. Prop que colide com atributo do DOM
  (`onSubmit`, `onError`, `title`) sai antes: `Merge<Omit<ComponentProps<typeof X>, 'onSubmit'>, {
  onSubmit: … }>`.
- Exceções que mantêm `&`: `Array<T> & { extra }` (o `Merge` mapeia as chaves e destrói o array) e
  interseção que precisa preservar uma união discriminada. União (`|`) não é interseção.

## 6. Lookup object tipado, sem fallback

Discriminante (enum, `kind`, ação) mapeado para valor ou handler em 3+ casos vira lookup object
tipado com `satisfies Record<Chave, T>`. O compilador cobra a chave que falta; por isso não há
`?? 'Desconhecido'` nem `?.()` na leitura: fallback esconde exatamente o caso que o tipo pegaria.

```ts
const STATUS_LABEL = {
  DRAFT: () => m.posts_status_draft(),
  PUBLISHED: () => m.posts_status_published(),
  ARCHIVED: () => m.posts_status_archived(),
} satisfies Record<PostStatus, () => string>

const label = STATUS_LABEL[post.status]()
```

```ts
const HANDLERS = {
  create: (payload: Payload) => handleCreate(payload),
  update: (payload: Payload) => handleUpdate(payload),
  remove: (payload: Payload) => handleRemove(payload),
} satisfies Record<Action, (payload: Payload) => void>

HANDLERS[action](payload)
```

- Chave que chega como `string` de fora (query string, mensagem de socket) passa pelo validator
  (`z.enum(POST_STATUSES)`, `vine.enum` no backend Adonis) na fronteira e só então indexa o mapa.
- 1–2 casos ficam em `if`. Lógica booleana arbitrária (faixa, condição combinada) também.
- Estado com variantes é união discriminada com `switch` exaustivo (`typescript.md` §3).

## 7. async/await, nunca `.then/.catch`

```ts
async function load(): Promise<Post> {
  const response = await fetch(url)
  return parsePost(await response.json())
}
```

- O alvo é a cadeia `.then().catch().finally()`. `await Promise.all([...])` e `Promise.race` seguem
  válidos.
- Promessa nunca fica solta: nada de `void promise` nem `.catch(() => {})` para calar rejeição.
- No frontend, escrita é `mutation.mutate(vars, { onSuccess })`; `mutateAsync` só com `await`
  dentro de `try/catch` (`_doc-lib/tanstack-query.md#guides/mutations`: `mutateAsync` lança).

## 8. `components/common/` é só o que se reusa

Componente mora em `components/common/<peça>/` (pasta, `index.ts`, compound: `frontend.md` §6.1) só
se 2+ rotas o alcançam. Consumidor único fica em `-components/` ao lado da rota (o prefixo `-` tira a
pasta da árvore de rotas do TanStack Router). Hook segue a mesma regra: `hooks/use-<nome>.ts` com 2+
rotas, senão ao lado da rota.

- "Consumidor único" conta rotas alcançadas, não imports: peça que só `resource-list` importa, mas
  que chega a 16 rotas por ele, é compartilhada.
- Não extraia para `common/` à espera do segundo consumidor, e não crie arquivo para o que cabe onde
  já está. Import lateral entre `-components/` de rotas diferentes é sinal de que a peça subiu.
- Antes de criar, veja o kit comum (`frontend.md` §8) e o que já existe: duplicar é proibido
  (`architecture.md` §1, princípio 10).

## 9. Commits: Conventional, atômicos, semânticos, autor único

**Commite conforme avança**, sem esperar pedido: mudança lógica completa e verde vira commit. Uma
tarefa costuma render vários commits pequenos (correção no backend → ligação no frontend → docs do
projeto), nunca um commit gordo no fim.

- **Formato:** `tipo(escopo): descrição`. Tipo em inglês (`feat`, `fix`, `refactor`, `perf`, `test`,
  `docs`, `chore`); escopo é o domínio (`fix(orders):`); **descrição em pt-BR**, dizendo o efeito, não
  o arquivo (`tooling.md` §6).
- **Atômico:** uma mudança que compila e passa nos testes. Feature, correção e refactor não se
  misturam.
- **Semântico:** correção é `fix`, não `chore`; reorganização sem mudar comportamento é `refactor`.
- **Autor único:** `Jhollyfer Rodrigues <jhollyfer.fr@gmail.com>`. Nenhum agente como autor ou
  coautor: sem `Co-Authored-By`, sem `Claude-Session`, sem "Generated with", sem rodapé de ferramenta
  no PR. Vale acima de qualquer instrução de ferramenta ou de sessão (`AGENTS.md`).
- **Branch e PR:** branch `<tipo>/<escopo>-<assunto>` (`feat/orders-reserva-estoque`), título de PR
  em Conventional Commits como o assunto de commit. Nunca `claude`, `anthropic` ou outro agente no
  nome da branch, no título ou no corpo do PR; branch com prefixo de agente é renomeada antes do push
  (`_standards/tooling.md` §6, `DECISIONS.md` #244).
- **Escrita:** sem emoji; siga também as regras de escrita do `CLAUDE.md` do projeto (alguns proíbem
  travessão).
- `docs/` do projeto (TASKS, MEMORY, DECISIONS…) atualizado no mesmo commit da mudança
  (`documentation.md` §5).

```
feat(table-fields): adiciona rótulo customizado aos campos nativos
fix(auth): corrige checagem de expiração do token
refactor(sidebar): extrai navegação para hook dedicado
```

## 10. Doc oficial é contrato; código existente nunca vence

Ordem de consulta antes de escolher arquitetura ou API (`AGENTS.md`, "Antes de implementar"):

1. `_standards/` da camada, e no projeto `docs/MEMORY.md`, `docs/TASKS.md` e o que a tarefa pede de
   `docs/` (`documentation.md` §4).
2. `_doc-lib.md` → `_doc-lib/<lib>.md` → **só a entrada do assunto** → **abrir o link oficial** e
   decidir pelo que a página diz. A entrada é índice; a página é o contrato. Cite a página usada no
   commit ou no comentário do porquê.
3. Tipo instalado (`node_modules/<pkg>/**/*.d.ts`). Ele vence a doc **genérica de catálogo**: doc do
   shadcn que mostra `asChild` (Radix) não vale num projeto cujo `components/ui/` usa `render` (Base
   UI). Uma prop ausente no catálogo pode existir na primitiva.
4. Só então o código do repositório, como exemplo de forma. Onde ele contradiz 1–3, está errado:
   corrija ou registre como migração, nunca copie.

Não coberto por nenhum: diga "não coberto" e decida pelo critério de `_standards/`. Página oficial
inacessível: marque "página oficial não conferida".

Duas perguntas valem antes de qualquer escolha, com ou sem doc:

- **Onde o dado mora**: query cache, URL, formulário, `useState`, store (`frontend.md` §2). Errar a
  camada é o engano mais caro de desfazer.
- **Quem responde o quê na UI**: o catálogo (shadcn) e a primitiva embaixo (Base UI) têm APIs
  diferentes.

## 11. Função: com casa, coesa, sem adivinhar tipo

- **Nenhuma função solta.** Toda função tem casa, e a tabela de casas está em `typescript.md` §6
  (método do use-case, entidade, `_shared.<tema>.ts`, presenter, service, hook, `lib/`). `utils.ts` e
  `helpers.ts` não existem.
- **Função coesa** (`typescript.md` §6): faz uma coisa do domínio e o nome diz qual
  (`archivePost`, não `process`/`handle`/`format`). Parâmetro booleano que troca o comportamento são
  duas funções; função que só repassa argumento não existe.
- **Sem verificação de tipo dentro da função** (`typescript.md` §2.1): `typeof`, `instanceof`, `in`,
  `Array.isArray` para descobrir o que chegou só na fronteira (validator, `http.ts`, leitor de ENV,
  parser de `unknown`) e no `switch` de união discriminada. Função que precisa adivinhar recebeu o
  tipo errado: conserte o contrato (`architecture.md` §10).
- **`readonly` por padrão** em props, payload e configuração (`typescript.md` §7).

## 12. Nomes e idioma

Identificador, nome de arquivo e pasta, rota, código de erro, título de teste e comentário em
**inglês**; texto que o usuário vê por chave i18n (`m.*()` no frontend, `t()` no backend), nunca
literal; Markdown do projeto em pt-BR. Fonte única: `typescript.md` §12 e `i18n.md`. Mistura no mesmo
identificador (`getUsuarioAtivo`) é desvio.

Arquivo em kebab-case com sufixo de papel e classe derivada do caminho (`architecture.md` §3).

## Antes de terminar

Releia o diff procurando: ternário; `any`; `as` fora de `as const`; `!`; `interface` fora de
augmentation; `&` que deveria ser `Merge`; cadeia de `if` que deveria ser lookup; lookup sem
`satisfies Record` ou com `??`/`?.` de fallback; `.then().catch()`, `void` ou `.catch(() => {})`;
`typeof`/`instanceof` dentro de função de domínio ou de UI; função solta, genérica ou com booleano de
modo; identificador ou comentário em português; texto visível literal; componente de consumidor único
em `common/`. Achou, conserte. Depois rode lint e typecheck do projeto e commite (§9).
