import type { z } from '@interclasse/shared'
import type { JSONSchema7 } from 'json-schema'

/**
 * Vocabulário do gerador de documentação.
 *
 * Nasceu antes do gerador porque `defineDocs` é consumido
 * por todo controller e por `#core/response` desde a primeira feature -
 * declarar o contrato só quando o gerador existisse obrigaria a voltar em cada
 * controller para acrescentá-lo.
 *
 * O tipo central é `OperationDocs`: o que cada controller declara sobre a
 * própria operação. Só entra aqui o que o código não conta sozinho - rota,
 * método, parâmetros de caminho, segurança e os erros de infraestrutura são
 * derivados do router em `document.ts`.
 */

/** Um nó de JSON Schema, como o VineJS emite e como o OpenAPI 3.1 consome. */
export type SchemaObject = JSONSchema7

/**
 * Um validator do VineJS, visto só pelo que o gerador precisa dele.
 *
 * Estrutural em vez de `VineValidator<any, any>`: o gerador guarda validators
 * de formatos diferentes na mesma lista, e o genérico só serviria para ser
 * apagado com `any`. Declarar os dois métodos usados diz mais e não mente.
 *
 * `toJSONSchema()` entrega o schema publicável. `toJSON()` entrega a árvore
 * interna, que é o único lugar onde o subtipo de um campo sobrevive - é dela
 * que `schema.ts` descobre que um `{}` vazio era um `vine.date()`.
 */
export type DocumentedValidator = {
  toJSONSchema(): SchemaObject
  toJSON(): { schema: unknown }
}

/**
 * Resposta paginada. Marcador em vez de schema pronto porque `Paginated<T>` tem
 * forma fixa (`shared/src/records/pagination.ts`): o gerador monta o envelope e referencia
 * `PaginationMeta` uma vez só, em vez de repeti-lo em cada listagem.
 */
export type PaginatedResponse = {
  kind: 'paginated'
  item: DocumentedValidator | z.ZodType
}

/**
 * O que o registro de resposta guarda por ação: o schema `…Response` do `shared/`
 * (Zod, a fonte da régua) ou, para o que ainda não tem resposta lá, o validator.
 */
export type FeatureResponse = DocumentedValidator | z.ZodType

/**
 * O que uma operação pode devolver num dado status.
 *
 * Existe para a operação cuja resposta **não** é o recurso da feature: o plano
 * de upload de `storages` é um envelope próprio, e o redirect do download não
 * tem corpo nenhum. Sem isto, as duas sairiam documentadas como o recurso
 * `Storage`, que não é o que elas respondem.
 */
export type ResponseBody = DocumentedValidator | PaginatedResponse | z.ZodType | 'no-content'

/**
 * O contrato público de uma operação, declarado como `static docs` no
 * controller.
 *
 * Todo campo é opcional, e a maioria dos controllers só usa `summary` e
 * `description`: o gerador deriva rota, método, payload, resposta, status e os
 * erros de infraestrutura do próprio código (`introspect.ts`). Este bloco
 * existe para o que o código não conta - a prosa que explica a regra de negócio
 * - e para corrigir uma derivação errada.
 *
 * `errors` mapeia status para o(s) `code` que aquela operação pode devolver
 * naquele status, e é o que torna a lista de falhas exaustiva para quem gera
 * cliente a partir do documento. Os automáticos - 401 com `auth`, 403 com
 * `role`, 422 com qualquer validator, 500 sempre - e os que o gerador lê (o
 * use-case, a tabela de fatos e o `_shared.<recurso>-refusal.ts` que ele
 * importa) não se declaram: só o que nasce em outra camada da cadeia, como o
 * 403 da policy (`_standards/openapi.md`, "erros-do-use-case").
 *
 * `overrides` é a saída de emergência para o que o VineJS não expressa. É feito
 * merge por último, sobre o schema derivado.
 */
export type OperationDocs = {
  summary?: string
  description?: string
  /** Sobrescreve a tag derivada do caminho. Raro. */
  tag?: string
  body?: DocumentedValidator
  query?: DocumentedValidator
  params?: DocumentedValidator
  /**
   * A resposta por status, quando ela não é o recurso da feature. Raro: só
   * `storages`, que responde um plano de upload e um redirect sem corpo.
   */
  responses?: Record<number, ResponseBody>
  errors?: Record<number, string | string[]>
  overrides?: {
    body?: SchemaObject
    responses?: Record<number, SchemaObject>
  }
  deprecated?: boolean
}

/**
 * Identidade tipada. Existe para dar inferência e autocomplete na declaração
 * dentro do controller, sem custo em runtime.
 */
export function defineDocs(docs: OperationDocs): OperationDocs {
  return docs
}

/** Um controller visto pelo gerador: pode ou não ter declarado sua documentação. */
export type DocumentedController = {
  docs?: OperationDocs
}

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

export type OpenAPIOperation = {
  'operationId': string
  'summary': string
  'description'?: string
  'tags': string[]
  'deprecated'?: boolean
  'security'?: Array<Record<string, string[]>>
  /** Os papéis que a cadeia de middleware exige. Lido por `authz:check`. */
  'x-roles'?: string[]
  'parameters'?: OpenAPIParameter[]
  'requestBody'?: {
    required: boolean
    content: Record<string, { schema: SchemaObject }>
  }
  'responses': Record<string, OpenAPIResponse>
}

export type OpenAPIParameter = {
  name: string
  in: 'path' | 'query'
  required: boolean
  description?: string
  schema: SchemaObject
}

export type OpenAPIResponse = {
  description: string
  content?: Record<string, { schema: SchemaObject }>
}

export type OpenAPIDocument = {
  openapi: string
  info: Record<string, unknown>
  servers: Array<Record<string, unknown>>
  tags: Array<{ name: string; description: string }>
  paths: Record<string, Record<string, OpenAPIOperation>>
  components: {
    securitySchemes: Record<string, Record<string, string>>
    schemas: Record<string, SchemaObject>
  }
}
