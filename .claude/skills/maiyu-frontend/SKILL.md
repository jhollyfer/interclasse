---
name: maiyu-frontend
description: Use when creating or changing a route, page, loader, data query, mutation, form, dialog or sheet, masked field, table, rich-text editor, i18n message or UI component in a TanStack Start + shadcn (Base UI) frontend of the house.
---

# Frontend Maiyu

**REQUIRED:** `maiyu-standards` (ordem de consulta). Cada `_doc-lib/<lib>.md` citado abaixo é contrato: abra o **link oficial** da entrada antes de escrever, não só o resumo (`AGENTS.md`, etapa 2). Esta skill é o roteiro; as regras estão nas
seções citadas e não se repetem aqui. Árvore de `src/`: `_standards/architecture.md` §4. Regras de
cada pasta: `_standards/frontend.md`. Texto: `_standards/i18n.md`. Contrato com a API:
`architecture.md` §10.

Validators, enums, value objects e tipos de resposta **não existem no frontend**: vêm de
`@<projeto>/shared` (`architecture.md` §9). `src/validators/`, `lib/validator.ts`, `lib/interfaces.ts`
e `lib/utils.ts` são desvio e migram.

## Onde o dado mora — decida antes de codar

| O dado | Lugar | Regra / doc |
|---|---|---|
| vem da API | TanStack Query, `queryOptions` da fábrica do módulo | `frontend.md` §2.1, `_doc-lib/tanstack-query.md` (`guides/query-options`, `guides/query-keys`) |
| compartilhável por link / sobrevive ao F5 (filtro, página, ordem, aba) | search params validados no `-search.ts` da rota | `frontend.md` §2, `_doc-lib/tanstack-router.md` (search params) |
| sendo digitado | React Hook Form | `frontend.md` §4, `_doc-lib/react-hook-form.md` |
| derivável de outro | expressão no render, nunca `useState` + `useEffect` | `frontend.md` §2 |
| de um componente só | `useState` | — |
| de cliente que cruza telas | `lib/local-store.ts` (chave versionada, leitura validada) | `frontend.md` §2 |

## Roteiro por tarefa

