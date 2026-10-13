# Padrão de TypeScript

Vale para backend e frontend. As regras de estilo (sem ternário, sem `any`, sem `as`, `type` em
vez de `interface`, `Merge` em vez de `&`, lookup object, `async/await`) estão na skill
`code-pattern` e na §2 de [`backend.md`](backend.md). Este arquivo não as repete: cobre o que vem
**depois** delas, que é usar o sistema de tipos para o compilador pegar o defeito antes do teste.

Autoridade: `_doc-lib/` > `.d.ts` instalado > este arquivo > código existente (§0 de `backend.md`).

---

## 1. O tipo nasce na fonte, nunca por asserção

`as` só existe em `as const`. Todo outro `as` é o programador dizendo ao compilador para parar de
checar, e o lint recusa (`@typescript-eslint/consistent-type-assertions`,
`assertionStyle: 'never'` — a forma `as const` continua permitida).

| Em vez de | Use |
|---|---|
| `const cfg = {...} as Config` | `const cfg = {...} satisfies Config` — checa e preserva o literal |
| `JSON.parse(x) as User` | validator VineJS na fronteira; o tipo vem de `Infer<typeof X>` |
| `el as HTMLInputElement` | `if (el instanceof HTMLInputElement)` |
| `value!` | `if (!value) return left(...)`; o `!` some quando o narrowing existe |
| `row as Row` (dado de driver) | genérico do próprio driver: `db.collection<Row>('x')`, `Model.query()` |

Cast de fronteira real (lib com tipo errado) leva `eslint-disable-next-line` com a justificativa
em pt-BR e o nome do pacote. É exceção registrada, não atalho. O mesmo vale para supressão do
compilador: `// @ts-expect-error <motivo>`, nunca `@ts-ignore` — o primeiro quebra quando o erro
some, o segundo esconde para sempre (TS 3.9 release notes, "`// @ts-expect-error` Comments").

**Um guard no topo da função, não um `!` em cada acesso** *(opinião da casa)*: campo opcional
acessado várias vezes no mesmo bloco (`field.relationship!.table`, `.slug`, `.order`, ...) não
precisa de um `!` por linha — um só `if (!field.relationship) return`/`throw` no topo elimina
todos de uma vez. Exemplo negativo real: um bloco com doze `!` sobre o mesmo campo opcional,
onde a guarda nunca foi escrita.

## 2. Dado de fora é `unknown` até ser validado

Corpo de requisição, query string, `localStorage`, mensagem de socket, payload de job, resposta
de API de terceiro: tudo entra como `unknown` e passa por validator (VineJS nos dois lados —
`_doc-lib.md`, "VineJS nos dois lados"). O tipo usado depois é o inferido do schema, não um
`type` escrito à mão ao lado dele: dois lugares descrevendo o mesmo formato divergem.

```ts
export const UserCreateValidator = vine.create({ name: vine.string().trim() })
export type UserCreatePayload = Infer<typeof UserCreateValidator>
```

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

## 4. Enum é objeto `as const`

```ts
export const ROLE = { ADMIN: 'ADMIN', MEMBER: 'MEMBER' } as const
export type Role = (typeof ROLE)[keyof typeof ROLE]
```

Sem `enum` do TypeScript: gera código em runtime, não é apagável por `erasableSyntaxOnly` e não
roda direto no Node com type stripping. Os enums do domínio moram em `core/entity` (`backend.md`
§1.1); no frontend, em `lib/entity.ts`, com o array de valores e os rótulos em `lib/labels.ts`
(`frontend.md` §8).

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
| regra de validação de um recurso | `app/features/<módulo>/<recurso>/<recurso>.validator.ts` |
| regra de validação usada por 2+ recursos | função em `app/core/validator.ts` (`arquitetura.md` §3) |
| precisa de dependência (banco, drive, outro service) ou configuração | service injetável (`backend.md` §4.9) |
| regra de UI de uma rota | `routes/<rota>/-components/` ou hook da rota |
| usada por 2+ rotas | `components/common/` ou `hooks/` |
| utilitário genérico sem domínio | `lib/` — e só se o stdlib não resolver |

Arquivo `utils.ts`/`helpers.ts` genérico não existe: é onde função perde dono. Antes de escrever
uma, procure a existente (`grep`, code-review-graph) e o stdlib (`structuredClone`,
`Object.groupBy`, `Array.prototype.toSorted`, `Intl`).

## 7. `readonly` por padrão em dado que não muda

Props de componente, payload de use-case, constantes de configuração: `readonly` nos campos e
`ReadonlyArray<T>` nas listas. Mutação vira escolha explícita, visível no tipo.

## 8. Tipos utilitários: os nativos primeiro

`Pick`, `Omit`, `Partial`, `Required`, `Record`, `ReturnType`, `Awaited`, `NonNullable`,
`Parameters`. `Merge<A, B>` (de `core/entity`) é o único utilitário da casa — **opinião da
casa**: o Handbook usa `&`/`interface extends` como forma idiomática de combinar tipos
(typescriptlang.org/docs/handbook/2/everyday-types.html, "Intersection Types") e não documenta
nem proíbe um utilitário como este; `Merge` existe para resolver o caso de chaves conflitantes
que a interseção não resolve, sem regra automatizada que cobre (ver `tooling.md` §4). Tipo
condicional de cinco níveis que só o autor entende é custo, não poder: se precisa de comentário
para ler, quebre em tipos nomeados.

## 9. `import type` para o que é só tipo

Com `verbatimModuleSyntax`, import de tipo sem `type` vira import de runtime. Regra de
nomenclatura em `backend.md` §3.

## 10. tsconfig

Flags mínimas em [`tooling.md`](tooling.md): `strict`, `noUncheckedIndexedAccess`,
`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`,
`noUncheckedSideEffectImports`. `noUncheckedIndexedAccess` é a que mais pega: `arr[0]` passa a
ser `T | undefined`, como é em runtime.

## 11. Recursos do TS 5.x que substituem gambiarra

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
