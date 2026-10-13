---
name: code-pattern
description: TypeScript/React code style and git commit conventions — no needless ternaries, no needless `any`, no `as` type assertions, always `type` never `interface`, combine object types with `Merge` not `&`, lookup object over long if/else chains, async/await over `.then/.catch` chains, `components/common/` só para o que mais de uma rota usa, consultar a doc do projeto antes de escrever, proactive atomic commits. Use whenever you write, edit, or review TS/JS/TSX/JSX in any project, and whenever you create a git commit, even if the user doesn't ask explicitly.
---

# Code style

The code style and commit conventions to follow. Apply the rules when you write or
edit code, and reread your own diff before calling the task done.

## Antes de escrever

1. **Alias de import.** Leia `tsconfig.json` (`compilerOptions.paths`) ou
   `package.json` (`imports`). Use o alias do projeto — pode ser `#/`, `@/`, `~/`
   ou caminho relativo. Nunca invente um que o projeto não tenha.
2. **Doc do projeto.** Se houver `CLAUDE.md`, `AGENTS.md` ou um índice de
   documentação na raiz, leia antes de escolher arquitetura. Onde a doc divergir
   do código, **o código vence**.

## 1. No needless ternaries

Avoid the ternary for a plain assignment. Instead of `a = b ? 1 : 2`, use a classic
`if`. It reads top to bottom, no decoding `?` and `:`:

```ts
// Avoid
const a = b ? 1 : 2

// Prefer
let a
if (b) a = 1
if (!b) a = 2
```

Same idea in JSX. Rather than picking between two components with a ternary, render
each case with its own short-circuit:

```tsx
// Avoid
{a ? <ComponentA /> : <ComponentB />}

// Prefer
{a && <ComponentA />}
{!a && <ComponentB />}
```

This isn't a crusade against every `?`. The thing to avoid is the ternary used as
control flow. Operators that aren't ternaries are fine:

- `??` (nullish coalescing): `const name = input ?? 'default'`
- `?.` (optional chaining): `user?.profile?.email`
- `&&` short-circuit, which is exactly the JSX pattern above

## 2. No needless `any`

Avoid `any`. There's almost always a better type, so look for it first. Shape the
value with `type`, lean on inference when it's good, or use `unknown` plus a narrow
when the value genuinely arrives shapeless. `any` switches off the checker and hides
bugs. It's the last resort, not the first.

```ts
// Avoid
function parse(data: any) { ... }

// Prefer
type Payload = { id: string; total: number }
function parse(data: Payload) { ... }
```

## 3. No `as` type assertions

Forcing a type with `as` — `as any`, `as string`, `as number`, `as SomeType` — tells
the compiler to trust you instead of proving the type holds. Prefer `satisfies`,
which checks the value against the type without erasing the concrete inferred type:

```ts
// Avoid
const config = { port: 3000, host: 'localhost' } as Config

// Prefer
const config = { port: 3000, host: 'localhost' } satisfies Config
```

`as const` is a different thing and it's allowed. It doesn't lie to the compiler, it
just asks for a narrower inference (readonly, literals):

```ts
const ROLES = ['MASTER', 'ADMIN'] as const // ok
```

When `satisfies` won't do it and you feel like you need `as`, stop. That's usually a
sign the type at the source is too weak. Fix it there instead of papering over it at
the use site.

## 4. Sempre `type`, nunca `interface`

Modele tipos com `type` — objeto, união, interseção, tudo. Não use `interface` no
código da aplicação. `type` compõe melhor (uniões, `Merge`, mapeados,
condicionais) e evita declaration merging acidental:

```ts
// Evitar
interface Props {
  field: IField
  disabled?: boolean
}

// Preferir
type Props = {
  field: IField
  disabled?: boolean
}
```

Única exceção: *module augmentation* (`declare module '...'`), onde o TypeScript
**exige** `interface` para o declaration merging — `type` não funciona ali. São
os `.d.ts` que aumentam libs externas (ex.: `fastify.d.ts`, `tanstack-table.d.ts`).
Não é escolha de estilo, é limite da linguagem.

## 5. Combine tipos com `Merge`, não `&`

Para juntar tipos objeto, use o utilitário `Merge<A, B>` no lugar da interseção
`A & B`. `Merge` acha as chaves (`{ [K in keyof (A & B)]: (A & B)[K] }`),
resolvendo sobreposições e mostrando o tipo final flat no editor — em vez de uma
cadeia de `&`:

```ts
// Evitar
type Props = React.ComponentProps<'div'> & { value: string }

// Preferir
type Props = Merge<React.ComponentProps<'div'>, { value: string }>
```

Três ou mais partes aninham: `Merge<Merge<A, B>, C>`. `Merge` é um utility do
projeto — procure onde ele já está definido (um módulo de tipos, um `lib/` ou
`core/`) e importe de lá. Se não existir em lugar nenhum, defina-o uma vez.

Exceção: interseção com `Array<T>` (ex.: `Array<T> & { extra }`) mantém `&` —
`Merge` mapeia as chaves e destrói a semântica de array. Uniões (`|`) não são
interseção e seguem normais.

## 6. Lookup object no lugar de cadeia de if/else

Quando você mapeia um discriminante (uma chave, um `type`, um enum) para um valor
ou um handler em **3+ casos**, use um lookup object (mapa de despacho) no lugar de
uma cadeia de `if`/`else if` ou `switch`. Declare o mapa uma vez e indexe:

