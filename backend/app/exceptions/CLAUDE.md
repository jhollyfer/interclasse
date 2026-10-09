# `app/exceptions/`

O envelope de erro, e o unico lugar que o produz.

So dois arquivos, e e proposital: `http.exception.ts` monta
`{ message, status, code, errors? }` e `handler.ts` o entrega. `code` e o
identificador estavel que o cliente compara; `message` e texto de UI em pt-BR e
nunca e comparado.

Congelados por sha256 nos tres.

## Arquivos

| Arquivo | Proposito |
|---|---|
| `handler.ts` | O VineJS entrega uma lista de mensagens (`{ field, rule, message }`). Aqui ela é achatada em campo -> mensagem, o mesmo formato que o `errors` do… |
| `http.exception.ts` | O corpo JSON que toda falha da API devolve. Segue a convenção do AdonisJS: `status` é o número HTTP e `code` é o código de máquina |

A coluna de proposito e a primeira frase do JSDoc de cada arquivo, extraida do
proprio arquivo. Um travessao ali quer dizer que o arquivo nao se explicou.
