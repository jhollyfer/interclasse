# `app/policies/`

A regra por registro, que o papel da rota nao expressa.

Classe **injetavel comum**, recebida por construtor no caso de uso, com um metodo
por acao e a assinatura `(actor, target)`.

O `role()` do grupo olha so o papel de **quem chama**. A policy olha **quem e o
alvo**: um administrador edita usuario, mas nao *aquele* usuario. Sao camadas que
compoem, e cada regra mora numa so.

`ctx.bouncer` **nao e usado** em lugar nenhum, e o `pattern:check` cobra isso: ele
obrigaria o caso de uso a receber `HttpContext` e quebraria o contrato
`Payload -> Either`.

## Arquivos

| Arquivo | Proposito |
|---|---|
| `classroom_policy.ts` | Quem cuida de qual turma |
| `user_policy.ts` | Quem pode operar qual conta no painel |

A coluna de proposito e a primeira frase do JSDoc de cada arquivo, extraida do
proprio arquivo. Um travessao ali quer dizer que o arquivo nao se explicou.
