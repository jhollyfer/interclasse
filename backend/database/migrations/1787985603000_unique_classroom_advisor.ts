import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Um conselheiro, uma turma: o professor só enxerga a turma dele, no singular,
 * como o representante já enxergava.
 *
 * Antes do índice, quem já aconselhava mais de uma turma fica só com a mais
 * antiga; as outras perdem o conselheiro e voltam a "Sem conselheiro", para o
 * administrador indicar outro. Sem isso o `unique` não entra num banco que já
 * tinha o vínculo repetido.
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
