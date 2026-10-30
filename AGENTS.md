# Interclasse: instruções para agentes

Sistema dos Jogos Interclasse (JIC) do CMEI Cosme Jean: turmas, inscrição de atletas, sorteio das chaves, tabela de jogos, placar, classificação e avisos, para a organização, os professores conselheiros, os alunos representantes e o público.

Monorepo pnpm: `backend/` (AdonisJS 7), `frontend/` (TanStack Start) e `shared/` (`@interclasse/shared`: Either, enums, validators Zod, respostas). Os comandos de cada app estão em `backend/AGENTS.md` e `frontend/AGENTS.md`; os scripts, no `package.json`.

## O padrão Maiyu é seguido estritamente

Este projeto segue o `maiyu-pattern` sem exceção local: arquitetura, árvore de pastas, camadas, nomes,
escrita de código, testes, segurança, i18n e commits. O que o projeto faz diferente da régua é desvio
e se corrige, não se documenta como escolha. Regra que não serve ao projeto muda no upstream
(`maiyu-pattern`) e volta pelo sync; nunca se contorna aqui.

- `_doc-lib/`, `_standards/`, `SKILLS-MAP.md` e `.claude/skills/` são espelho do upstream. Não se editam
  e não recebem arquivo próprio: o sync remove o que sobrar. Página de doc ou skill que só este
  projeto usa entra primeiro no `maiyu-pattern`.
- Início de sessão: `node <maiyu-pattern>/scripts/sync-to-project.mjs . --check`. Divergência ou sobra
  se resolve com o sync antes da tarefa.
- Autor único `Jhollyfer Rodrigues <jhollyfer.fr@gmail.com>`: nenhum commit, PR ou arquivo leva agente
  como autor ou coautor (`Co-Authored-By`, `Claude-Session`, "Generated with").
- Branch `<tipo>/<escopo>-<assunto>` e título de PR em Conventional Commits (`feat(escopo): ...`,
  `fix`, `refactor`...). Nunca `claude`, `anthropic` ou outro agente no nome da branch, no título ou
  no corpo do PR; branch criada com prefixo de agente é renomeada antes do push (`_standards/tooling.md` §6).
- `docs/` é deste projeto: cada arquivo completo, no escopo do produto e em dia com o código. Mas
  nenhum deles define padrão, organização, estrutura ou arquitetura; isso é do `maiyu-pattern`, e
  em conflito a régua vence (`_standards/documentation.md`, "Quem manda em quê").

## Antes de qualquer tarefa

1. `docs/MEMORY.md` — onde o trabalho parou.
2. `docs/TASKS.md` — o que está em andamento e o que vem depois.
3. O que a tarefa pede, pela tabela de `_standards/documentation.md` §4 (PRD, USER-FLOWS, DESIGN, ENV…). Sorteio, chave, inscrição ou placar: `docs/ARCHITECTURE.md` §4.1 (linguagem do domínio) e `docs/RULES.md` §3. Deploy ou variável: `docs/ENV.md` e `docs/ARCHITECTURE.md` §9.1. Rota pública ou upload: `docs/SECURITY.md`.
4. O padrão da casa: `_standards/` e `_doc-lib/`, na ordem de `maiyu-standards`.

**A `_doc-lib/` é contrato, obrigatório antes de toda decisão e de toda implementação.** Ler o
`.md` não basta: ache a entrada do assunto em `_doc-lib/<lib>.md` e **abra o link oficial dela**
(`[markdown]` primeiro, senão `[doc]`), lendo a seção que responde à decisão. A entrada é o índice; a
página é o contrato. Decisão sem a página aberta é decisão sem base. Cite a página (`_doc-lib/<lib>.md#<entrada>`
+ URL) no commit, no PR ou no comentário de "por quê". Página que não abre: escreva "página oficial
não conferida" ao lado da decisão e não trate o resumo como contrato.

Leia pela seção (`grep -n '^## ' docs/<ARQ>.md`), não o arquivo inteiro.

## Ao terminar

No mesmo commit da mudança (`_standards/documentation.md` §5):

- status em `docs/TASKS.md`;
- "Parou em" e "Próximos passos" em `docs/MEMORY.md`;
- `docs/ENV.md` + `.env.example` se mexeu em variável;
- `docs/DECISIONS.md` se decidiu algo difícil de desfazer;
- `docs/CHANGELOG.md` em `[Não lançado]` se o usuário percebe a mudança.

## Não toque sem perguntar

Lista completa em `docs/RULES.md` §2.
