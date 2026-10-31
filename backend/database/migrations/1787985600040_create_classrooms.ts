import { BaseSchema } from '@adonisjs/lucid/schema'
import { CATEGORIES } from '@interclasse/shared'

export default class extends BaseSchema {
  protected tableName = 'classrooms'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      // "9º A". Unique: it is the name that appears on the scoreboard, and two classrooms with the same
      // name would be indistinguishable in the match table.
      table.string('name', 20).notNullable().unique()
      table.smallint('grade').notNullable()
      // Derived from `grade` in the use case, and stored so the bracket filters without
      // repeating the rule in SQL.
      table.enum('category', CATEGORIES).notNullable()
      // `SET NULL`: deleting the teacher's account does not delete the classroom, which stays without an
      // advisor until the administrator names another.
      table
        .uuid('advisor_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .index()
      // Unique: the representative sees "their own classroom", in the singular. Two
      // links would make the question ambiguous.
      table
        .uuid('representative_id')
        .nullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
