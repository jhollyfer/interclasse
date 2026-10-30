# Tarefas do projeto

**Interclasse** · divididas em fases

> Roteiro do projeto. Detalhe de uma feature feita com `tlc-spec-driven` mora em
> `.specs/features/<feature>/tasks.md`; aqui a linha aponta para lá.
> Atualiza no mesmo commit em que a tarefa começa ou termina.

**Resumo:** 23 tarefas · 20 feitas · 0 em andamento · 3 a fazer — atualizado 2026-10-29

Status: `A fazer` · `Em andamento` · `Feita` · `Bloqueada` (com motivo nas notas).
Prioridade: `Alta` · `Média` · `Baixa`.

## Fase 1 · Régua (11/12)

Trazer o projeto para o padrão Maiyu inteiro.

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 1.1 | Sync do `maiyu-pattern` (`_standards/`, `docs/`, `AGENTS.md`) | Alta | Feita | `_padroes/` removido |
| 1.2 | Workspace pnpm na raiz + `shared/` (Either, `z`, enums, envelope) | Alta | Feita | lockfile único, imagem da API pela raiz |
| 1.3 | Fundação backend: specs unit/e2e, `app/validators/`, i18n por requisição, UnitOfWork | Alta | Feita | |
| 1.4 | Módulo de referência `sports` (entidade, repositório, presenter, Zod no `shared/`) | Alta | Feita | |
| 1.5 | Demais módulos do backend na forma da referência | Alta | Feita | 911 testes |
| 1.6 | Frontend: Paraglide pt-BR/es/en e troca de idioma | Alta | Feita | |
| 1.7 | Frontend: queries/mutations por módulo, `-search.ts`, guard por área | Alta | Feita | |
| 1.8 | Frontend: tipos e validators do `shared/` (Zod + zodResolver) | Alta | Feita | VineJS saiu do frontend |
| 1.9 | Frontend: todos os textos nos três idiomas | Alta | Feita | 600 chaves por idioma |
| 1.11 | Suíte E2E (Playwright) dos fluxos críticos | Alta | Feita | 14 testes, `pnpm e2e` |
| 1.12 | E2E no CI (API e banco em container no job) | Média | A fazer | hoje roda só local |
| 1.10 | Docs do projeto preenchidos a partir do código | Média | Feita | |

## Fase 2 · Pedidos do Geison, 29/10 (9/9)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 2.1 | Menu da conta derrubava a tela ("Algo quebrou", 500) | Alta | Feita | `DropdownMenuLabel` fora de `DropdownMenuGroup` |
| 2.2 | Sorteio da chave mostra erro mas cria a chave | Alta | Feita | sorteio idempotente + retry no cliente |
| 2.3 | Excluir chave pela lista | Média | Feita | menu da linha |
| 2.4 | Classificação na home com abas por categoria e modalidade, sem sair da página | Alta | Feita | `StandingsExplorer` |
| 2.5 | Turmas do admin em cartões (F1/F2), detalhe com conselheiro e representante; conselheiro com uma turma só | Alta | Feita | `components/common/classroom-detail` |
| 2.6 | Página "Sobre o JIC" e Instagram no rodapé | Média | Feita | conteúdo editável em Painel › Site |
| 2.7 | Regulamento em PDF enviado pelo admin, para baixar no site | Média | Feita | |
| 2.8 | Carrossel de fotos: conselheiro envia, admin aprova | Média | Feita | |
| 2.9 | Relatórios (turmas, alunos, atletas) com CSV | Média | Feita | |

## Fase 3 · Achados da auditoria (0/2)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 3.1 | Itens de `maiyu-pattern/_findings/interclasse.md` (B1–B4, I1–I5, T1–T4, C1–C6) | Média | A fazer | |
| 3.2 | Segurança SEC-1..SEC-9 do mesmo arquivo | Alta | A fazer | SEC-1 `trustProxy` primeiro |

## Fase 4 · Pendências conhecidas

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 4.1 | Índice único que garanta uma linha só em `site_settings` | Baixa | A fazer | duas primeiras leituras simultâneas criariam duas linhas |
| 4.2 | Tipo do `scheduledAt` do VineJS (`DateTime \| null`, chega `undefined`) | Baixa | A fazer | o use-case trata os dois |
| 4.3 | Tema por cookie no servidor e tamanhos de fonte em token | Baixa | A fazer | desvios descritos em `DESIGN.md` |
| 4.4 | Fixar a imagem `node:24-alpine` por digest nos Dockerfiles | Média | A fazer | sem acesso ao Docker Hub nesta sessão |

## Fase N · Ideias (fora do escopo atual)

- Ajuste visual fino das turmas com os prints do Geison — Geison, 29/10
