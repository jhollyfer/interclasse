import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * One advisor, one classroom: the teacher only sees their own classroom, in the singular,
 * as the representative already did.
 *
 * Before the index, whoever already advised more than one classroom keeps only the oldest;
 * the others lose the advisor and go back to "No advisor", for the
 * administrator to name another. Without this the `unique` cannot be added to a database that
 * already had the repeated link.
 */
export default class extends BaseSchema {
  protected tableName = 'classrooms'

  override async up(): Promise<void> {
    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE classrooms SET advisor_id = NULL
        WHERE id IN (
          SELECT id FROM (
            SELECT id, row_number() OVER (
              PARTITION BY advisor_id ORDER BY created_at, id
            ) AS position
            FROM classrooms
            WHERE advisor_id IS NOT NULL
          ) ranked
          WHERE ranked.position > 1
        )
      `)
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['advisor_id'])
      table.unique(['advisor_id'])
    })
  }

  override async down(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['advisor_id'])
      table.index(['advisor_id'])
    })
  }
}
