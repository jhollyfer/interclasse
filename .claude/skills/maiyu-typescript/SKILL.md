---
name: maiyu-typescript
description: Use when typing or reviewing TypeScript in any file of a house project (backend, frontend or shared package), such as typing a payload, an API response, a state with variants, an enum, a lookup table, a generic or a derived type, fixing a type error, feeling the urge to write any, an as cast, a non-null bang, an interface or a ts-ignore, or touching tsconfig or the TypeScript version. Not for commit rules or plain code style (code-pattern) and not for Node runtime APIs (maiyu-node).
---

# TypeScript Maiyu

**REQUIRED:** `maiyu-standards` (ordem de consulta). Esta skill é o roteiro do sistema de tipos;
as regras estão nas seções citadas e não se repetem aqui. Fonte: `_standards/typescript.md`
(o tipo e onde ele nasce), `_standards/tooling.md` §3 (tsconfig) e §4 (lint), `_standards/backend.md`
§2 (as regras de escrita que o lint cobra). Contrato: `_doc-lib/typescript.md`; abra o **link
oficial** da entrada antes de decidir (`AGENTS.md`, etapa 2).

Vale para backend, frontend e `shared/`, com a mesma régua nos três (`typescript.md`, abertura).

## Relação com `code-pattern`

`code-pattern` é a fonte única da **forma** (sem ternário, sem `any`, sem `as`, `type` e não
`interface`, `Merge`, lookup, `async/await`) e do commit. Esta skill cobre o que vem **depois**:
de onde o tipo vem, onde ele estreita e como uma variante vira tipo. Ao escrever código, use as
duas; quando a dúvida for "posso escrever isto?", é `code-pattern`; quando for "de onde vem este
tipo?", é aqui.

## Roteiro: de onde vem o tipo (decida antes de escrever)

| O tipo de | Nasce em | Regra | Doc (`_doc-lib/typescript.md#…`) |
|---|---|---|---|
| payload de requisição | `z.infer<typeof <Módulo><Recurso><Ação>Validator>` em `shared/src/validators/` (no backend Adonis, `Infer` do VineJS) | `typescript.md` §2, `backend.md` §4.4, `DECISIONS.md` #241 | `_doc-lib/zod.md#basics`; Adonis: `_doc-lib/vinejs.md#getting_started` |
| resposta da API | `Infer` do schema `…Response` de `shared/src/responses/`; no frontend só pelo `http.ts` | `typescript.md` §2, `architecture.md` §10 | `docs/handbook/2/typeof-types` |
| dado de fora (`localStorage`, socket, job, terceiro, ENV) | `unknown`, convertido por schema **na fronteira**, uma vez | `typescript.md` §2, §2.1 | `docs/handbook/2/narrowing` |
| estado com variantes | união discriminada + `switch` exaustivo com `never` | `typescript.md` §3 | `docs/handbook/2/narrowing` |
| enum | objeto `as const` + a trinca `POST_STATUS`/`PostStatus`/`POST_STATUSES` em `shared/src/enums/` | `typescript.md` §4 | `docs/handbook/enums`, `docs/handbook/2/keyof-types` |
| valor por discriminante | lookup `satisfies Record<União, V>`, sem `??` de fallback | `typescript.md` §3, `backend.md` §2 (item 7), `code-pattern` §6 | `docs/handbook/2/indexed-access-types` |
| falha esperada | `Either` de `shared/src/either.ts` (`left`/`right`) | `typescript.md` §5, `backend.md` §4.2, `domain.md` §2 | não coberto pela doc (opinião da casa) |
| objeto que combina outros | `Merge<A, B>`; `&` só com `Array<T>` ou para preservar união | `typescript.md` §8 | `docs/handbook/2/everyday-types` |
| objeto literal de configuração | `satisfies Config`, nunca `as Config` | `typescript.md` §1 | `docs/handbook/jsdoc-supported-types` (`@satisfies`; o Handbook não cobre o operador) |
| derivado de outro tipo | utilitário nativo, tipo mapeado, condicional, template literal | `typescript.md` §8, §11 | `docs/handbook/utility-types`, `2/mapped-types`, `2/conditional-types`, `2/template-literal-types` |
| genérico | parâmetro inferido do argumento certo; `NoInfer<T>` no que não deve inferir | `typescript.md` §11 | `docs/handbook/2/generics` |
| elemento do DOM | tipo na origem (`useRef<T>`, `event.currentTarget`); `instanceof` só na fronteira | `typescript.md` §1, §2.1 | `docs/handbook/dom-manipulation` |
| id de entidade | marca nascida em type guard | `typescript.md` §11 | não coberto pela doc (opinião da casa) |
| import só de tipo | `import type` (`verbatimModuleSyntax`) | `typescript.md` §9, `tooling.md` §3 | `docs/handbook/2/modules`, `docs/handbook/modules/theory` |
| dado parcial em teste | `fromPartial()` do shoehorn, só em spec | `typescript.md` §1 | skill `migrate-to-shoehorn` |

