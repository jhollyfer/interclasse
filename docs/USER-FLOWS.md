# Fluxos do usuário

**<Projeto>** · cada passo do primeiro acesso até concluir a tarefa

> Um fluxo por funcionalidade do `PRD.md` §4. Tela nova ou fluxo novo entra aqui no mesmo
> commit. O teste de ponta a ponta segue estes passos (`TEST-PLAN.md`).

## Jornadas principais

| Fluxo | Quem | Tela inicial | Resultado |
|---|---|---|---|
| [Cadastro](#cadastro) | visitante | `/sign-up` | conta criada, painel aberto |
| [Criar <recurso>](#criar-recurso) | <usuário> | `/<rota>` | <recurso> aparece na lista |

---

## Cadastro

**Entrada:** <landing → "Criar conta">
**Pré-condição:** <não logado>

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre a página | mostra a proposta e "Criar conta" | `/` |
| 2 | preenche e-mail e senha | valida no campo | `/sign-up` |
| 3 | confirma o e-mail pelo link | ativa a conta | e-mail |
| 4 | entra | abre o painel | `/dashboard` |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Entrada inválida (e-mail ruim, senha curta) | mensagem no campo dizendo o que corrigir |
| E-mail já usado (409) | mensagem no campo e link "Entrar" |
| Falha de rede | mantém o que foi digitado e oferece "Tentar de novo" |

---

## Criar <recurso>

**Entrada:** <botão "Nova tarefa">
**Ação:** <preenche título e data>
**Sucesso:** <aparece na lista e toast de confirmação>
**Falha:** <mantém o formulário preenchido e mostra o erro>

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | | | |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Lista vazia | estado vazio com "Criar a primeira <recurso>" |
| Sem permissão (403) | <mensagem / redireciona> |

---

## Checklist de todo fluxo

- [ ] Entrada clara (de onde o usuário chega).
- [ ] Toda ação tem retorno: carregando, sucesso, erro.
- [ ] Dá para voltar ao passo anterior.
- [ ] Estados vazio e de erro desenhados.
- [ ] Sucesso visível (mensagem ou mudança na tela).
- [ ] Funciona no celular.
