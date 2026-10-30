---
name: maiyu-backend
description: Use when creating or changing a backend endpoint, controller, use-case, domain entity, value object, repository, presenter, validator or response contract in shared/, policy, service, model, migration, job, socket handler or API test in an AdonisJS or Fastify project of the house.
---

# Backend Maiyu

**REQUIRED:** `maiyu-standards` (ordem de consulta). Cada `_doc-lib/<lib>.md` citado abaixo é contrato: abra o **link oficial** da entrada antes de escrever, não só o resumo (`AGENTS.md`, etapa 2). Esta skill é o roteiro; as regras estão nas
seções citadas e não se repetem aqui. Árvore, camadas, nomes e contrato de endpoint:
`_standards/architecture.md` §2, §3, §9, §10. Forma de cada peça de domínio e persistência:
`_standards/domain.md`. Mecânica do framework: `_standards/backend.md` (+ `backend-fastify.md`).

Uma ação = uma pasta, sempre três níveis: `app/features/<módulo>/<recurso>/<ação>/{<ação>.controller.ts,
<ação>.use-case.ts, <ação>.unit.spec.ts, <ação>.e2e.spec.ts}`. Sem `.service.ts` na ação. Validator e
schema de resposta moram em `shared/` (`architecture.md` §9).

## Perfil

| Sinal no projeto | Perfil | Leia além de `backend.md` |
|---|---|---|
| `@adonisjs/core` | Adonis + Lucid; repository `.lucid.repository.ts`; Japa (`unit`/`functional`) | `architecture.md` §3.2, `_doc-lib/adonisjs.md`, `lucid.md` |
| `fastify-decorators` | Fastify + driver `mongodb`; repository `.mongo.repository.ts`; Vitest (`unit`/`e2e`) | `architecture.md` §3.3, `backend-fastify.md`, `_doc-lib/fastify.md`, `mongodb.md` |

## Schema por perfil (`DECISIONS.md` #241)

| Perfil | Request e response | Doc |
|---|---|---|
| Adonis | backend valida com **VineJS** (nativo do framework); o Zod de `shared/` serve o frontend, com par de caminho e nome e spec de paridade VineJS × Zod | `_doc-lib/vinejs.md`, `_doc-lib/zod.md#basics` |
| Fastify | **Zod** nos dois lados, o mesmo schema de `shared/`; rota por `fastify-type-provider-zod`; `start/env.ts` por `safeParse`; resposta do OpenAPI por `z.toJSONSchema` | `_doc-lib/zod.md#api`, `#json-schema`, `_doc-lib/fastify-plugins.md#fastify-type-provider-zod` |

## Roteiro de um endpoint (TDD: teste antes de cada peça)

