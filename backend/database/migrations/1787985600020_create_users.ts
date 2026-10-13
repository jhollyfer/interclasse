import { BaseSchema } from '@adonisjs/lucid/schema'

import { ACTIVE_STATUSES, ActiveStatuses, USER_ROLES } from '#core/entity'

export default class extends BaseSchema {
  protected tableName = 'users'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.string('name', 120).notNullable()
      table.string('email', 254).notNullable().unique()
      table.string('password', 255).notNullable()
      // Sem `defaultTo`: o papel é sempre explícito no servidor. `backend-old`
      // caía em `ADMINISTRATOR` por omissão, e um caminho de criação esquecido
      // gravava o papel mais poderoso em silêncio.
      table.enum('role', USER_ROLES).notNullable()
      table.enum('status', ACTIVE_STATUSES).notNullable().defaultTo(ActiveStatuses.ACTIVE)
      // Quem anexa guarda a referência, nunca o contrário - é o que permite uma
      // tabela de arquivos só, sem coluna de "tipo de dono". `SET NULL` e não
      // `CASCADE` como em `backend-old`: lá, apagar a imagem do avatar apagava
      // a conta inteira junto.
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
