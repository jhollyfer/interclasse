import { BaseSchema } from '@adonisjs/lucid/schema'

import { PHOTO_STATUSES } from '#core/entity'

/**
 * As fotos do carrossel do site: atletas, jogos, a torcida. Quem envia é o
 * conselheiro ou o administrador; quem decide se vai para o site é o
 * administrador.
 */
export default class extends BaseSchema {
  protected tableName = 'photos'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      // `RESTRICT`: o arquivo só sai do storage depois da foto - apagá-lo antes
      // deixaria um buraco no carrossel.
      table
        .uuid('storage_id')
        .notNullable()
        .references('id')
        .inTable('storages')
        .onDelete('RESTRICT')
      table.string('caption', 200).nullable()
      table.enum('status', PHOTO_STATUSES).notNullable().index()
      // `SET NULL`: a conta apagada não leva a foto aprovada junto.
      table
        .uuid('author_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .index()
      table.uuid('reviewed_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('reviewed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
