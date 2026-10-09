import type { JSONSchema7 } from 'json-schema'
import type { LucidModel } from '@adonisjs/lucid/types/model'

/**
 * Vocabulário do gerador de documentação.
 *
 * Nasceu antes do gerador porque `defineDocs` e `ModelResource` são consumidos
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
 * Um recurso derivado de um model do Lucid.
 *
 * A resposta de um endpoint é o model serializado com as relações que o
 * use-case precarregou. Declarar o model e as relações é declarar o contrato
 * inteiro - nome, visibilidade e tipo de cada campo saem do próprio Lucid e do
 * TypeScript, em `model-schema.ts`.
 *
 * Relação **não** declarada em `relations` não entra: listar toda relação do
 * model prometeria dado que nenhum `preload` traz.
 */
export type ModelResource = {
  model: LucidModel
  relations?: RelationMap
  /**
   * O `enum` de uma coluna. `database/schema.ts` é gerado das colunas e tipa
   * todo enum de banco como `string`; sem isto o documento diria texto onde o
   * endpoint aceita dois valores.
   */
  enums?: Record<string, readonly string[]>
  /** O que nem o AST nem o Lucid contam. Sobrescreve o derivado. */
  fields?: Record<string, SchemaObject>
}

/** As relações aninhadas de um recurso. `[recurso]` é lista; sem colchete, um. */
export type RelationMap = Record<string, ModelResource | [ModelResource]>

/** Uma resposta que é uma lista crua, sem envelope de paginação. */
export type ListResource = { kind: 'list'; item: ModelResource }

export function list(item: ModelResource): ListResource {
  return { kind: 'list', item }
}

export function isModelResource(value: unknown): value is ModelResource {
  return typeof value === 'object' && value !== null && 'model' in value
}

export function isListResource(value: unknown): value is ListResource {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'list'
}

/**
 * Resposta paginada. Marcador em vez de schema pronto porque `Paginated<T>` tem
 * forma fixa (`app/core/entity.ts`): o gerador monta o envelope e referencia
 * `PaginationMeta` uma vez só, em vez de repeti-lo em cada listagem.
 */
export type PaginatedResponse = {
  kind: 'paginated'
  item: DocumentedValidator | ModelResource
}

export function paginated(item: DocumentedValidator | ModelResource): PaginatedResponse {
  return { kind: 'paginated', item }
}

/**
 * O que uma feature devolve, em `#core/response`.
 *
 * `DocumentedValidator` entra para a vitrine: a resposta pública **não** é o
 * model serializado inteiro, e sim o recorte de `StorefrontShapeService`. Um
 * `ModelResource` ali documentaria as colunas que o `pick` deixa de fora - o
 * documento prometeria `deletedAt` e `path` de bucket que nenhuma rota devolve.
 */
export type FeatureResponse = ModelResource | ListResource | DocumentedValidator

/**
 * O que uma operação pode devolver num dado status.
 *
 * Existe para a operação cuja resposta **não** é o recurso da feature: o plano
 * de upload de `storages` é um envelope declarado em VineJS, e o redirect do
 * download não tem corpo nenhum. Sem isto, as duas sairiam documentadas como o
 * model de `Storage`, que não é o que elas respondem.
 */
export type ResponseBody =
  DocumentedValidator | PaginatedResponse | ModelResource | ListResource | 'no-content'

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
 * `role`, 422 com qualquer validator, 500 sempre - não precisam ser declarados.
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
