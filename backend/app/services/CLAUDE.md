# `app/services/`

O que tem dependencia ou estado.

O criterio esta na secao 4.9 da regua, e ele tem tres lados, nao dois:

- **service** quando precisa de outra dependencia ou de configuracao;
- **service tambem** quando guarda uma politica e **constroi** a consulta
  (`visibleProducts()` nasce de `Product.query()`); injetavel porque politica e o
  que um teste quer trocar;
- **`features/_shared.<tema>.ts`** quando e funcao pura sobre model ou query ja em
  maos (`visibleCourses(query)` recebe e acrescenta).

Teste rapido do que **nao** vale: funcao que recebe um service como *parametro* e
service disfarcado. Tres deles foram desfeitos nesta base - a dependencia viajava
por dez chamadas em vez de ficar declarada num construtor, e cinco casos de uso
injetavam um service so para repassa-lo.

`app/services/` **nao importa de um modulo de features**, so de `_shared.<tema>`.
Cobrado pelo `pattern:check`.

## Arquivos

| Arquivo | Proposito |
|---|---|
| `bracket.service.ts` | A chave como ela é lida: times, partidas de cada fase e a campeã |
| `classroom.service.ts` | Os vínculos de pessoa de uma turma: conselheiro e representante |
| `cookie.service.ts` | Os nomes e as validades da sessão, num lugar só |
| `enrollment.service.ts` | As inscrições de uma turma: quem joga o quê |
| `match.service.ts` | A tabela de jogos, a mesma no painel e no site |
| `multipart.service.ts` | Uma parte que o cliente ainda vai enviar, e o endereço para onde enviá-la |
| `slug.service.ts` | O teto da coluna `slug` de `sports` |
| `storage.service.ts` | Toda coluna que aponta para `storages`, com o rótulo que a mensagem de erro mostra quando o arquivo está em uso |

A coluna de proposito e a primeira frase do JSDoc de cada arquivo, extraida do
proprio arquivo. Um travessao ali quer dizer que o arquivo nao se explicou.