```ts
// Evitar
let label
if (type === 'A') label = 'Alpha'
else if (type === 'B') label = 'Beta'
else if (type === 'C') label = 'Gamma'
else label = 'Unknown'

// Preferir
const LABELS = { A: 'Alpha', B: 'Beta', C: 'Gamma' } as const
const label = LABELS[type] ?? 'Unknown'
```

Vale para comportamento também — mapeie a chave para uma função e chame:

```ts
const HANDLERS = {
  create: handleCreate,
  update: handleUpdate,
  remove: handleRemove,
} as const
HANDLERS[action]?.(payload)
```

O mapa lê como uma tabela, adicionar caso é uma linha, e o compilador cobra as
chaves (`Record<Key, T>`). 1–2 casos mantenha `if` simples (mapa ali é exagero).
É para despacho valor/handler por chave, não para lógica booleana arbitrária
(ranges, condições combinadas) — essa fica `if`.

## 7. async/await, nunca `.then/.catch`

Nunca encadeie `.then()` / `.catch()` / `.finally()` numa promise. Sempre `await`
dentro de uma função `async`, e trate erro com `try/catch`. Lê de cima pra baixo,
sem callbacks aninhados nem contexto de erro perdido — combina com o resto do
estilo (if clássico, nada de control flow escondido):

```ts
// Evitar
function load() {
  return fetch(url).then((r) => r.json()).catch((e) => handle(e))
}

// Preferir
async function load() {
  try {
    const r = await fetch(url)
    return await r.json()
  } catch (e) {
    handle(e)
  }
}
```

O alvo é a **cadeia** `.then().catch()`, não o objeto Promise. Combinadores
seguem válidos — `await Promise.all([...])`, `await Promise.race([...])` — desde
que você faça `await` do resultado em vez de encadear `.then` nele.

## 8. `components/common/` é só o que se reusa

Um componente só mora em `components/common/` se mais de uma rota o usa.
Consumidor único mora junto de quem o consome: numa pasta ao lado da rota, ou no
próprio arquivo da rota, quando é pequeno. Em roteamento file-based (TanStack
Router, Next.js), use a convenção do projeto pra manter essa pasta fora da árvore
de rotas — no TanStack é o prefixo `-` (`-components/`).

`common/` é o lugar do que é compartilhado, não o depósito de tudo que é
componente. Quando vira depósito, ninguém sabe mais o que pode mexer sem quebrar
outra tela.

Consumidor único **não** quer dizer "importado uma vez": o que conta é quantas
rotas o alcançam. Um componente que só `resource-list` importa, mas que chega a
16 rotas por ele, é compartilhado e fica.

A regra corta nos dois sentidos. Não extraia para `common/` o que ainda tem um
consumidor só, à espera do segundo que talvez não venha — e não crie arquivo para
o que cabe onde já está. Menos peça é melhor que peça bem arrumada.

Exceção: se o projeto mantém arquivos `*-example.tsx` como fonte da verdade de um
padrão, eles ficam. Não têm importador de propósito, e o docblock deles diz isso.

## 9. Commits: conventional, atomic, semantic

**Commit proactively, as you go.** Don't wait to be asked. The moment a logical
change is complete and passing, commit it — atomically. One task usually becomes
several small commits (e.g. backend fix → frontend wiring → docs), not one fat
commit at the end. This overrides any default "only commit when asked" behavior.

Every commit follows Conventional Commits and describes one logical change.

- **Format:** `type(scope): subject` — `feat`, `fix`, `refactor`, `perf`, `chore`, `docs`.
- **Subject in the language the repo already uses** — read `git log` before writing
  the first one (e.g. `fix(sidebar): navega em pai com url e oculta chevron sem filhos`).
- **Atomic:** a commit is one complete change that builds and passes tests. Don't mix
  an unrelated feature, fix, and refactor into one commit. Split them.
- **Semantic:** the type reflects what actually changed. A bug fix is `fix`, not
  `chore`. A no-behavior reshuffle is `refactor`, not `feat`.

```
feat(table-fields): adiciona rótulo customizado aos campos nativos
fix(auth): corrige checagem de expiração do token
refactor(sidebar): extrai navegação para hook dedicado
```

## 10. Consulte a doc do projeto antes de escrever

Antes de mexer no código que usa uma biblioteca da stack, veja se o projeto tem um
índice de documentação na raiz (`CLAUDE.md`, `AGENTS.md`, `docs/`, um `_doc-*.md`).
Quando existir e for anotado, ele já traz a decisão tomada para *este* projeto —
responde a pergunta sem que você leia a doc oficial inteira.

Duas perguntas valem antes de qualquer escolha de arquitetura, tenha o projeto doc
ou não:

- **Onde o dado mora** — query cache, URL, formulário, `useState`, store. Errar a
  camada é o engano mais comum e o mais caro de desfazer.
- **Quem responde o quê na camada de UI** — o catálogo de componentes (shadcn e
  afins) e a primitiva embaixo dele (Base UI, Radix) têm APIs diferentes. Uma prop
  ausente na doc do catálogo ainda pode existir na primitiva.

Onde a doc divergir do código do repositório, **o código vence**. Doc de catálogo
frequentemente descreve um sabor de primitiva diferente do que está instalado ali
(`asChild` do Radix vs `render` do Base UI, alias `@/` vs o alias do projeto).

## Before you finish

Reread your own diff for assignment ternaries, loose `any`, `as`, `interface` in
app code, object intersections with `&` that should be `Merge`, long if/else
chains that should be a lookup object, `.then().catch()` chains that should be
`async/await`, and single-consumer components sitting in `components/common/`.
Find one, fix it. Cheaper to catch now than later.
