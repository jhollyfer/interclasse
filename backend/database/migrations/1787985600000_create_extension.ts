import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  override async up(): Promise<void> {
    await this.db.rawQuery('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  }

  override async down(): Promise<void> {
    await this.db.rawQuery('DROP EXTENSION IF EXISTS "uuid-ossp"')
  }
}
