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

Fase 5 em integração na branch `refactor/interclasse-regua-estrita`: frentes 5.1/5.2 (tooling, CI, Docker, docs), 5.3 (borda e segurança) e 5.4 (arquitetura do backend) e 5.6 (estrutura do frontend: login em `/sign-in`, `request(path, schema)`, kit comum completo) integradas; workflows e Dockerfiles ainda não rodaram de verdade (sem dockerd nem Actions na sessão).

## Próximos passos

1. Fase 5.7 (ESLint, dialogs, Luxon, SEO, tokens): o kit novo ainda não tem tela que o use; `RichEditor` e `MultiFileUpload` entram quando um formulário pedir.
2. Rodar o E2E Playwright com o backend de pé antes do PR (URL do login e rotas `new`/`$id/edit` mudaram).
3. Definir como o `robots.txt` reconhece staging: hoje é `import.meta.env.PROD`, e um staging com build de produção sairia indexável.

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
