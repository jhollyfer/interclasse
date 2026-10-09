# `app/core/`

O que nao pertence a nenhuma feature e nao depende de nenhuma.

**Nada daqui importa de `features/` nem de `services/`** - e a unica regra de
alocacao, e o `pattern:check` a cobra. Um `core` que importa da camada de cima
deixa de ser base e vira um segundo lugar onde a feature mora.

`validator.ts` e **arquivo unico** de proposito: `_doc-lib/vinejs.md:37-38` cita
esse caminho literalmente, e e o que as meta-specs (`validator.spec.ts`,
`mensagens.spec.ts`) conseguem varrer inteiro. Um validator por pasta seria
invisivel para elas.

## Arquivos

| Arquivo | Proposito |
|---|---|
| `aggregate.ts` | O que o Lucid deixa em `$extras` e não coloca no JSON |
| `either.ts` | Either - o resultado de uma operação que pode falhar, como VALOR de retorno em vez de exceção. `Left` carrega o erro, `Right` carrega o sucesso |
| `entity.ts` | Vocabulário do domínio: os enums e a forma da resposta paginada |
| `openapi/document.ts` | Monta o documento OpenAPI a partir do router de verdade |
| `openapi/errors.ts` | As respostas de falha |
| `openapi/field-patches.ts` | Correções de documentação para as regras compartilhadas de `#core/validator` |
| `openapi/introspect.ts` | Lê o contrato que o código já declara |
| `openapi/model-schema.ts` | Model do Lucid -> JSON Schema da resposta |
| `openapi/scalar.ts` | A página de referência da API |
| `openapi/schema.ts` | VineJS -> JSON Schema publicável |
| `openapi/types.ts` | Vocabulário do gerador de documentação |
| `response.ts` | O contrato de resposta de toda a API, num lugar só |
| `validator.ts` | Fonte única dos schemas VineJS do backend |

A coluna de proposito e a primeira frase do JSDoc de cada arquivo, extraida do
proprio arquivo. Um travessao ali quer dizer que o arquivo nao se explicou.
