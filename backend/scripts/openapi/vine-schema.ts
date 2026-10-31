import type { JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema'

import type { FieldPatch } from '#scripts/openapi/field-patches'
import type { DocumentedValidator, OpenAPIParameter, SchemaObject } from '#core/openapi/types'

/**
 * VineJS -> publishable JSON Schema.
 *
 * `validator.toJSONSchema()` does the heavy lifting, but it has measured gaps: a
 * `vine.date()` comes out as an empty `{}`, and an empty `{}` in an OpenAPI document
 * means "anything" - that is, the field would start to exist in the
 * documentation with no contract at all. Here that hole is plugged where possible and
 * reported where not.
 *
 * The fix is possible because `toJSON()` exposes the VineJS internal tree, with
 * the same shape as the generated schema: an object has `properties`, an array has `each`, and
 * the leaf keeps the `subtype` that JSON Schema lost. Walking both in
 * parallel gives the type back to the field.
 */

/** Node of the VineJS internal tree, with only what the traversal uses. */
type VineNode = {
  type?: string
  subtype?: string
  fieldName?: string
  allowNull?: boolean
  properties?: VineNode[]
  each?: VineNode
  schema?: VineNode
}

export class VineSchema {
  /**
   * Subtypes that VineJS cannot express in JSON Schema.
   *
   * `date`: `vine.date()` produces `{}`, and `vine.date().nullable()` produces
   * `{ "type": "null" }` - which is worse, because it claims the field can *only* be
   * null. The value comes out serialized as ISO 8601 by Luxon's `DateTime`, so
   * `date-time` is the honest format.
   *
   * `multipartFile`: `vine.file()` is an extension of the AdonisJS bodyparser
   * (`VineMultipartFile`), and VineJS has no way to represent a binary in JSON
   * Schema - it comes out `{}`. The subtype name is what the class declares. `string` with
   * `format: 'binary'` is how OpenAPI 3.1 describes an upload, and it is also what makes the
   * generator document the operation as `multipart/form-data` instead of JSON
   * (`requestContentType` in `document.ts`).
   */
  private static readonly SUBTYPE_FALLBACKS: Record<
    string,
    { type: JSONSchema7TypeName; format?: string }
  > = {
    date: { type: 'string', format: 'date-time' },
    multipartFile: { type: 'string', format: 'binary' },
  }

  /**
   * The schema that replaces what VineJS could not generate, preserving the
   * nullability declared on the node itself.
   */
  private static fallbackFor(node: VineNode | undefined): SchemaObject | undefined {
    const fallback = VineSchema.SUBTYPE_FALLBACKS[node?.subtype ?? '']

    if (!fallback) return undefined

    const schema: SchemaObject = { type: fallback.type }

    if (node?.allowNull) schema.type = [fallback.type, 'null']
    if (fallback.format) schema.format = fallback.format

    return schema
  }

  /**
   * A schema is useless when it says nothing (`{}`) or when it only says `null` - the two
   * cases that `vine.date()` produces.
   */
  private static isUninformative(schema: SchemaObject): boolean {
    if (Object.keys(schema).length === 0) return true

    return Object.keys(schema).length === 1 && schema.type === 'null'
  }

  /**
   * `vine.boolean()` becomes an `enum` with the nine representations it accepts -
   * `["1", 1, "true", true, "on", "0", 0, "false", false]`.
   *
   * It is true and it is useless: whoever reads the documentation sees a list of nine values in
   * place of "boolean", and whoever generates a typed client receives a union of those nine
   * literals instead of `boolean`. The type is `boolean`; the tolerance for an
   * HTML form becomes the description.
   */
  private static readonly BOOLEAN_COERCIONS = new Set<unknown>([
    '1',
    1,
    'true',
    true,
    'on',
    '0',
    0,
    'false',
    false,
  ])

  private static isCoercedBoolean(schema: SchemaObject): boolean {
    if (!Array.isArray(schema.enum)) return false
    if (schema.enum.length !== VineSchema.BOOLEAN_COERCIONS.size) return false

    return schema.enum.every(function (value) {
      return VineSchema.BOOLEAN_COERCIONS.has(value)
    })
  }

  private static isVineNode(value: unknown): value is VineNode {
    return typeof value === 'object' && value !== null
  }

  private static isSchemaObject(value: JSONSchema7Definition | undefined): value is SchemaObject {
    return typeof value === 'object' && value !== null
  }

  /**
   * The root of the internal tree. `toJSON().schema` is a `root` node that wraps the
   * real object.
   */
  private static rootNode(validator: DocumentedValidator): VineNode | undefined {
    const { schema } = validator.toJSON()

    if (!VineSchema.isVineNode(schema)) return undefined
    if (VineSchema.isVineNode(schema.schema)) return schema.schema

    return schema
  }

  /** Indexes the children of an object node by field name. */
  private static childrenByField(node: VineNode | undefined): Map<string, VineNode> {
    const children = new Map<string, VineNode>()

    if (!node?.properties) return children

    for (const child of node.properties) {
      if (!child.fieldName) continue

      children.set(child.fieldName, child)
    }

    return children
  }

  /**
   * Walks the schema and the internal tree together, returning a new schema with the
   * untyped fields resolved. Every field that stays untyped becomes a warning
   * naming route and path - under `--strict`, the command fails because of it.
   */
  private static patch(
    schema: SchemaObject,
    node: VineNode | undefined,
    context: string,
    path: string,
    warnings: string[],
  ): SchemaObject {
    if (VineSchema.isUninformative(schema)) {
      const fallback = VineSchema.fallbackFor(node)

      if (fallback) return fallback

      warnings.push(
        `${context}: field \`${path || '(root)'}\` came out untyped from VineJS. ` +
          'Describe it in `overrides` so it does not go into the document as "anything".',
      )

      return schema
    }

    if (VineSchema.isCoercedBoolean(schema)) {
      return {
        type: 'boolean',
        description:
          'Also accepts the HTML form representations: `"1"`, `"true"`, `"on"`, `"0"` and `"false"`.',
      }
    }

    const patched: SchemaObject = { ...schema }

    if (schema.properties) {
      const children = VineSchema.childrenByField(node)
      const properties: Record<string, SchemaObject> = {}

      for (const [field, definition] of Object.entries(schema.properties)) {
        if (!VineSchema.isSchemaObject(definition)) continue

        const childPath = [path, field].filter(Boolean).join('.')
        properties[field] = VineSchema.patch(
          definition,
          children.get(field),
          context,
          childPath,
          warnings,
        )
      }

      patched.properties = properties
    }

    // `items` as a tuple (array of schemas) is not generated by VineJS today; the
    // traversal ignores that format instead of pretending to understand it.
    if (!Array.isArray(schema.items) && VineSchema.isSchemaObject(schema.items)) {
      patched.items = VineSchema.patch(schema.items, node?.each, context, `${path}[]`, warnings)
    }

    return patched
  }

  /** The publishable schema of a validator, already fixed. */
  static toSchema(
    validator: DocumentedValidator,
    context: string,
    warnings: string[],
  ): SchemaObject {
    return VineSchema.patch(
      validator.toJSONSchema(),
      VineSchema.rootNode(validator),
      context,
      '',
      warnings,
    )
  }

  /**
   * Overlays the schema declared in `overrides` onto the derived one.
   *
   * `properties` merges key by key and `required` takes the union, so an override
   * can add a field without rewriting the whole object - which is
   * exactly the case of `passwordConfirmation`.
   */
  static mergeSchema(base: SchemaObject, override: SchemaObject | undefined): SchemaObject {
    if (!override) return base

    const merged: SchemaObject = { ...base, ...override }

    if (base.properties || override.properties) {
      merged.properties = { ...base.properties, ...override.properties }
    }

    if (base.required || override.required) {
      merged.required = [...new Set([...(base.required ?? []), ...(override.required ?? [])])]
    }

    return merged
  }

  /**
   * Applies the per-field-name fixes onto an already derived payload.
   *
   * It is the repair of what VineJS does not express, but applied wherever the field is,
   * instead of repeated in every controller that uses the rule. The companion field
   * inherits the requiredness of the original: an optional `password` in an update
   * cannot drag in a required `passwordConfirmation`.
   */
  static applyFieldPatches(
    schema: SchemaObject,
    patches: Record<string, FieldPatch>,
  ): SchemaObject {
    if (!schema.properties) return schema

    const properties: Record<string, JSONSchema7Definition> = { ...schema.properties }
    const required = new Set(schema.required ?? [])
    let touched = false

    for (const [field, correction] of Object.entries(patches)) {
      if (!(field in properties)) continue

      touched = true

      if (correction.schema) properties[field] = correction.schema

      if (!correction.companion) continue

      properties[correction.companion.name] = correction.companion.schema

      if (correction.companion.followsRequired && required.has(field)) {
        required.add(correction.companion.name)
      }
    }

    if (!touched) return schema

    return { ...schema, properties, required: [...required] }
  }

  // ---------------------------------------------------------------------------
  // Parameters
  // ---------------------------------------------------------------------------

  /**
   * Splits the schema of an object into the matching parameters.
   *
   * Query string and path parameters are declared as a single validator - the
   * same way the controller validates them - but OpenAPI wants them flattened, one
   * per field.
   */
  static toParameters(schema: SchemaObject, location: 'path' | 'query'): OpenAPIParameter[] {
    const parameters: OpenAPIParameter[] = []
    const required = schema.required ?? []

    for (const [name, definition] of Object.entries(schema.properties ?? {})) {
      if (!VineSchema.isSchemaObject(definition)) continue

      parameters.push({
        name,
        in: location,
        // A path parameter is always required: without it the route does not even match.
        required: location === 'path' || required.includes(name),
        schema: definition,
      })
    }

    return parameters
  }

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  /**
   * Mirrors `PaginationMeta` of `app/core/entity.ts`. It enters `components.schemas`
   * once and is referenced by every listing.
   */
  static readonly PAGINATION_META_SCHEMA: SchemaObject = {
    type: 'object',
    description: 'Page metadata, as the Lucid paginator returns it.',
    properties: {
      total: { type: 'integer' },
      perPage: { type: 'integer' },
      currentPage: { type: 'integer' },
      lastPage: { type: 'integer' },
      firstPage: { type: 'integer' },
      firstPageUrl: { type: 'string' },
      lastPageUrl: { type: 'string' },
      nextPageUrl: { type: ['string', 'null'] },
      previousPageUrl: { type: ['string', 'null'] },
    },
    required: [
      'total',
      'perPage',
      'currentPage',
      'lastPage',
      'firstPage',
      'firstPageUrl',
      'lastPageUrl',
      'nextPageUrl',
      'previousPageUrl',
    ],
  }

  static readonly PAGINATION_META_REF = '#/components/schemas/PaginationMeta'

  /** The `{ meta, data }` envelope around the item schema. */
  static paginatedSchema(item: SchemaObject): SchemaObject {
    return {
      type: 'object',
      properties: {
        meta: { $ref: VineSchema.PAGINATION_META_REF },
        data: { type: 'array', items: item },
      },
      required: ['meta', 'data'],
    }
  }
}
