---
name: maiyu-backend
description: Use when creating or changing a backend endpoint, controller, use-case, validator, policy, service, model, migration, job, socket handler or API test in an AdonisJS or Fastify project of the house.
---

# Backend Maiyu

**REQUIRED:** `maiyu-padrao` (ordem de consulta). Esta skill é o roteiro da camada. Árvore,
camadas e nomes: `_padroes/arquitetura.md` — igual em todo backend; o framework só muda o adaptador
(§5).

Uma ação = uma pasta: `app/features/<módulo>/<recurso>/<ação>/{<ação>.controller.ts,
<ação>.use-case.ts, <ação>.spec.ts}`. Validator do recurso: `app/features/<módulo>/<recurso>/<recurso>.validator.ts`.

## Perfil

| Sinal no projeto | Perfil | Leia além de `backend.md` |
|---|---|---|
| `@adonisjs/core` | Adonis + Lucid | `_doc-lib/adonisjs.md`, `lucid.md` |
| `fastify-decorators` | Fastify + mongodb | `_padroes/backend-fastify.md`, `_doc-lib/fastify.md` (Encapsulation, Lifecycle) |

## Roteiro de um endpoint

| Passo | Regra | Onde |
|---|---|---|
| 1. Validator | um export por ação em `<recurso>.validator.ts`; `vine` de `#core/validator`; tipo por `Infer`; espelho em `frontend/src/validators/<módulo>/<recurso>.validator.ts` | `backend.md` §4.4, `_doc-lib/vinejs.md` |
| 2. Use-case | `Payload → Either<HTTPException, T>`, `try` global com tag `[recurso > ação][error]`, falha é `left` | §4.2 |
| 3. Escopo | `actor: User` vindo do auth, nunca do body | §4.3 |
| 4. Autorização | rota (`role()`), payload (validator), registro (`ctx.bouncer.with(Policy).authorize()` no controller, Adonis) ou policy injetada direto (Fastify, opinião da casa) | §4.6, `backend-fastify.md` |
| 5. Dados | scope `notDeleted`; duas escritas = uma transação; sem `*OrFail()` no use-case | §4.7–4.8 |
| 6. I/O externo | contrato `abstract class` + bind no composition root | `solid.md` §2 |
| 7. Controller | valida, chama, escolhe status; `throw result.value` no left | §4.1 |
| 8. Rota + OpenAPI | `openapi:generate`; código de erro literal no use-case | `_padroes/openapi.md` |
| 9. Teste | `<ação>.spec.ts` na pasta da ação; objeto real via container, nunca `new` | §7 |
| 10. Check | `pnpm check && pnpm test` | §10 |

Trabalho lento (e-mail, relatório, webhook) não roda na requisição: fila (`_doc-lib/bullmq.md`)
ou `@adonisjs/queue`.

## Erros comuns

- Nome de classe fora de `<Módulo><Recurso><Ação>UseCase` derivado do caminho (§3).
- Ação como par de arquivos solto no recurso, ou spec em `tests/` (`arquitetura.md` §3).
- Nome de arquivo snake_case (`user_policy.ts`): é kebab com sufixo (`user.policy.ts`); só migration mantém o nome gerado (§3).
- `HTTPException` embrulhado em função: some do contrato OpenAPI (§4.1).
- Unicidade por regra `unique()` do validator em vez de `left(Conflict)` no use-case (§4.4).
- Segredo com default no `env` (§6).
- Criar service/helper/regra de validator/tipo sem procurar antes: veja `core/`, `services/`,
  `_shared.*` e o code-review-graph; reuse ou estenda (`arquitetura.md` §1, princípio 9).

## Fluxo

Etapa 4 de `AGENTS.md` ("Fluxo de uma tarefa"). Antes: `maiyu-padrao` (consulta) e o plano
(`tlc-spec-driven`/`superpowers:writing-plans`). Durante: `superpowers:test-driven-development` e as
**Skills:** da lib tocada. Depois: `superpowers:verification-before-completion` →
`superpowers:requesting-code-review` → `caveman-commit`.
