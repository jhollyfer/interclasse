# `app/middleware/`

O que roda antes do controller, na ordem do kernel.

Nome em `snake_case` + `_middleware.ts` - convencao do Adonis, e nao se briga.

`role()` vai no **grupo**, nunca no endpoint, e sempre depois de `auth()`: sem
sessao o papel e desconhecido, e a resposta certa e 401 e nao 403. Rota nova
nasce protegida pelo grupo onde foi colocada, em vez de depender de alguem
lembrar de pendurar o middleware nela.

## Arquivos

| Arquivo | Proposito |
|---|---|
| `auth.middleware.ts` | Auth middleware is used authenticate HTTP requests and deny access to unauthenticated users |
| `container-bindings.middleware.ts` | The container bindings middleware binds classes to their request specific value using the container resolver |
| `documentation.middleware.ts` | Quem opera o painel |
| `force-json-response.middleware.ts` | — |
| `origin.middleware.ts` | Os content-types que **não** disparam preflight |
| `role.middleware.ts` | Recusa quem chega a um módulo cujo papel não é o seu |
| `silent-auth.middleware.ts` | Silent auth middleware can be used as a global middleware to silent check if the user is logged-in or not |

A coluna de proposito e a primeira frase do JSDoc de cada arquivo, extraida do
proprio arquivo. Um travessao ali quer dizer que o arquivo nao se explicou.
