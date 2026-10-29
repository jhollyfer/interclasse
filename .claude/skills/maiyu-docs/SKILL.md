---
name: maiyu-docs
description: Use when generating, filling or refreshing the living docs of a house project (AGENTS.md and docs/ — PRD, ARCHITECTURE, RULES, DESIGN, USER-FLOWS, TASKS, MEMORY, ENV, CHANGELOG, DECISIONS, SECURITY, TEST-PLAN), when a project still has template placeholders, or when the user says "gerar docs", "documentar o projeto", "atualizar memória".
---

# Docs Maiyu

**REQUIRED:** `maiyu-standards`. Afirmação sobre biblioteca no doc gerado vem da página oficial aberta, citada com a URL, nunca só do resumo da `_doc-lib`. Regras do conjunto (o que existe, nome, idioma, quem lê, quem
atualiza, o que vira decisão): `_standards/documentation.md`. Modelos: `_templates/`. Esta skill
transforma o modelo genérico nos docs **deste** projeto, lidos do código real; não repete as regras
de lá.

## Princípio

Doc gerado vem do que o projeto **é**, nunca do que o modelo sugere. Cada linha tem fonte: arquivo
do projeto, `_standards/` ou resposta do dono. Sem fonte, pergunte, ou escreva "Não se aplica:
<motivo>" (`documentation.md` §8). Placeholder `<...>` não sobra.

## Passos

1. **Base.** `node <maiyu-pattern>/scripts/sync-to-project.mjs <projeto>`: traz `_standards/`,
   `_doc-lib/`, `SKILLS-MAP.md` e as skills, e cria de `_templates/` só o que falta (`AGENTS.md` e
   `docs/`). Nunca sobrescreve: arquivo preenchido se atualiza por seção. `CLAUDE.md` contém só
   `@AGENTS.md` (`documentation.md` §3).
