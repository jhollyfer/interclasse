import { z } from '@interclasse/shared'

import type { SchemaObject } from '#core/openapi/types'

/**
 * The Zod response schema of `shared/` as JSON Schema, without an AST
 * (`_standards/openapi.md`, "schema-de-resposta"; _doc-lib/zod.md#json-schema).
 *
 * `io: 'output'` because the document describes what the route returns. A type with no
 * JSON Schema representation (`z.date()`, `transform`) Zod refuses instead of
 * silencing, and that is what we want: the response schema uses the transport type.
 */
export class ZodSchema {
  static is(value: unknown): value is z.ZodType {
    return value instanceof z.ZodType
  }

  static toOpenAPI(schema: z.ZodType): SchemaObject {
    // Zod's JSON Schema type is wider than the document's; the round trip
    // through JSON yields plain data, and the guard narrows without `as`.
    const json: unknown = JSON.parse(JSON.stringify(z.toJSONSchema(schema, { io: 'output' })))
    if (!ZodSchema.isObject(json)) throw new Error('Zod JSON Schema is not an object')

    const { $schema: _dialect, ...body } = json

    return body
  }

  private static isObject(value: unknown): value is SchemaObject & { $schema?: string } {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
