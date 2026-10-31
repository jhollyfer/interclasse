import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

/**
 * What the `database/schema.ts` generator needs to know and cannot read from the
 * database.
 *
 * Today only one thing: which columns are **not** in the response. Lucid's default
 * is to serialize every column, and `database/schema.ts` is generated — declaring
 * `serializeAs: null` on the model does not survive the next generation. Here it survives.
 *
 * The cut is narrow on purpose: what is **equivalent to a credential** goes in,
 * not every sensitive datum. `cpf`, `email` and `phone` are shown by the authenticated
 * screens by design, and the storefront already filters them in
 * `storefront-shape.service.ts` — hiding them here would break the panel screen
 * without closing any hole.
 */
export default {
  tables: {
    auth_access_tokens: {
      columns: {
        // The value that proves the session. No route serializes this model today, and
        // that is exactly why the protection needs to be here: whoever
        // adds a `preload` tomorrow will not remember.
        hash: {
          tsType: 'string',
          decorators: [{ name: '@column', args: { serializeAs: null } }],
        },
      },
    },
  },
} satisfies SchemaRules
