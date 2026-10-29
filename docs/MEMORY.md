# Memória do projeto

**Interclasse** · onde a gente está, para a próxima conversa

> O agente lê **no início** de toda sessão e atualiza **no fim**. Curto: é um ponto de
> retomada, não um diário. Histórico vai para `CHANGELOG.md` e `DECISIONS.md`.

| Atualizado | Fase atual | Progresso | Status |
|---|---|---|---|
| AAAA-MM-DD HH:MM | <2 · Pedidos> | <21%> | <Em desenvolvimento · MVP v1.0> |

## Já feito

- <Projeto, banco e login prontos>
- <Cardápio publicado>

## Parou em

<Uma ou duas frases concretas, com arquivo e o que falta.>
Ex.: Tela do carrinho: falta conferir o estoque antes de fechar o pedido
(`app/features/orders/create-order/create-order.use-case.ts`).

## Próximos passos

1. <próxima ação, na ordem>
2.

## Contexto importante

- <coisa que não está no código e que a próxima sessão precisa saber — ex.: cliente pediu
  para não mostrar preço no cardápio público até AAAA-MM-DD>

## Lições

> Uma linha por correção do dono (`AGENTS.md`, "Modo de trabalho" item 3). Lida no início de toda
> sessão. Lição que vale para todo projeto sobe para a régua e sai daqui.

| Data | Erro | Regra que evita | Vale para |
|---|---|---|---|
| 2026-10-29 | `DropdownMenuLabel` sem `DropdownMenuGroup` no menu da conta: abrir o menu lançava e virava a página de erro 500 (já tinha acontecido no `table-column-toggle`) | Todo `DropdownMenuLabel` (`Menu.GroupLabel`) dentro de `DropdownMenuGroup`; reproduzir no navegador antes de teorizar | frontend, qualquer menu do Base UI |

## Problemas conhecidos

| Problema | Onde | Contorno |
|---|---|---|
| <…> | <arquivo/tela> | <…> |

## Links úteis

- Repositório: <url> · Produção: <url> · Design: <url>
