import type { SchemaObject } from '#core/openapi/types'

/**
 * Documentation fixes for the shared rules of `#core/validator`.
 *
 * They live in one place, and not inside each controller, because the divergence belongs to the
 * helper: whoever changes `password()` sees the fix next to the others, instead of
 * finding out through a wrong document months later.
 *
 * The generator applies these fixes by **field name**, in any payload
 * where the field appears. Three validators use `password()`; declaring the repair
 * in three controllers would guarantee the fourth was born wrong.
 */

/**
 * A field whose derived schema needs to be fixed, and the companion field
 * it drags into the payload.
 */
export type FieldPatch = {
  schema?: SchemaObject
  companion?: {
    name: string
    schema: SchemaObject
    /** The companion is required exactly when the original field is. */
    followsRequired: boolean
  }
}

/**
 * What `password()` validates and JSON Schema does not tell.
 *
 * Two losses, both measured on the VineJS 4.4.0 output:
 *
 * 1. The four `.regex()` - lowercase, uppercase, digit and special - become a
 *    single `pattern`, the last one. The document would claim that `abcdefg!` passes.
 *    `allOf` expresses the conjunction the field really requires.
 * 2. `passwordConfirmation` does not exist in the generated schema: `.confirmed()` reads the
 *    field from the raw input, so it never enters the validated payload - but it is
 *    required in the request.
 */
export const FIELD_PATCHES: Record<string, FieldPatch> = {
  /**
   * `vine.date()` comes out as an empty `{}`, and the `schema.ts` fallback completes it
   * with `date-time` - which is right for `createdAt` and wrong here. A `date`
   * column stores the day, Lucid serializes it with `toISODate()`, and the response documents `format: "date"`.
   * Without this fix the same field would come out `date-time` on input and `date` on
   * output, and a client generated from the document would send the full instant the
   * validator refuses.
   */
  date: {
    schema: {
      type: 'string',
      format: 'date',
      description: 'Date in the `YYYY-MM-DD` format.',
    },
  },
  password: {
    schema: {
      type: 'string',
      minLength: 8,
      maxLength: 32,
      description:
        'Requires at least one lowercase letter, one uppercase letter, one digit and one special character.',
      allOf: [
        { pattern: '[a-z]' },
        { pattern: '[A-Z]' },
        { pattern: '[0-9]' },
        { pattern: '[^a-zA-Z0-9]' },
      ],
    },
    companion: {
      name: 'passwordConfirmation',
      schema: { type: 'string', description: 'Exact repetition of `password`.' },
      followsRequired: true,
    },
  },
}
