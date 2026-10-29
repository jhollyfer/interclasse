---
name: maiyu-standards
description: Use when about to write, change, review or decide anything in a TypeScript project of the house (AdonisJS or Fastify backend, TanStack Start frontend, shared package) — new endpoint, screen, form, service, entity, repository, refactor, library choice — including under time pressure or when the change looks small.
---

# Padrão Maiyu

## Visão geral

A régua já decidiu quase tudo. Código que a ignora parece certo, compila e volta na revisão.
**Consultar antes de escrever é a tarefa, não preparação para ela.**

Autoridade: doc oficial (`_doc-lib/` + a página do link) > `_standards/` > tipo instalado > código.
O padrão aplica a doc, nunca a contradiz; conflito entre os dois vai para `_standards/DECISIONS.md`.

Economia de tokens, sempre (`AGENTS.md`, "Economia de tokens"): `caveman`, `ponytail`, `rtk`,
`context-mode`, `code-review-graph`. Skills de processo disparam no momento delas (`SKILLS-MAP.md`,
"Por momento").

## Ordem de consulta (sempre, nesta ordem)

1. **`_standards/` da camada.** Sempre `architecture.md` (árvore fechada, camadas, nomes, `shared/`,
   contrato de endpoint), `typescript.md` e `solid.md`. Backend: `domain.md` + `backend.md`
   (+ `backend-fastify.md`). Frontend: `frontend.md`. Conforme a tarefa: `i18n.md`, `openapi.md`,
   `tooling.md`, `documentation.md`. Antes de reabrir uma escolha, `DECISIONS.md`.
   No projeto, antes de tudo: `docs/MEMORY.md` e `docs/TASKS.md`, e o resto de `docs/` pela tabela de
   `documentation.md` §4. Bugs já levantados do projeto: `_findings/<projeto>.md` (upstream).
2. **Doc da lib.** `_doc-lib.md` → `_doc-lib/<lib>.md` → **só a entrada** (`grep -n '^#### '`, depois
   `sed -n`) → **abrir o link oficial** (`[markdown]` cru; sem ele, `[doc]` via `ctx_fetch_and_index`)
   e decidir pela seção que responde. A entrada é índice; a página é o contrato (`DECISIONS.md` #114).
   Página inacessível: diga "página oficial não conferida" ao lado da decisão. Depois, a skill da lib
   (`SKILLS-MAP.md`, "Por biblioteca"): só a mais direcionada.
3. **Tipo instalado** (`node_modules/<pkg>/**/*.d.ts`) ou `npm pack <pkg>@latest`.
4. **Código vizinho**, como exemplo de forma, nunca como autoridade. Contradiz 1–3: está errado e
   vira migração (`MIGRATIONS.md`), não modelo.

Não achou? Diga "não coberto pelo padrão" e decida pelo critério de `_standards/`, marcando
*(opinião da casa)*.

## Red flags — pare e volte ao passo 1

| Pensamento | Realidade |
|---|---|
| "Copio o arquivo irmão e pronto" | O irmão pode estar fora da régua. A árvore e os nomes estão em `architecture.md` §3–§4 |
| "Escrevo rápido, depois vejo se já existe" | Procure antes (`code-review-graph`, `rtk grep`, `shared/`, `domain/`, `core/`, `common/`, `lib/`). Duplicar é proibido (`architecture.md` §1, princípio 10) |
| "Li o resumo da entrada, não preciso abrir a página" | O resumo é índice. Abra o link oficial |
| "Uso o model direto no use-case" | Use-case conhece só o contrato do repository (`domain.md` §5, `architecture.md` §2) |
| "A regra cabe num `if` no use-case" | Regra de negócio mora na entidade (`domain.md` §1, §7) |
| "Monto a resposta no use-case com spread do model" | Presenter do recurso, tipo de `shared/src/responses/` (`architecture.md` §10) |
| "Escrevo o tipo da resposta no front" | Contrato de endpoint vem de `@<projeto>/shared` (`architecture.md` §10) |
| "Copio o validator para o front" | Um validator só, em `shared/src/validators/` (`architecture.md` §9) |
| "`userId` no payload resolve" | `actor: Actor`, tipado por `ActorSchema` e montado pelo middleware (`backend.md` §4.3) |
| "`auth.user!`" | O `actor` chega validado; `!` é asserção disfarçada (`typescript.md` §1) |
| "`typeof value === 'string'` resolve aqui" | Tipo se resolve na fronteira; dentro da função é contrato quebrado (`typescript.md` §2.1) |
| "Importo o client do provedor direto" | I/O externo por `services/<nome>/<nome>.contract.ts` (`solid.md` §2) |
| "Texto em pt-BR no componente, depois traduz" | Chave i18n nos três idiomas desde já (`i18n.md`) |
| "Nome em português fica mais claro" | Código em inglês; Markdown em pt-BR (`typescript.md` §12) |
| "`.catch()` no fire-and-forget" | `async/await`; trabalho fora da requisição vai para fila |
| "`as Foo` só aqui" | `satisfies` ou tipo na origem (`typescript.md` §1) |
| "Teste depois" | TDD: `<x>.unit.spec.ts` e `<x>.e2e.spec.ts` nascem com o código (`architecture.md` §8, `domain.md` §10) |
| "Dependência não existe, instalo qualquer uma" | Escolha pela `_doc-lib`; última versão (TypeScript fica na 6.x, `tooling.md` §0) |

## Onde esta skill entra no fluxo

Etapa 2 (`AGENTS.md`, "Fluxo de uma tarefa"): depois de entender (`superpowers:brainstorming` ou
`tlc-spec-driven`), antes de planejar e construir. Segue para `maiyu-backend`/`maiyu-frontend` com
`superpowers:test-driven-development`; formulário e modal passam por `dialog-pattern`/`sheet-pattern`;
termina em `superpowers:verification-before-completion` → revisão → `caveman-commit`.

## Depois de escrever

`docs/` do projeto no mesmo commit (`documentation.md` §5). Releia o diff contra `code-pattern`.
Cite no resumo e no commit a seção e a página que guiaram cada decisão (`backend.md` §4.2,
`_doc-lib/lucid.md#transactions` + URL), para o revisor conferir.

Skills de camada: `maiyu-backend`, `maiyu-frontend`; docs do projeto: `maiyu-docs`. Mapa geral:
`SKILLS-MAP.md`.
