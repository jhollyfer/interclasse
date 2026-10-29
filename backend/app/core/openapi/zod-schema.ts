import { z } from '@interclasse/shared'

import type { SchemaObject } from '#core/openapi/types'

/**
 * O schema Zod de resposta do `shared/` como JSON Schema, sem AST
 * (`_standards/openapi.md`, "schema-de-resposta"; _doc-lib/zod.md#json-schema).
 *
 * `io: 'output'` porque o documento descreve o que a rota devolve. Tipo sem
 * representação em JSON Schema (`z.date()`, `transform`) o Zod recusa em vez de
 * calar, e é o que se quer: o schema de resposta usa o tipo de transporte.
 */
export class ZodSchema {
  static is(value: unknown): value is z.ZodType {
    return value instanceof z.ZodType
  }

  static toOpenAPI(schema: z.ZodType): SchemaObject {
    // O tipo de JSON Schema do Zod é mais largo que o do documento; a ida e
    // volta pelo JSON entrega dado puro, e a guarda estreita sem `as`.
    const json: unknown = JSON.parse(JSON.stringify(z.toJSONSchema(schema, { io: 'output' })))
    if (!ZodSchema.isObject(json)) throw new Error('JSON Schema do Zod não é objeto')

    const { $schema: _dialect, ...body } = json

    return body
  }

  private static isObject(value: unknown): value is SchemaObject & { $schema?: string } {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
