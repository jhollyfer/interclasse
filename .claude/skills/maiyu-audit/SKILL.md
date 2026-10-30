---
name: maiyu-audit
description: Use when entering a house project or before a large plan, to audit it read-only against the five fundamentals of the house rule (integration tests, never trust the client, race conditions, idempotency, separation of responsibilities), or when the owner asks for an audit, a health check, "what is fragile here", duplicated orders, negative stock, double webhook effects, prices trusted from the frontend, leaked keys, or a file everyone is afraid to touch. Produces a ranked report and the fix order; changes nothing.
---

# Auditoria Maiyu: os cinco fundamentos

**REQUIRED:** `maiyu-standards` (ordem de consulta). Esta skill é só o roteiro e a ordem: a regra mora
em `_standards/`, o contrato na `_doc-lib/` e o método nas skills que a casa já usa. Nada aqui se
repete delas. Só lê e relata: nenhum arquivo muda, nenhuma migration roda, nada é instalado
(`DECISIONS.md` #242).

## Roteiro, na ordem de correção

| # | Fundamento | Regra da casa | Contrato | Skill que faz o trabalho |
|---|---|---|---|---|
| 1 | Teste de integração (trava o comportamento antes de mexer) | `backend.md` §7 (matriz, simultâneas, banco só de teste), `tooling.md` §10.1 (fase 0), `domain.md` §10 | `_doc-lib/adonisjs.md#guides/testing/api-tests`, `#guides/testing/resetting-state-between-tests`, `_doc-lib/japa.md`, `_doc-lib/vitest.md` | `superpowers:test-driven-development` (ou `tdd`), `javascript-testing-patterns` |
| 2 | Nunca confiar no cliente | `backend.md` §4.6 (policy, 404 uniforme), §5.7 (valor do cliente, segredo), `frontend.md` §3.3 (`VITE_*`) e §4 (envio duplo) | entradas citadas nessas seções | `security-audit` (modo guia, classes de ataque), `/claude-security` "Scan codebase", `security-best-practices` |
| 3 | Race condition | `backend.md` §4.11 (recurso limitado), `domain.md` §6 | `_doc-lib/lucid.md#select-query-builder`, `#transactions`, `_doc-lib/mongodb.md#crud/compound-operations` | `maiyu-backend` (passo 5b) |
| 4 | Idempotência | `backend.md` §4.11 (claim atômico, inbox de webhook, `Idempotency-Key`), §5.3 (chave de saída), §4.12 (job) | `_doc-lib/mongodb.md#crud/compound-operations` | `maiyu-backend` |
| 5 | Separação de responsabilidades | `architecture.md` (árvore e camadas), `domain.md` §10 (refatoração), `backend.md` §11.1 | — | `safe-refactor`, `legacy-migration-planner`, `codebase-design` |

A ordem é a da correção: o teste trava o comportamento, o cliente é a porta aberta, corrida e
idempotência são dinheiro, e a separação vem por último, já protegida pelos testes.

## Entrega

- Relatório na resposta ao dono: uma tabela por etapa (achado, risco alto/médio/baixo,
  `arquivo:linha`, regra violada, correção) e os cinco achados de maior risco no topo. O que não deu
  para verificar sai como "não verificado: <motivo>".
- Cada achado vira linha em `docs/TASKS.md`; o de segurança também em `docs/SECURITY.md`
  (`documentation.md` §1, conjunto fechado: sem `AUDITORIA.md`).
- Termina dizendo qual etapa corrigir primeiro e por quê.

As regras de execução (branch, migration revisada, teste intocável, banco só de teste) são as de
`AGENTS.md` e `tooling.md` §10; esta skill não as repete.

Próxima etapa: plano de correção (`superpowers:writing-plans`), abrindo pela fase 0 de testes.
