import type { z } from '@interclasse/shared'
import type { JSONSchema7 } from 'json-schema'

/**
 * Vocabulary of the documentation generator.
 *
 * It was born before the generator because `defineDocs` is consumed
 * by every controller and by `#core/response` since the first feature -
 * declaring the contract only when the generator existed would force going back to every
 * controller to add it.
 *
 * The central type is `OperationDocs`: what each controller declares about its
 * own operation. Only what the code does not tell by itself goes in here - route,
 * method, path parameters, security and the infrastructure errors are
 * derived from the router in `document.ts`.
 */

/** A JSON Schema node, as VineJS emits it and OpenAPI 3.1 consumes it. */
export type SchemaObject = JSONSchema7

/**
 * A VineJS validator, seen only for what the generator needs from it.
 *
 * Structural instead of `VineValidator<any, any>`: the generator keeps validators
 * of different shapes in the same list, and the generic would only serve to be
 * erased with `any`. Declaring the two methods used says more and does not lie.
 *
 * `toJSONSchema()` delivers the publishable schema. `toJSON()` delivers the internal
 * tree, which is the only place where a field's subtype survives - it is from it
 * that `schema.ts` finds out an empty `{}` was a `vine.date()`.
 */
export type DocumentedValidator = {
  toJSONSchema(): SchemaObject
  toJSON(): { schema: unknown }
}

/**
 * Paginated response. A marker instead of a ready schema because `Paginated<T>` has a
 * fixed shape (`shared/src/records/pagination.ts`): the generator builds the envelope and references
 * `PaginationMeta` only once, instead of repeating it in every listing.
 */
export type PaginatedResponse = {
  kind: 'paginated'
  item: DocumentedValidator | z.ZodType
}

/**
 * What the response registry keeps per action: the `…Response` schema of `shared/`
 * (Zod, the source of the standard) or, for what does not have a response there yet, the validator.
 */
export type FeatureResponse = DocumentedValidator | z.ZodType

/**
 * What an operation can return at a given status.
 *
 * It exists for the operation whose response is **not** the feature resource: the
 * `storages` upload plan is its own envelope, and the download redirect has
 * no body at all. Without this, both would be documented as the `Storage`
 * resource, which is not what they answer.
 */
export type ResponseBody = DocumentedValidator | PaginatedResponse | z.ZodType | 'no-content'

/**
 * The public contract of an operation, declared as `static docs` in the
 * controller.
 *
 * Every field is optional, and most controllers only use `summary` and
 * `description`: the generator derives route, method, payload, response, status and the
 * infrastructure errors from the code itself (`introspect.ts`). This block
 * exists for what the code does not tell - the prose that explains the business rule
 * - and to correct a wrong derivation.
 *
 * `errors` maps status to the `code`(s) that operation can return
 * at that status, and is what makes the failure list exhaustive for whoever generates a
 * client from the document. The automatic ones - 401 with `auth`, 403 with
 * `role`, 422 with any validator, 500 always - and the ones the generator reads (the
 * use case, the facts table and the `_shared.<resource>-refusal.ts` it
 * imports) are not declared: only what is born in another layer of the chain, like the
 * policy's 403 (`_standards/openapi.md`, "use-case-errors").
 *
 * `overrides` is the escape hatch for what VineJS does not express. It is
 * merged last, over the derived schema.
 */
export type OperationDocs = {
  summary?: string
  description?: string
  /** Overrides the tag derived from the path. Rare. */
  tag?: string
  body?: DocumentedValidator
  query?: DocumentedValidator
  params?: DocumentedValidator
  /**
   * The response per status, when it is not the feature resource. Rare: only
   * `storages`, which answers an upload plan and a redirect with no body.
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
 * Typed identity. It exists to give inference and autocomplete in the declaration
 * inside the controller, at no runtime cost.
 */
export function defineDocs(docs: OperationDocs): OperationDocs {
  return docs
}

/** A controller as the generator sees it: it may or may not have declared its documentation. */
export type DocumentedController = {
  docs?: OperationDocs
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export type OpenAPIOperation = {
  'operationId': string
  'summary': string
  'description'?: string
  'tags': string[]
  'deprecated'?: boolean
  'security'?: Array<Record<string, string[]>>
  /** The roles the middleware chain requires. Read by `authz:check`. */
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
