import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A single row in `site_settings`, guaranteed by the database (_standards/backend.md
 * §4.4): the unique index over the constant expression `(true)` makes every row
 * collide with the other. Without it, two simultaneous first reads created two
 * rows, and the screen started showing one at random.
 *
 * It does not delete data: if the table already has more than one row, the index is not added and
 * `migration:run` fails, so the organization picks which to keep by hand. Deleting the
 * "leftover" here would be an implicit contraction (§4.13).
 */
export default class extends BaseSchema {
  protected tableName = 'site_settings'

  override async up(): Promise<void> {
    this.schema.raw('CREATE UNIQUE INDEX site_settings_singleton ON site_settings ((true))')
  }

  override async down(): Promise<void> {
    this.schema.raw('DROP INDEX site_settings_singleton')
  }
}