Tipo que só o autor entende se quebra em tipos nomeados (`typescript.md` §8).

```ts
// shared/src/validators/administrator/posts.validator.ts: the type comes from the schema
export type AdministratorPostArchivePayload = Infer<typeof AdministratorPostArchiveValidator>

// closed key set: every PostStatus has a tone, no fallback
const STATUS_TONE = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'muted',
} satisfies Record<PostStatus, BadgeTone>

const tone = STATUS_TONE[post.status]
```

## Compilador e lint

- **tsconfig**: o piso de `tooling.md` §3, somado ao preset do perfil (Adonis, Fastify, frontend,
  `shared/`), nunca afrouxado. Flag removida no 6.x (`baseUrl`, `moduleResolution: "node"`) não
  entra. Doc: `_doc-lib/typescript.md#tsconfig`.
- **Versão**: a última **6.x**, instalada com `pnpm add -D typescript@~6`. O `latest` do npm é o 7,
  que a casa ainda não adota (`tooling.md` §0 e §3, `DECISIONS.md` #121,
  `_doc-lib/typescript.md#download`, `#typescript/announcing-typescript-7-0`).
- **Lint**: as regras de tipo do bloco comum estão em `tooling.md` §4.1 (`no-explicit-any`,
  `consistent-type-assertions` com `never`, `no-non-null-assertion`, `consistent-type-definitions`,
  `consistent-type-imports`, `no-floating-promises`, `no-misused-promises`). Doc das regras:
  `_doc-lib/eslint.md`.
- **Supressão**: `// @ts-expect-error <motivo>`, nunca `@ts-ignore`; cast de fronteira real leva
  `eslint-disable-next-line` com a justificativa em inglês e o nome do pacote (`typescript.md` §1).

## Red flags: pare e volte ao roteiro

| Pensamento | Realidade |
|---|---|
| "Escrevo o `type` do payload ao lado do validator" | Dois lugares para o mesmo formato divergem. `Infer` (`typescript.md` §2) |
| "`request<User>()` resolve o tipo da resposta" | É o `as` com outro nome. Schema `…Response` no `http.ts` (`typescript.md` §2) |
| "`typeof x === 'string'` aqui dentro" | Tipo se resolve na fronteira, uma vez (`typescript.md` §2.1) |
| "Parâmetro `unknown` serve para vários casos" | Cada caso é um tipo; vários são união discriminada (`typescript.md` §2.1, §3) |
| "Dois booleanos, `isLoading` e `isError`" | Podem ser `true` juntos. União discriminada (`typescript.md` §3) |
| "`default: return ''` no `switch`" | Esconde a variante nova. `const unreachable: never = state` (`typescript.md` §3) |
| "`enum` do TypeScript é mais curto" | Objeto `as const` e a trinca (`typescript.md` §4) |
| "`STATUS[x] ?? 'neutral'`" | Chave de união fechada não tem fallback; falta de chave é erro de compilação (`code-pattern` §6) |
| "`throw new NotFound()` no use-case" | Falha esperada é `left` (`typescript.md` §5) |
| "`A & B` para somar props" | `Merge`; `&` só nas duas exceções (`typescript.md` §8) |
| "`user!.id`, já sei que existe" | Guard no topo da função (`typescript.md` §1) |
| "`@ts-ignore` até a lib corrigir" | `@ts-expect-error <motivo>` (`typescript.md` §1) |
| "Desligo `noUncheckedIndexedAccess`, é barulho" | O piso não afrouxa (`tooling.md` §3) |
| "Instalo `typescript` sem faixa" | Vem o 7. `typescript@~6` (`tooling.md` §3) |
| "Escrevo um utilitário de tipo da casa" | Nativo primeiro; `Merge` é o único da casa (`typescript.md` §8) |

## Fluxo

Etapas 2 e 4 de `AGENTS.md` ("Fluxo de uma tarefa"). Antes: `maiyu-standards`. Durante:
`maiyu-backend`, `maiyu-frontend` ou `maiyu-node` conforme a camada, com `code-pattern` para a
forma e `superpowers:test-driven-development`. Depois: `pnpm check` (typecheck e lint) dentro de
`superpowers:verification-before-completion` → `superpowers:requesting-code-review` →
`caveman-commit` (regras de commit em `code-pattern` §9).
