import { BaseSchema } from '@adonisjs/lucid/schema'
import { ACTIVE_STATUS, ACTIVE_STATUSES, USER_ROLES } from '@interclasse/shared'

export default class extends BaseSchema {
  protected tableName = 'users'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.string('name', 120).notNullable()
      table.string('email', 254).notNullable().unique()
      table.string('password', 255).notNullable()
      // No `defaultTo`: the role is always explicit on the server. `backend-old`
      // fell back to `ADMINISTRATOR` by omission, and a forgotten creation path
      // silently wrote the most powerful role.
      table.enum('role', USER_ROLES).notNullable()
      table.enum('status', ACTIVE_STATUSES).notNullable().defaultTo(ACTIVE_STATUS.ACTIVE)
      // Whoever attaches keeps the reference, never the other way around - it is what allows a
      // single files table, with no "owner type" column. `SET NULL` and not
      // `CASCADE` as in `backend-old`: there, deleting the avatar image deleted
      // the whole account along with it.
      table.uuid('avatar_id').nullable().references('id').inTable('storages').onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.timestamp('deleted_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