2. **Leia o projeto pelo que já existe**, só o trecho necessário (`code-review-graph` para rotas e
   dependências):
   - `package.json` da raiz, de `backend/`, `frontend/`, `shared/` e `pnpm-workspace.yaml`: nome,
     versões, scripts → ARCHITECTURE §2, TEST-PLAN §1.
   - Leitor de ENV + `.env.example` (`backend.md` §6) → ENV §1, na ordem de blocos da casa.
   - `start/routes.ts` / registry Fastify e `app/features/<módulo>/<recurso>/<ação>/` → ARCHITECTURE §4.
   - `app/domain/<entidade>/` (verbos, transições, fatos) → ARCHITECTURE §4.1 "Linguagem do domínio"
     (termo no negócio → nome no código, `DECISIONS.md` #118).
   - `app/repositories/`, models, migrations, coleções → ARCHITECTURE §5.
   - `shared/src/{validators,responses,enums}/` → ARCHITECTURE §6 (contrato de endpoint) e a matriz
     do TEST-PLAN.
   - `app/services/<nome>/<nome>.contract.ts` → ARCHITECTURE §7.
   - Policies, middleware de auth e do `actor` → ARCHITECTURE §8, SECURITY §3–§4.
   - `frontend/src/routes/` por grupo (`_public`, `_authentication`, `_private/<área>`) → USER-FLOWS
     (uma jornada por grupo) e o modo de SSR de cada grupo → ARCHITECTURE §6.
   - `project.inlang/` + `messages/` e `resources/lang/` → idiomas em ARCHITECTURE §2 (`i18n.md`).
   - `styles.css` + `components.json` + `components/common/` → DESIGN (valores reais dos tokens,
     componentes do kit com variante e estado).
   - Specs (`*.unit.spec.ts`, `*.e2e.spec.ts`, `*.test.ts(x)`, `e2e/*.spec.ts`) e CI
     (`.github/workflows/`) → TEST-PLAN.
   - `git log --oneline` + tags → CHANGELOG (releases existentes; sem tag, só `[Não lançado]`).
   - Docs fora do conjunto (`CLAUDE.md` gordo, README antigo, `docs/adr/`, `CONTEXT.md`,
     `.specs/STATE.md`, `<repo>-threat-model.md`, `*-MAP.md`, `_doc-*.md`): o que é do projeto migra
     para o arquivo certo de `docs/` (ADR vira linha de DECISIONS, threat model vira SECURITY §2,
     estado vira MEMORY); o que é régua vira ponteiro para `_standards/`. O arquivo antigo sai.
   - Upstream: `_standards/_map/scan-2026-10/<projeto>.md` e `ex-<projeto>-*.md`, a seção do projeto
     em `_standards/MIGRATIONS.md` → MEMORY "Problemas conhecidos" e TASKS (fase de migração);
     `_findings/<projeto>.md` → uma linha por item em TASKS (segurança primeiro, prioridade Alta) e os
     abertos em MEMORY.
3. **Escreva pela filosofia da casa:**
   - Conteúdo em pt-BR; identificador, rota, variável e comando como estão no código
     (`documentation.md` §2).
   - ARCHITECTURE e RULES só com o que é do projeto; camadas, árvore e nomes apontam para
     `_standards/architecture.md` (`documentation.md` §6). Desvio da árvore entra com motivo, ou vira
     tarefa de migração.
   - Stack nomeia o perfil: Adonis (`backend.md`) ou Fastify (`backend.md` + `backend-fastify.md`),
     frontend TanStack Start (`frontend.md`), pacote `shared/` (`architecture.md` §9).
   - SECURITY §2 segue o contrato de threat model ancorado em caminho do repositório (fronteira,
     ativo, capacidade e não-capacidade do atacante, abusos `TM-001`…); a skill
     `security-threat-model` produz o conteúdo, que entra **no** `docs/SECURITY.md`, nunca em arquivo
     solto. Termos da casa: policy, `actor`, validator (VineJS no Adonis, Zod no Fastify), `left(HTTPException)`.
   - DESIGN em tokens semânticos (`frontend.md` §6), com o valor do tema.
   - DECISIONS só decisão do projeto, pelos três critérios de `documentation.md` §5; regra geral é
     `_standards/DECISIONS.md`.
   - Projeto atrás na versão (`tooling.md` §0) → tarefa em TASKS.
4. **Pergunte o que o código não diz**, numa lista só, de uma vez: problema e público (PRD §1–2),
   metas, o que fica de fora, contato de segurança, ambientes de produção e o que a plataforma faz
   fora do repositório. Até a resposta, o item fica em PRD §8 "Perguntas em aberto". PRD nunca é
   inventado.
5. **MEMORY** fecha a geração: data `AAAA-MM-DD`, fase atual, "Parou em" com o estado real do
   repositório.

## Red flags

| Pensamento | Realidade |
|---|---|
| "Copio a regra de `_standards/` para o RULES ficar completo" | Duplica a régua; aponte (`documentation.md` §6) |
| "Crio `docs/adr/` ou `CONTEXT.md` porque a skill pediu" | Conjunto fechado (`documentation.md` §1); vira DECISIONS ou ARCHITECTURE §4.1 |
| "Invento o problema do PRD pelo nome do projeto" | PRD é do dono; pergunte |
| "Deixo `<...>` para alguém preencher" | Fonte, "Não se aplica: <motivo>" ou pergunta aberta |
| "Copio o hex do modelo" | Valor vem do `styles.css` do projeto |
| "Leio o projeto inteiro antes" | A lista do passo 2, só o trecho |
| "Sobrescrevo o doc que já existe" | Atualize a seção; o sync nunca sobrescreve e você também não |

## Entrega

Commit atômico por arquivo ou grupo (`docs(prd): …`, `docs(env): …`), regras de commit em
`code-pattern` §9 (pt-BR, autor único, sem coautoria de agente). Texto revisado por `humanizer`
antes do commit, respeitando as regras de escrita do `CLAUDE.md` do projeto. Lista de perguntas
abertas vai na resposta ao dono e no PRD §8.