| Passo | O que | Onde está a regra |
|---|---|---|
| 1. Contrato | request `<Módulo><Recurso><Ação>Validator` + `Payload` por `Infer`; response `<Módulo><Recurso><Ação>Response`; enums e value objects puros | `shared/src/{validators,responses,enums,value-objects}/` · `architecture.md` §9–§10, `backend.md` §4.4; schema por perfil abaixo |
| 2. Domínio | entidade rica (verbo do negócio, transição por tabela), value object, fatos sem HTTP; `<entidade>.unit.spec.ts` primeiro | `app/domain/<entidade>/` · `domain.md` §1–§4 |
| 3. Persistência | contrato `abstract class` por intenção, implementação Lucid/Mongo com mapper, memória, teste de contrato nas duas; soft delete dentro da implementação | `app/repositories/<entidade>/` · `domain.md` §5, `backend.md` §4.7–§4.8 |
| 4. Use-case | `Payload` com `actor` → `Either<HTTPException, <…>Response>`; carrega pelo repository, chama a entidade, grava, traduz fato pela tabela (`_shared.<recurso>-refusal.ts`), monta pelo presenter; `try` global com tag e código de 500 derivados do caminho | `domain.md` §2, §7; `backend.md` §4.2; `architecture.md` §3 |
| 5. Transação | duas escritas, uma unidade de trabalho | `domain.md` §6 |
| 5b. Recurso limitado | estoque, cupom, saldo, vaga, agenda: índice único, escrita condicional com linhas afetadas ou `forUpdate()`; nunca Redis ou lock em memória; rota de pedido e pagamento com `Idempotency-Key` | `backend.md` §4.11; `_doc-lib/lucid.md#select-query-builder`, `_doc-lib/mongodb.md#crud/compound-operations` |
| 6. `actor` | `Actor = Infer<typeof ActorSchema>` de `shared/`, montado pelo middleware de auth; nunca do body, nunca o model | `backend.md` §4.3 |
| 7. Autorização | rota (papel), payload (validator), registro (policy `(actor, target)`); 404 uniforme quando a existência é segredo | `backend.md` §4.6 |
| 8. I/O externo | `services/<nome>/{<nome>.contract.ts, <nome>.service.ts, <nome>.fake.ts}`, ligado no provider/registry | `solid.md` §2, `architecture.md` §3 |
| 9. Presenter | entidade → response do `shared/`, um método por forma | `<recurso>.presenter.ts` · `architecture.md` §10 |
| 10. Controller | valida (body + params), repassa o `actor`, escolhe o status; `throw result.value` no left | `backend.md` §4.1 |
| 11. Texto | mensagem por chave nos três idiomas (`t()`), `code` literal e nunca traduzido | `i18n.md` §3 |
| 12. Rota + OpenAPI | `openapi:generate`; registro de resposta aponta o schema de `shared/` | `openapi.md` |
| 13. Testes | `<ação>.unit.spec.ts` (use-case com repository em memória e `.fake.ts`; `new` permitido aqui) e `<ação>.e2e.spec.ts` (rota real: sucesso, 401, 403, 404, 409, 422 e "não gravou" após 4xx; recurso limitado e webhook com duas requisições simultâneas; banco só de teste) | `architecture.md` §8, `domain.md` §10, `backend.md` §7 |
| 14. Check | `pnpm check && pnpm test` | `backend.md` §10 |

Trabalho lento (e-mail, relatório, webhook) não roda na requisição: fila (`_doc-lib/bullmq.md` ou
`@adonisjs/queue`). Função sem casa óbvia: tabela de `typescript.md` §6 (`_shared` só função pura,
`backend.md` §4.9).

## Erros comuns

- "Ler, decidir e gravar" sobre recurso finito sem índice único, escrita condicional ou lock de
  linha; lock em Redis ou em memória no lugar do banco (`backend.md` §4.11).

- Use-case importando model ou implementação concreta; regra de negócio num `if` do use-case em vez
  da entidade (`domain.md` §7).
- Response montado à mão ou entidade/model devolvido cru, em vez do presenter com o tipo de `shared/`.
- Validator copiado no frontend, fora do par de caminho e nome; no Fastify, `@vinejs/vine` em qualquer lugar; no Adonis, Zod no backend ou VineJS no frontend.
- Nome fora do caminho: classe `<Módulo><Recurso><Ação>UseCase`, validator `<Módulo><Recurso><Ação>Validator`,
  código de 500 `<MÓDULO>_<RECURSO>_<AÇÃO>_ERROR`, tag `[<módulo>/<recurso> > <ação>][error]`
  (`architecture.md` §3).
- Sufixo errado: `.spec.ts` sem `unit`/`e2e`, `-contract.service.ts` em vez de `.contract.ts`,
  snake_case (só migration mantém o nome gerado, `backend.md` §3).
- `HTTPException` embrulhado em função: some do OpenAPI (`backend.md` §4.1). `*OrFail()` ou `throw`
  de negócio no use-case.
- Unicidade por regra do validator em vez de `left(Conflict)` no use-case pelo repository.
- `typeof`/`instanceof` dentro de entidade, use-case ou presenter (`typescript.md` §2.1).
- Identificador, rota, título de teste ou comentário em português (`typescript.md` §12); mensagem
  literal em vez de chave.
- Segredo com default no `env` (`backend.md` §6).
- Criar service, `_shared`, regra de validator ou tipo sem procurar antes em `shared/`, `domain/`,
  `core/`, `services/` (`architecture.md` §1, princípio 10).

## Fluxo

Etapa 4 de `AGENTS.md` ("Fluxo de uma tarefa"). Antes: `maiyu-standards` e o plano
(`tlc-spec-driven`/`superpowers:writing-plans`). Durante: `superpowers:test-driven-development` e as
skills da lib tocada (`SKILLS-MAP.md`, "Por biblioteca"). Depois:
`superpowers:verification-before-completion` → `superpowers:requesting-code-review` → `caveman-commit`
(regras de commit em `code-pattern` §9).
