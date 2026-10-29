# Documento de requisitos

**<Projeto>** · <frase de uma linha: o que é e para quem>

| Versão | Status | Data | Dono do produto | Meta |
|---|---|---|---|---|
| 1.0 | Rascunho / Aprovado | AAAA-MM-DD | <nome> | <ex.: primeira versão em produção até AAAA-MM-DD> |

> Escopo é decisão do dono do produto. O agente não altera este arquivo sem pedido; viu
> contradição entre a tarefa e o PRD, pergunta.

## 1. Problema

<O que dói hoje, para quem, e o que isso custa. Uma ou duas frases concretas.>

Ex.: O dono anota encomenda no WhatsApp e perde pedido no fim de semana.

## 2. Para quem

| Perfil | Quem é | O que precisa |
|---|---|---|
| <ex.: Dono> | <dono de padaria pequena> | <ver pedidos do dia num lugar só> |
| <ex.: Atendente> | <atendente do balcão> | <marcar pedido como retirado> |

## 3. Objetivos

- <resultado mensurável 1 — ex.: zero pedido perdido por semana>
- <resultado mensurável 2>

## 4. Primeira versão (MVP)

| # | Funcionalidade | Para quem | Fluxo |
|---|---|---|---|
| 1 | <Cardápio com foto> | <cliente> | `USER-FLOWS.md#<fluxo>` |
| 2 | <Pedido com horário de retirada> | <cliente> | |

## 5. Fica de fora (nesta versão)

- <Entrega> — <motivo / quando volta>
- <App de celular>

## 6. Requisitos não funcionais

| Tema | Requisito |
|---|---|
| Desempenho | <ex.: lista de pedidos abre em < 1 s com 500 pedidos> |
| Disponibilidade | <ex.: horário comercial; manutenção fora dele> |
| Acessibilidade | WCAG 2.1 AA nas telas do cliente |
| Dispositivos | <ex.: celular primeiro; desktop no balcão> |
| Dados pessoais | <o que se coleta e por quê — detalhe em `SECURITY.md`> |

## 7. Métricas de sucesso

| Métrica | Hoje | Meta | Como medir |
|---|---|---|---|
| <pedidos perdidos/semana> | <3> | <0> | <relatório do painel> |

## 8. Perguntas em aberto

- [ ] <pergunta> — <quem responde>

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | AAAA-MM-DD | Primeira versão |