| Tarefa | O que | Onde está a regra |
|---|---|---|
| Rota | inglês e kebab (`/administrator/teams/$id/edit`); `index.tsx` + `index.lazy.tsx`, `new.lazy.tsx`, `$id/{index,edit}`; `-search.ts`; `-components/` no molde fixo (`table`, `columns`, `filters`, `row-actions`, `form-fields`, `form-create`, `form-edit`…) | `architecture.md` §4, `frontend.md` §1 |
| Guard e SSR por grupo | `_private/layout.tsx` é o portão de sessão e declara o modo de SSR do grupo (`ssr: 'data-only'` no privado, SSR completo no público) *(opinião da casa)*; capacidade da área em `<área>/layout.tsx`; `_authentication/` com guard inverso | `frontend.md` §1, §3; `_doc-lib/tanstack-start.md#guide/selective-ssr` |
| Loader | `queryClient.query(options)` em paralelo (`Promise.all`), sem waterfall pai → filho; componente lê com `useSuspenseQuery`; registro ausente é `notFound()` | `frontend.md` §2.1, §5 |
| Query / mutation | chaves em `hooks/tanstack-query/_query-keys.ts`; `queries/<módulo>.ts` e `mutations/<módulo>.ts`; `onSuccess` devolve a promessa da invalidação; escrita por `mutate` com callbacks; retry de query só 5xx/rede | `frontend.md` §2.1, `_doc-lib/tanstack-query.md#guides/mutations`, `#guides/invalidations-from-mutations` |
| Resposta da API | tipo do `shared/src/responses/`, convertido num ponto só (`integrations/tanstack-query/http.ts`); UI compara `code`, nunca `message` | `architecture.md` §10, `typescript.md` §2, §5 |
| Formulário | `zodResolver(<Módulo><Recurso><Ação>Validator)` (`@hookform/resolvers/zod`) de `@<projeto>/shared`, tipo por `z.infer`; `useResourceForm`; `form-fields.tsx` + cascas `form-create`/`form-edit`; erro por `applyHTTPErrorToForm`; retry em 409 e 5xx/rede; `AppField` + `invalidProps`/`errorId` | `frontend.md` §4, `_doc-lib/react-hook-form.md`, `DECISIONS.md` #113 (C16), #241; `_doc-lib/zod.md#basics` |
| Dialog / Sheet | skill `dialog-pattern` / `sheet-pattern` (uncontrolled, `createHandle` sem gatilho visível, `ConfirmDialog` no destrutivo) | `_doc-lib/base-ui.md#react/components/dialog` |
| Máscara | `use-mask-input`; o valor sem máscara sai por `.parse()` | `frontend.md` §4, `_doc-lib/use-mask-input.md` |
| Componente | shadcn em `components/ui/` (só variante `cva` e rótulo, marcados `// casa:`); comportamento pelo Base UI (`render`, não `asChild`) | `frontend.md` §6, `_doc-lib/shadcn.md`, `base-ui.md` |
| Componente da casa | compound em `components/common/<peça>/` (named export por parte, `data-slot`, contexto por `use()` via hook nomeado, `index.ts` da peça); só com 2+ rotas, senão `-components/`; veja antes o kit comum | `frontend.md` §6.1, §8; skills `compound-pattern`, `react-composition-patterns` |
| Texto | `m.*()` do Paraglide nos três idiomas; rótulo de enum em `lib/labels.ts` como função; data, número e moeda por `Intl`; `aria-label` também por chave | `i18n.md` §2 |
| Tabela | TanStack Table, features opt-in, kit `common/table/` | `frontend.md` §8, `_doc-lib/tanstack-table.md` |
| Estilo | tokens do tema, Tailwind v4 em CSS, `cn()` de `lib/cn.ts` | `frontend.md` §6, `_doc-lib/tailwindcss.md` |
| Teste | `<x>.test.ts(x)` Vitest + Testing Library por papel e nome acessível; fluxo crítico em `e2e/<fluxo>.spec.ts` (Playwright); `data-testid` só sem papel estável | `architecture.md` §8 |
| Design/UX | skills `impeccable`, `design-taste-frontend`; acessibilidade `web-accessibility` | `SKILLS-MAP.md` |

## Erros comuns

- Botão de enviar sem `isSubmitting`, ou tratado como proteção contra envio duplo; preço,
  desconto ou permissão calculado no front e mandado para o servidor confiar (`frontend.md` §4).

- Validator, enum ou tipo de resposta redigitado no front, ou `@vinejs/vine` importado (frontend é Zod, `DECISIONS.md` #241).
- `useEffect` que deriva estado, sincroniza para cima ou abre dialog por `ref.click()`.
- Componente declarado dentro de outro componente; HOC ou container no lugar de hook.
- `ensureQueryData`/`prefetchQuery` ou `queryKey` solto em vez da fábrica e de `queryClient.query()`.
- `mutateAsync` solto, `.then/.catch`, `void` na promessa.
- Texto literal em pt-BR no JSX, toast ou `aria-label`; rota ou identificador em português.
- Comparar `message` do erro da API em vez de `code`.
- Ternário em JSX ou `className`; `{count && …}` com número (`code-pattern` §1).
- `typeof`/`Array.isArray` em hook ou componente para descobrir o que chegou (`typescript.md` §2.1).
- Filtro em `useState` em vez da URL.
- Criar hook, componente ou helper sem procurar antes em `components/common/`, `hooks/`, `lib/` e
  `shared/` (`architecture.md` §1, princípio 10).

## Fluxo

Etapa 4 de `AGENTS.md` ("Fluxo de uma tarefa"). Antes: `maiyu-standards` e o plano
(`tlc-spec-driven`/`superpowers:writing-plans`). Durante: `superpowers:test-driven-development` e as
skills da lib tocada (`SKILLS-MAP.md`, "Por biblioteca"). Depois:
`superpowers:verification-before-completion` (com navegador para UI) →
`superpowers:requesting-code-review` → `caveman-commit` (regras em `code-pattern` §9).
