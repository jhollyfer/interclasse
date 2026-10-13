---
name: maiyu-padrao
description: Use when about to write, change, review or decide anything in a TypeScript project of the house (AdonisJS or Fastify backend, TanStack Start frontend) — new endpoint, screen, form, service, refactor, library choice — including under time pressure or when the change looks small.
---

# Padrão Maiyu

## Visão geral

Os padrões da casa já decidiram quase tudo. Código que ignora o padrão parece certo, compila e
volta na revisão. **Consultar antes de escrever é a tarefa, não preparação para ela.**

Autoridade: doc oficial (`_doc-lib`) > `_padroes/` > código. O padrão aplica a doc, nunca a
contradiz.

Economia de tokens, sempre (regra completa em `AGENTS.md`): resposta em `caveman`, escada do
`ponytail` antes de codar, shell com saída grande via `rtk`, análise de dado no `context-mode`,
navegação de código pelo `code-review-graph`. Skills de processo (superpowers, tlc, humanizer,
impeccable) disparam no momento delas — tabela "Por momento" do `SKILLS-MAP.md`.

## Ordem de consulta (sempre, nesta ordem)

1. `_padroes/` da camada — `arquitetura.md` (árvore, camadas, nomes), `typescript.md` e `solid.md`
   sempre; `backend.md` (+ `backend-fastify.md`), `frontend.md`, `tooling.md`, `openapi.md`
   conforme a tarefa. O projeto recebe `_padroes/` por `scripts/sync-to-project.mjs`.
2. `_doc-lib.md` → `_doc-lib/<lib>.md` → **só a entrada** (`grep -n '^#### '`, depois `sed -n`).
   Em seguida, dispare as skills da lib (`SKILLS-MAP.md`, "Por biblioteca"). A skill executa; a
   entrada da doc continua sendo o contrato. Só a mais direcionada e necessária — nunca várias
   "por garantia".
3. Tipo instalado ou `npm pack <pkg>@latest`.
4. Código vizinho — como **exemplo de forma**, nunca como autoridade.

Não achou? Diga "não coberto pelo padrão" e decida pelo critério de `_padroes/`.

## Red flags — pare e volte ao passo 1

| Pensamento | Realidade |
|---|---|
| "Copio o arquivo irmão e pronto" | O irmão pode estar fora do padrão. O padrão manda, não o vizinho |
| "Escrevo rápido, depois vejo se já existe" | Procure antes (code-review-graph, `rtk grep`, `core/`, `common/`, `lib/`). Existe parecido: reutilize ou estenda. Duplicar é proibido |
| "O código vizinho já mostra o uso, pulo a `_doc-lib`" | Abra a entrada de cada API que você toca (scope, `swap`, `transaction`…). É o contrato; o vizinho é só exemplo |
| "É urgente, depois arrumo" | Arrumar depois custa mais que ler a seção agora (2 min) |
| "`userId` no payload resolve" | Escopo de sessão é `actor: User` (`backend.md` §4.3) |
| "`whereNull('deletedAt')` rapidinho" | Scope `notDeleted` no model (§4.8) |
| "`auth.user!`" | `auth.getUserOrFail()`; `!` é asserção disfarçada |
| "Importo o service de mail direto" | I/O externo entra por contrato `abstract class` (`solid.md` §2) |
| "`.catch()` no fire-and-forget" | `async/await`; trabalho fora da requisição vai para fila |
| "`as Foo` só aqui" | `satisfies` ou tipo na origem (`typescript.md` §1) |
| "Teste depois" | Spec funcional nasce com o endpoint (§7) |
| "Dependência não existe, instalo qualquer uma" | Escolha pela `_doc-lib`; versão mais recente |

## Onde esta skill entra no fluxo

É a etapa 2 do fluxo (`AGENTS.md`, "Fluxo de uma tarefa"): depois de entender
(`superpowers:brainstorming` ou `tlc-spec-driven`), antes de planejar e construir. Daqui segue para
`maiyu-backend`/`maiyu-frontend` com `superpowers:test-driven-development`, e termina em
`superpowers:verification-before-completion` → revisão → `caveman-commit`.

## Depois de escrever

Releia o diff contra a skill `code-pattern` e a seção usada. Cite no resumo qual seção do padrão
guiou cada decisão (`backend.md §4.2`), para o revisor conferir.

Skills de camada: `maiyu-backend`, `maiyu-frontend`. Mapa geral: `SKILLS-MAP.md`.
