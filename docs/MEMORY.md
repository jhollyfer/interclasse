# Memória do projeto

**Interclasse** · onde a gente está, para a próxima conversa

> O agente lê **no início** de toda sessão e atualiza **no fim**. Curto: é um ponto de
> retomada, não um diário. Histórico vai para `CHANGELOG.md` e `DECISIONS.md`.

| Atualizado | Fase atual | Progresso | Status |
|---|---|---|---|
| 2026-10-30 | Régua aplicada e pedidos do Geison entregues | 90% | Em revisão, branch `claude/modest-planck-jx0izx` |

## Já feito

- Pedidos do Geison (29/10): menu da conta, sorteio idempotente, excluir chave, classificação em abas, turmas em cartões, conselheiro com uma turma, Sobre/regulamento/Instagram editáveis, fotos com aprovação, relatórios com CSV.
- Régua inteira: workspace com `shared/`, backend em domínio/repositório/presenter com i18n, frontend com Zod do `shared/`, textos em pt-BR/es/en, E2E Playwright, `docs/` preenchidos.

## Parou em

Fase 5.4 (backend arquitetura) aplicada na branch `frente-5-4`: lint, typecheck, `pattern:check`, `authz:check`, `openapi:check` e 371 unit verdes; E2E do backend não rodou (sem banco no ambiente) e precisa rodar antes do merge. Antes disso, tudo verde na branch: shared 18, frontend 187 + build, backend 911 (1 falha só do S3 local que não expira URL), E2E 14/14. Falta revisão do dono, PR e deploy.

## Próximos passos

1. Dono revisa e decide o PR para `main`.
2. Primeiro deploy: a imagem da API agora sai da raiz (`docker build -f backend/Dockerfile-production .`); o pré-deploy `node ace migration:run --force` não muda. A migration de conselheiro único solta turmas de quem tinha mais de uma.
3. Pendências da Fase 4 de `TASKS.md` e E2E no CI.

## Contexto importante

- Geison (professor, usuário do painel) vai mandar prints das turmas para ajuste visual fino.
- Cada conselheiro aconselha uma turma só (decisão do Jhollyfer com o Geison, 29/10).
- Quem criou os jogos e desde quando não está no código: a organização preenche em Painel › Site.
- Infraestrutura (banco, VPS) é do Jhollyfer.
- Um merge desta branch saiu com a mensagem padrão do git citando o nome do branch temporário; corrigir exige force push, que não foi autorizado.

## Lições

> Uma linha por correção do dono (`AGENTS.md`, "Modo de trabalho" item 3). Lida no início de toda
> sessão. Lição que vale para todo projeto sobe para a régua e sai daqui.

| Data | Erro | Regra que evita | Vale para |
|---|---|---|---|
| 2026-10-29 | Índice único de conselheiro entrou com só as specs da feature rodadas; duas specs de `advisor/classrooms` que davam duas turmas ao mesmo conselheiro só quebraram depois | Mudança de regra de dado (índice, unique, enum) roda a suíte inteira antes do commit, não só a spec da feature | backend, migration e regra de domínio |
| 2026-10-29 | `DropdownMenuLabel` sem `DropdownMenuGroup` no menu da conta: abrir o menu lançava e virava a página de erro 500 (já tinha acontecido no `table-column-toggle`) | Todo `DropdownMenuLabel` (`Menu.GroupLabel`) dentro de `DropdownMenuGroup`; reproduzir no navegador antes de teorizar | frontend, qualquer menu do Base UI |

## Problemas conhecidos

| Problema | Onde | Contorno |
|---|---|---|
| <…> | <arquivo/tela> | <…> |

## Links úteis

- Repositório: <url> · Produção: <url> · Design: <url>
