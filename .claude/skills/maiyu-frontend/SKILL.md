---
name: maiyu-frontend
description: Use when creating or changing a route, page, data query, mutation, form, masked field, table, rich-text editor or UI component in a TanStack Start + shadcn frontend of the house.
---

# Frontend Maiyu

**REQUIRED:** `maiyu-padrao` (ordem de consulta). Regras completas em `_padroes/frontend.md`;
árvore de `src/` e paridade com o backend em `_padroes/arquitetura.md` §4.

## Onde o dado mora — decida antes de codar

| O dado | Lugar | Doc |
|---|---|---|
| vem da API | TanStack Query | `_doc-lib/tanstack-query.md` (important-defaults, query-keys) |
| compartilhável por link / sobrevive ao F5 | search params | `_doc-lib/tanstack-router.md` (search-params) |
| sendo digitado | React Hook Form | `_doc-lib/react-hook-form.md` |
| de um componente só | `useState` | — |
| global de cliente, fora da URL | TanStack Store | `_doc-lib/tanstack-store.md` |

## Roteiro por tarefa

| Tarefa | Regra | Doc |
|---|---|---|
| Rota | arquivo em `routes/`, componentes da rota em `-components/`, `index.lazy.tsx` para o pesado | `frontend.md`, `tanstack-router.md` |
| Query/mutation | key pela factory central `_query-keys.ts` (seção por módulo), invalidação explícita na mutation, retry só 5xx/rede | `frontend.md` §2.1, `tanstack-query.md` |
| Formulário | `vineResolver` com o validator de `src/validators/<módulo>/<recurso>.validator.ts` (mesmo caminho lógico e export do backend), erro 422 do servidor via `setError` | `vinejs.md`, `react-hook-form.md` |
| Máscara | `use-mask-input`; o `.parse()` do validator tira a máscara | `_doc-lib.md` "Onde a máscara mora" |
| Componente | shadcn em `components/ui/`; comportamento e props pelo Base UI (`render`, não `asChild`) | `shadcn.md`, `base-ui.md` |
| Componente da casa | **compound** na forma do shadcn: pasta `components/common/<nome>/`, cada parte um named export (`UserCard`, `UserCardHeader`) reexportado no `index.ts`, `data-slot` em toda parte, estado no contexto, hook de contexto recebe o nome do consumidor; estrutura é JSX, nunca `showX`. Antes, veja o kit comum (§8). Skills `compound-pattern`, `react-composition-patterns` | `frontend.md` §6.1, §8, `shadcn.md`, `base-ui.md` |
| Tabela | TanStack Table v9, features opt-in | `tanstack-table.md` |
| Estilo | tokens do tema, Tailwind v4 em CSS | `tailwindcss.md` |
| Design/UX | skills `impeccable`, `frontend-design` | `SKILLS-MAP.md` |

## Erros comuns

- Espelhar cada tecla em `useState`/store: volta o re-render que o RHF evita.
- Importar `@vinejs/vine` direto: perde `convertEmptyStringsToNull` e o provider pt-BR.
- Comparar `message` do erro da API em vez de `code`.
- Ternário em JSX: um short-circuit por caso (`code-pattern`).
- Criar hook/componente/helper sem procurar antes: veja `components/common/`, `lib/`, `hooks/`
  e o code-review-graph; reuse ou estenda (`arquitetura.md` §1, princípio 9).

## Fluxo

Etapa 4 de `AGENTS.md` ("Fluxo de uma tarefa"). Antes: `maiyu-padrao` (consulta) e o plano
(`tlc-spec-driven`/`superpowers:writing-plans`). Durante: `superpowers:test-driven-development` e as
**Skills:** da lib tocada. Depois: `superpowers:verification-before-completion` →
`superpowers:requesting-code-review` → `caveman-commit`.
