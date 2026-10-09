# `app/guards/`

Como a sessao prova quem e.

Cookie `httpOnly`, e nao `Authorization`. **Sem fallback para o header** - o guard
le so o cookie, e isso e deliberado: aceitar os dois daria duas superficies para
a mesma sessao, e a que ninguem lembra de auditar e a que vaza.

O guard confere `name === access-token`, recusa conta arquivada e conta que nao
esta ativa. O filtro de arquivado passa por `withScopes(notDeleted)`, e nao por
`whereNull` escrito a mao: e a consulta que resolve **toda** requisicao
autenticada, entao e onde esquecer o filtro custa mais.

## Arquivos

| Arquivo | Proposito |
|---|---|
| `cookie-access-tokens.guard.ts` | O usuário já autenticado, onde `currentAccessToken` deixou de ser opcional |

A coluna de proposito e a primeira frase do JSDoc de cada arquivo, extraida do
proprio arquivo. Um travessao ali quer dizer que o arquivo nao se explicou.
