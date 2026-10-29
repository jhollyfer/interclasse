# Tarefas do projeto

**Interclasse** · divididas em fases

> Roteiro do projeto. Detalhe de uma feature feita com `tlc-spec-driven` mora em
> `.specs/features/<feature>/tasks.md`; aqui a linha aponta para lá.
> Atualiza no mesmo commit em que a tarefa começa ou termina.

**Resumo:** 13 tarefas · 8 feitas · 0 em andamento · 5 a fazer — atualizado 2026-10-29

Status: `A fazer` · `Em andamento` · `Feita` · `Bloqueada` (com motivo nas notas).
Prioridade: `Alta` · `Média` · `Baixa`.

## Fase 1 · Régua (1/2)

Trazer o projeto para o padrão Maiyu inteiro.

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 1.1 | Sync do `maiyu-pattern` (`_standards/`, `docs/`, `AGENTS.md`) | Alta | Feita | `_padroes/` removido |
| 1.2 | Migração estrutural (`shared/`, `domain/`, `repositories/`, queries por módulo, specs por ação) | Alta | A fazer | `_standards/MIGRATIONS.md`, seção interclasse |

## Fase 2 · Pedidos do Geison, 29/10 (7/9)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 2.1 | Menu da conta derrubava a tela ("Algo quebrou", 500) | Alta | Feita | `DropdownMenuLabel` fora de `DropdownMenuGroup` |
| 2.2 | Sorteio da chave mostra erro mas cria a chave | Alta | Feita | sorteio idempotente + retry no cliente |
| 2.3 | Excluir chave pela lista | Média | Feita | menu da linha |
| 2.4 | Classificação na home com abas por categoria e modalidade, sem sair da página | Alta | Feita | `StandingsExplorer` |
| 2.5 | Turmas do admin em cartões (F1/F2), detalhe com conselheiro e representante; conselheiro com uma turma só | Alta | Feita | `components/common/classroom-detail` |
| 2.6 | Página "Sobre o JIC" e Instagram no rodapé | Média | Feita | conteúdo editável em Painel › Site |
| 2.7 | Regulamento em PDF enviado pelo admin, para baixar no site | Média | Feita | |
| 2.8 | Carrossel de fotos: conselheiro envia, admin aprova | Média | A fazer | |
| 2.9 | Relatórios (turmas, alunos, atletas) com CSV | Média | A fazer | |

## Fase 3 · Achados da auditoria (0/2)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 3.1 | Itens de `maiyu-pattern/_findings/interclasse.md` (B1–B4, I1–I5, T1–T4, C1–C6) | Média | A fazer | |
| 3.2 | Segurança SEC-1..SEC-9 do mesmo arquivo | Alta | A fazer | SEC-1 `trustProxy` primeiro |

## Fase N · Ideias (fora do escopo atual)

- Ajuste visual fino das turmas com os prints do Geison — Geison, 29/10
