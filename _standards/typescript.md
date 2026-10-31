# Padrão de TypeScript

Vale para backend, frontend e `shared/`. As regras de estilo (sem ternário, sem `any`, sem `as`,
`type` em vez de `interface`, `Merge` em vez de `&`, lookup object, `async/await`) estão escritas uma vez,
na §2 de [`backend.md`](backend.md); a skill `code-pattern` as aplica e o lint as cobra (`tooling.md` §4). Este
arquivo não as repete: cobre o que vem **depois** delas, que é usar o sistema de tipos para o
compilador pegar o defeito antes do teste, e as formas aceitas onde o lint só diz "não" (§13).

Autoridade: `_doc-lib/` > `.d.ts` instalado > este arquivo > código existente (§0 de `backend.md`).

---

## 1. O tipo nasce na fonte, nunca por asserção

`as` só existe em `as const`. Todo outro `as` é o programador dizendo ao compilador para parar de
checar, e o lint recusa (`@typescript-eslint/consistent-type-assertions`,
`assertionStyle: 'never'` — a forma `as const` continua permitida).

| Em vez de | Use |
|---|---|
| `const cfg = {...} as Config` | `const cfg = {...} satisfies Config` — checa e preserva o literal |
| `JSON.parse(x) as User` | validator Zod na fronteira (VineJS no backend Adonis); o tipo vem de `z.infer<typeof X>` |
| `el as HTMLInputElement` | tipo na origem: `useRef<HTMLInputElement>(null)`, `ChangeEvent<HTMLInputElement>` com `event.currentTarget`, `querySelector('input')` (o seletor de tag já tipa, _doc-lib/typescript.md#docs/handbook/dom-manipulation); `instanceof` só na fronteira do DOM (§2.1) |
| `value!` | `if (!value) return left(...)`; o `!` some quando o narrowing existe |
| `row as Row` (dado de driver) | genérico do próprio driver: `db.collection<Row>('x')`, `Model.query()` |

Cast de fronteira real (lib com tipo errado) leva `eslint-disable-next-line` com a justificativa
em inglês (§12) e o nome do pacote. É exceção registrada, não atalho. O mesmo vale para supressão do
compilador: `// @ts-expect-error <motivo>`, nunca `@ts-ignore` — o primeiro quebra quando o erro
some, o segundo esconde para sempre (TS 3.9 release notes, "`// @ts-expect-error` Comments").

**Dado parcial em teste** *(opinião da casa; sem `_doc-lib`)*: dublê ou fixture que só precisa de
parte de um tipo grande usa `fromPartial()` de `@total-typescript/shoehorn`, e só em
`*.unit.spec.ts`, `*.e2e.spec.ts`, `*.test.ts(x)` e `e2e/`. `fromAny()` não entra: dado inválido de
propósito se passa a quem já aceita `unknown`, que é a fronteira (§2).

**Um guard no topo da função, não um `!` em cada acesso** *(opinião da casa)*: campo opcional
acessado várias vezes no mesmo bloco (`field.relationship!.table`, `.slug`, `.order`, ...) não
precisa de um `!` por linha — um só `if (!field.relationship) return`/`throw` no topo elimina
todos de uma vez. Exemplo negativo real: um bloco com doze `!` sobre o mesmo campo opcional,
onde a guarda nunca foi escrita.

## 2. Dado de fora é `unknown` até ser validado

Corpo de requisição, query string, `localStorage`, mensagem de socket, payload de job, resposta
de API de terceiro: tudo entra como `unknown` e passa por validator (Zod em frontend, `shared/` e
Fastify; VineJS só no backend Adonis, onde é nativo: `tooling.md` §0.1, `DECISIONS.md` #241;
_doc-lib/zod.md#basics). O tipo usado depois é o inferido do schema, não um
`type` escrito à mão ao lado dele: dois lugares descrevendo o mesmo formato divergem.

```ts
// shared/src/validators/administrator/users.validator.ts
export const AdministratorUserCreateValidator = z.object({ name: z.string().trim() })
export type AdministratorUserCreatePayload = z.infer<typeof AdministratorUserCreateValidator>
```

**Resposta da própria API também é dado de fora** (`DECISIONS.md` #113, C15). O corpo chega ao
frontend como `unknown` e vira tipo num **único ponto**, a função `request` de
`integrations/tanstack-query/http.ts`, que recebe o schema `…Response` de `shared/src/responses/`
(`architecture.md` §10) e devolve `Infer<typeof schema>`. Nenhum outro arquivo do frontend tipa
corpo de resposta, e `request<T>()` com `T` escolhido por quem chama é o `as` com outro nome. Se
a validação em runtime da resposta inteira custar caro demais numa rota medida, o mesmo ponto faz
um cast único com `eslint-disable-next-line` e o motivo; nunca no chamador.

- **API de terceiro** (gateway, CEP, CNPJ): o adapter em `services/<nome>/<nome>.service.ts`
  valida a resposta por schema (Zod; VineJS no Adonis) antes de usar (`solid.md` §2); tipo do SDK não sai dali.
- **`localStorage`**: lido num lugar só (`lib/local-store.ts`), dentro de `try/catch`, por schema;
  a chave carrega versão (`prefs:v2`) e falha de parse devolve o default.

### 2.1 Tipo se resolve na fronteira, uma vez — nunca adivinhado dentro da função *(opinião da casa)*

Validado na fronteira, o dado tem tipo conhecido dali em diante. Por isso, **dentro** de entidade,
use-case, service, presenter, hook e componente não existe verificação de tipo em tempo de
execução: nada de `typeof x === 'string'`, `x instanceof Y`, `'campo' in x`, `Array.isArray(x)` ou
`Number.isNaN` para descobrir o que chegou. Função que precisa disso recebeu o tipo errado; o
conserto é no contrato (`architecture.md` §10), não um `if` a mais.

```ts
// errado: a função adivinha o que recebeu
function formatPrice(value: unknown): string {
  if (typeof value === 'number') return currency.format(value)
  if (typeof value === 'string') return currency.format(Number(value))
  return '—'
}

// certo: o contrato diz o que chega, e a função só faz o trabalho dela
function formatPrice(value: Money): string {
  return currency.format(value.amount)
}
```

- **Parâmetro nunca é `unknown`, `any`, união de primitivos ou objeto solto** "para servir a
  vários casos". Cada caso é um tipo; vários casos são uma união discriminada (§3).
- **Onde verificar tipo é permitido, e só lá:** o validator (Zod, ou VineJS no Adonis; que é exatamente essa
  verificação, feita uma vez), o `http.ts` que recebe a resposta, o leitor de ENV, o parser de
  `localStorage`/mensagem de socket/payload de job — todos convertendo `unknown` pelo schema — e o
  `switch` sobre o discriminante de uma união (§3), que não é adivinhação: é o tipo declarado.
- **Fronteira do DOM**: elemento que chega de API do navegador com tipo largo (`event.target`,
  `document.activeElement`, `Element` devolvido por lib) é dado de fora; ali, e só ali, `instanceof`
  faz o narrowing (_doc-lib/typescript.md#docs/handbook/2/narrowing). Dentro do componente React o
  tipo vem da origem (`useRef<T>`, `event.currentTarget`, §1) e `instanceof` não aparece.
- **Dado dinâmico também tem tipo** (`architecture.md` §10): o tipo do campo vem da definição do
  campo, e o valor é a variante da união daquele tipo. `typeof` sobre o valor da linha é desvio.
- **Por quê:** verificação de tipo espalhada esconde contrato quebrado, cria caminho que nenhum teste
  exercita e efeito colateral silencioso (o `'—'` acima aparece na tela em vez de um erro de tipo).

## 3. Estado com variantes é união discriminada, e o `switch` é exaustivo

```ts
type UploadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'sending'; readonly progress: number }
  | { readonly kind: 'failed'; readonly code: string }

function label(state: UploadState): string {
  switch (state.kind) {
    case 'idle': return 'Aguardando'
    case 'sending': return `${state.progress}%`
    case 'failed': return state.code
    default: {
      const unreachable: never = state
      return unreachable
    }
  }
}
```

Variante nova sem `case` quebra o build no `never`. Dois booleanos (`isLoading`, `isError`) que
podem estar `true` juntos são o defeito que a união elimina. Mapa discriminante → valor é lookup
object tipado com `satisfies Record<UploadState['kind'], ...>`.

## 4. Enum é objeto `as const`, com nome canônico

Uma trinca por enum, sempre com estes nomes (`DECISIONS.md` #113, C13):

```ts
// shared/src/enums/post-status.ts
export const POST_STATUS = { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED', ARCHIVED: 'ARCHIVED' } as const
export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS]
export const POST_STATUSES = Object.values(POST_STATUS)
```

| Peça | Forma | Exemplo |
|---|---|---|
| objeto | `SCREAMING_SNAKE` singular | `POST_STATUS`, `ROLE` |
| tipo | `PascalCase` singular | `PostStatus`, `Role` |
| array de valores (para `z.enum`, `vine.enum`, `<select>`, teste de cobertura) | `SCREAMING_SNAKE` plural | `POST_STATUSES`, `ROLES` |

- Sem prefixo `E_` no enum e sem prefixo `I` no tipo (`IUser`, `E_ROLE` são desvio nos dois lados).
- Sem `enum` do TypeScript *(opinião da casa)*: o Handbook diz que, no TypeScript moderno, um objeto
  `as const` costuma bastar no lugar de `enum` (_doc-lib/typescript.md#docs/handbook/enums, "Objects
  vs Enums"). O objeto é JavaScript comum (o valor é a string que vai no JSON e no banco), dá o array
  da trinca para `z.enum`, `vine.enum` e `<select>` sem truque, e não traz o mapeamento reverso nem as armadilhas
  de `const enum` que a mesma página descreve. A casa não liga `erasableSyntaxOnly`: a flag também
  recusa parameter property (`constructor(private readonly repo: X)`), que a injeção por construtor
  usa (_doc-lib/typescript.md#tsconfig).
- **Onde mora:** `shared/src/enums/<nome>.ts` (`architecture.md` §9), usado pelos dois lados. O
  rótulo que o usuário vê mora em `lib/labels.ts` do frontend, uma função por valor que chama
  `m.*()` (`i18n.md` §2, `frontend.md` §8). Enum que só existe dentro de uma entidade e não sai na
  resposta fica no arquivo da entidade, em `app/domain/<entidade>/`.

## 5. Falha esperada é valor, não exceção *(opinião da casa)*

Use-case devolve `Either<HTTPException, T>` (`backend.md` §4.2). `throw` fica para o que é bug
ou infraestrutura caída. No frontend, o erro da API chega tipado pelo envelope
`{ message, status, code, errors? }` e a UI compara `code`, nunca `message`.

## 6. Nada de função solta *(opinião da casa)*

Toda função tem casa, e a casa decide quem pode chamá-la:

| A função | Mora em |
|---|---|
| regra de uma operação | método privado do use-case |
| pura, sobre dado já em mãos, usada por 2+ use-cases | `app/features/<módulo>/_shared.<tema>.ts` (entre módulos, `app/features/_shared.<tema>.ts`) |
| invariante e transição de uma entidade | método da entidade em `app/domain/<entidade>/` (`domain.md`) |
| regra de validação de um recurso | `shared/src/validators/<módulo>/<recurso>.validator.ts` |
| regra de validação usada por 2+ recursos | função em `shared/src/validator.ts` (`architecture.md` §9) |
| entidade → resposta da API | método do presenter `<recurso>.presenter.ts` (`architecture.md` §10) |
| precisa de dependência (banco, drive, outro service) ou configuração | service injetável (`backend.md` §4.9) |
| regra de UI de uma rota | `routes/<rota>/-components/`, `-<nome>.ts` ao lado da rota (`-search.ts`) ou hook da rota |
| usada por 2+ rotas | `components/common/` ou `hooks/` |
| utilitário de tema sem domínio | `lib/<tema>.ts` (`lib/slug.ts`, `lib/form-a11y.ts`), e só se o stdlib não resolver |
| `cn()` de classe CSS | `lib/cn.ts`, **exceção nomeada**: convenção do shadcn, apontada pelo `components.json`; o arquivo só tem `cn()` (C19) |
| helper de teste usado por 2+ specs | `tests/<tema>-fixtures.ts` (backend) ou `e2e/support/<tema>.ts` (Playwright); usado por 1 spec, fica na spec (C12) |
| passo de script de guard-rail (`pattern-check`, `authz-check`) | o próprio módulo do script em `scripts/`; função de módulo tolerada só ali e em `e2e/support/` |
| configuração | `config/<nome>.ts` exporta **só valor**; função que lê config é service (`backend.md` §6) |
| ponto de entrada lido por carregador por convenção, que chama o `default` do módulo importado (`boot.ts` de extensão, `architecture.md` §3.1; `*.seed.ts` no Fastify, `backend.md` §3) | `export default function`, **exceção nomeada**: o contrato é o `default` do namespace do `import()` (_doc-lib/nodejs.md#api/esm); a função só monta e delega ao service, sem regra própria. Classe ali seria embrulho do mesmo export e mudaria o contrato de toda extensão publicada |

**Função coesa** *(opinião da casa)*: faz uma coisa do domínio, e o nome diz qual
(`archivePost`, `calculateOrderTotal`), sem precisar ler o corpo. Sinais de função errada, que se
reescreve antes do commit:

- o nome é genérico (`process`, `handle`, `doStuff`, `helper`, `format`) ou precisa de "e" para
  descrever o que faz;
- parâmetro booleano que troca o comportamento (`save(post, true)`): são duas funções;
- devolve formas diferentes conforme o caminho, ou recebe `unknown`/objeto solto que ela mesma
  adivinha;
- existe só para repassar argumentos a outra (passagem rasa, sem regra própria);
- recebe mais de três parâmetros posicionais: vira um objeto nomeado e tipado (argumento na ordem
  errada compila e quebra em silêncio);
- quem lê pergunta "o que isto está fazendo?".

Arquivo `utils.ts`/`helpers.ts` genérico não existe: é onde função perde dono. A única exceção é
`lib/cn.ts`, da tabela acima. Antes de escrever
uma, procure a existente (`grep`, code-review-graph) e o stdlib (`structuredClone`,
`Object.groupBy`, `Array.prototype.toSorted`, `Intl`).

## 7. `readonly` por padrão em dado que não muda

Props de componente, payload de use-case, constantes de configuração: `readonly` nos campos e
`ReadonlyArray<T>` nas listas. Mutação vira escolha explícita, visível no tipo.

## 8. Tipos utilitários: os nativos primeiro

`Pick`, `Omit`, `Partial`, `Required`, `Record`, `ReturnType`, `Awaited`, `NonNullable`,
`Parameters`. `Merge<A, B>` (exportado por `@<projeto>/shared`) é o único utilitário da casa, **opinião da
casa**: o Handbook usa `&`/`interface extends` como forma idiomática de combinar tipos
(typescriptlang.org/docs/handbook/2/everyday-types.html, "Intersection Types") e não documenta
nem proíbe um utilitário como este; `Merge` existe para resolver o caso de chaves conflitantes
que a interseção não resolve, sem regra automatizada que cobre (ver `tooling.md` §4). Tipo
condicional de cinco níveis que só o autor entende é custo, não poder: se precisa de comentário
para ler, quebre em tipos nomeados.

- **Chave que colide com atributo do DOM sai antes do `Merge`**: props de wrapper são
  `Merge<Omit<ComponentProps<typeof X>, 'onSubmit'>, { onSubmit: (data: Payload) => void }>`.
- **Onde `&` continua certo** (exceção nomeada, comentário curto na linha):
  - interseção com `Array<T>` (`Array<T> & { total: number }`), que o `Merge` transformaria em
    objeto;
  - interseção que precisa **preservar uma união discriminada**: `Merge` sobre uma união achata as
    variantes num objeto só e o `switch` do §3 perde o estreitamento. Caso real: props de
    componente que são `A | B` pelo modo (`mode: 'single' | 'range'`) somadas a um bloco comum;
  - interseção sobre **parâmetro de tipo genérico ainda aberto** (`Props & { createdAt: Date }`
    num contêiner genérico): o `Merge` é mapeado e, sobre `Props` não resolvido, fica adiado e
    perde a relação com `Props` (`Props['updatedAt'] & (Date | null)` não aceita o `Date` gravado,
    TS2322). Trocar por `as` é proibido (§1) e por tipo concreto desfaz o genérico: fica o `&`.

```ts
// & keeps the discriminated union; Merge would collapse the variants
type CalendarProps = (SingleProps | RangeProps) & { readonly className?: string }
```

## 9. `import type` para o que é só tipo

Com `verbatimModuleSyntax`, import de tipo sem `type` vira import de runtime. Regra de
nomenclatura em `backend.md` §3.

## 10. tsconfig

A lista de flags, o porquê de cada uma e o que muda por perfil estão só em
[`tooling.md`](tooling.md) §3. A versão do compilador é a última 6.x (`DECISIONS.md` #121).

## 11. Recursos do TS (5.x em diante) que substituem gambiarra

| Em vez de | Use | Base |
|---|---|---|
| genérico inferido pelo argumento errado | `NoInfer<T>` no parâmetro que não deve inferir | TS 5.4 release notes |
| `try/finally` manual para fechar recurso | `using` / `await using` com `Symbol.dispose` | TS 5.2 release notes |
| união de string escrita à mão (`'pt_title' \| 'en_title'`) | template literal type (`` `${Locale}_${Field}` ``) | Handbook, "Template Literal Types" |
| index signature (`{ [k: string]: V }`) com chaves conhecidas | `Record<UniãoDeChaves, V>` | Handbook, "Utility Types" |
| tipo `Function` | assinatura explícita (`(id: string) => Promise<void>`) | Handbook, "More on Functions" |

```ts
function createState<T>(initial: T, fallback: NoInfer<T>): T {
  return initial ?? fallback
}

type Locale = 'pt' | 'en'
type TitleKey = `${Locale}_title`          // 'pt_title' | 'en_title'
const LABEL = { pt_title: 'Título', en_title: 'Title' } satisfies Record<TitleKey, string>
```

**ID com marca** *(opinião da casa — não há página oficial)*: id de entidades diferentes não se
trocam quando o tipo carrega uma marca. A marca nasce num type guard, nunca em `as`:

```ts
type UserId = string & { readonly __brand: 'UserId' }

function isUserId(value: string): value is UserId {
  return /^[0-9a-f-]{36}$/.test(value)
}
```

## 12. Idioma *(opinião da casa)*

Todo o projeto é inglês; **só a documentação em Markdown é português**. Fonte única desta regra: os
outros arquivos apontam para cá.

| O quê | Idioma | Exemplo |
|---|---|---|
| identificador em `.ts`/`.tsx` (variável, função, classe, tipo, enum, chave de objeto, parâmetro) | inglês | `archivePost`, `TeamMembership`, `ORDER_STATUS` |
| nome de arquivo e de pasta de código | inglês, kebab | `features/teams/members/create/create.use-case.ts` |
| rota e URL (backend e frontend, inclusive página pública) | inglês, kebab | `/events/$slug`, `GET /administrator/posts` |
| código de erro de negócio | inglês, maiúsculo | `POST_NOT_FOUND` |
| título de teste (`test(...)`, `describe(...)`) | inglês | `test('returns 404 when the post is archived')` |
| texto que o usuário vê: mensagem de erro, rótulo, toast, e-mail, conteúdo de tela | `pt-BR`, `es` e `en`, nunca literal no código: chave de mensagem (`i18n.md`) | `m.posts_not_found()` |
| comentário, JSDoc e justificativa de `eslint-disable` | inglês | `// cookie is host-only without COOKIE_DOMAIN` |
| Markdown do projeto (`AGENTS.md`, `CLAUDE.md`, `docs/`, README) | pt-BR; nome do arquivo em inglês | `documentation.md` §2 |
| skills (`.claude/skills/`, `.agents/skills/`) e qualquer skill externa | como vierem; não se traduz nem se ajusta | a skill é de terceiro e se atualiza pela fonte dela |
| mensagem de commit | tipo em inglês, descrição em pt-BR | `tooling.md` §6 |

Mistura no mesmo identificador (`getUsuarioAtivo`) é desvio. Termo de domínio sem tradução boa
(`cnpj`, `pix`) fica como está, em minúsculo, dentro do nome em inglês (`validateCnpj`).

**Comentário diz o porquê** *(opinião da casa)*: a decisão, o defeito que a linha evita, a
restrição de fora. Comentário que narra a linha, que conta o histórico ("mudou de X para Y") e
código comentado se apagam. Comentário que descreve uma condição muda **no mesmo diff** que a
condição (afrouxou o `if`, reescreve o "só quando"). **Renomear símbolo** inclui `grep` do nome
antigo em comentário, mensagem, doc e `.specs/`, no mesmo commit; o compilador só acha o código.
`TODO` só com dono e referência de tarefa (`docs/TASKS.md`); entrega
não leva `// ...` nem stub no lugar de código pedido.

## 13. Sem ternário: formas aceitas *(opinião da casa; lint `no-ternary`)*

O lint proíbe o ternário (`tooling.md` §4). Estas são as formas que o substituem, e as que só
escondem o ternário com outra roupa:

| Situação | Forma aceita |
|---|---|
| valor que depende de condição | `let label = DEFAULT; if (cond) label = OTHER`, ou função com `if` e retorno antecipado |
| valor que depende de um membro de enum ou união | lookup `satisfies Record<PostStatus, …>` indexado pelo próprio valor (§3) |
| um elemento JSX ou nenhum | `{items.length > 0 && <List />}`: o lado esquerdo é **booleano explícito**, nunca o número ou a string crua (`{count && …}` desenha `0`) |
| um elemento JSX ou outro | o par `{isEmpty && <EmptyState />}{!isEmpty && <List />}`, ou um componente que decide com `if` e devolve um dos dois |
| classe CSS condicional | `cn('base', { 'is-active': isActive })` (`lib/cn.ts`) ou o `cva` do componente, nunca ternário dentro de `className`/`style` |
| texto no singular ou plural | variante de plural da mensagem de i18n (`i18n.md` §2) |
| campo opcional num objeto | o campo existe no tipo como `x?: T` e recebe o valor ou `undefined` explícito, calculado antes com `if` |

`??`, `?.` e o `&&` de curto-circuito continuam livres: não são ternário.

**Proibido, porque é ternário disfarçado:**

```ts
// lookup indexed by a stringified boolean
const LABEL = { true: 'Ativo', false: 'Inativo' } satisfies Record<'true' | 'false', string>
LABEL[String(isActive)]

// conditional spread as a shortcut for "maybe this field"
const payload = { ...base, ...(isAdmin && { role: ROLE.ADMIN }) }
```

O primeiro troca o `if` por uma conversão que o leitor tem de decifrar e esconde a regra de
domínio num par de strings; o segundo produz objetos de formas diferentes conforme o caminho, que
é o defeito de função incoesa do §6. Booleano com duas apresentações vira `if`, ou um enum de
verdade quando o domínio tem nome para os dois estados.
