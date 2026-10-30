# Memória do projeto

**Interclasse** · onde a gente está, para a próxima conversa

> O agente lê **no início** de toda sessão e atualiza **no fim**. Curto: é um ponto de
> retomada, não um diário. Histórico vai para `CHANGELOG.md` e `DECISIONS.md`.

| Atualizado | Fase atual                                   | Progresso | Status                                           |
| ---------- | -------------------------------------------- | --------- | ------------------------------------------------ |
| 2026-10-30 | Régua aplicada e pedidos do Geison entregues | 90%       | Em revisão, branch `claude/modest-planck-jx0izx` |

## Já feito

- Pedidos do Geison (29/10): menu da conta, sorteio idempotente, excluir chave, classificação em abas, turmas em cartões, conselheiro com uma turma, Sobre/regulamento/Instagram editáveis, fotos com aprovação, relatórios com CSV.
- Régua inteira: workspace com `shared/`, backend em domínio/repositório/presenter com i18n, frontend com Zod do `shared/`, textos em pt-BR/es/en, E2E Playwright, `docs/` preenchidos.

## Parou em

Fase 5 (régua estrita) concluída na branch `refactor/interclasse-regua-estrita`: frentes 5.1 a 5.8 integradas e verificadas (E2E 14/14 duas vezes, backend 462 unit + 691/692 e2e, frontend 413 unit). Workflows e imagens Docker só rodam de verdade no primeiro PR.

## Próximos passos

1. Medir o `size-adjust` das fontes de reserva (resto da 5.7).
2. Abrir o PR da fase 5 e conferir os workflows novos (Docker e E2E) na primeira execução real.
3. Antes do deploy: definir `SITE_ENV=production` (runtime) e `VITE_STORAGE_URL` (build) na produção; sem a primeira o site sai `noindex`, sem a segunda o CSP bloqueia o upload.

## Contexto importante

- Geison (professor, usuário do painel) vai mandar prints das turmas para ajuste visual fino.
- Cada conselheiro aconselha uma turma só (decisão do Jhollyfer com o Geison, 29/10).
- Quem criou os jogos e desde quando não está no código: a organização preenche em Painel › Site.
- Infraestrutura (banco, VPS) é do Jhollyfer.
- Um merge desta branch saiu com a mensagem padrão do git citando o nome do branch temporário; corrigir exige force push, que não foi autorizado.

## Lições

> Uma linha por correção do dono (`AGENTS.md`, "Modo de trabalho" item 3). Lida no início de toda
> sessão. Lição que vale para todo projeto sobe para a régua e sai daqui.

| Data       | Erro                                                                                                                                                                     | Regra que evita                                                                                                       | Vale para                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 2026-10-29 | Índice único de conselheiro entrou com só as specs da feature rodadas; duas specs de `advisor/classrooms` que davam duas turmas ao mesmo conselheiro só quebraram depois | Mudança de regra de dado (índice, unique, enum) roda a suíte inteira antes do commit, não só a spec da feature        | backend, migration e regra de domínio |
| 2026-10-29 | `DropdownMenuLabel` sem `DropdownMenuGroup` no menu da conta: abrir o menu lançava e virava a página de erro 500 (já tinha acontecido no `table-column-toggle`)          | Todo `DropdownMenuLabel` (`Menu.GroupLabel`) dentro de `DropdownMenuGroup`; reproduzir no navegador antes de teorizar | frontend, qualquer menu do Base UI    |

## Problemas conhecidos

| Problema | Onde | Contorno |
|---|---|---|
| `pnpm depcruise` acusa 18 violações de camada e ciclo (policies, guard e session service importando model; controllers de sessão importando o `CookieService`; ciclos entre models) | `backend/app` | corrigir na tarefa 5.4; o passo do CI falha até lá |
| Dockerfiles, job E2E do frontend e workflows novos escritos sem acesso a Docker daemon nem a GitHub Actions | `.github/workflows/`, `*/Dockerfile-production` | validar no primeiro PR e na tarefa 5.8 |

## Links úteis

- Repositório: https://github.com/jhollyfer/interclasse · Produção: https://interclass.maiyu.com.br · Design: `docs/DESIGN.md`
