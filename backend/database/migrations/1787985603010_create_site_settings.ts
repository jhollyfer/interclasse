import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * O que o site mostra sobre os jogos e que só a organização sabe: o texto do
 * "Sobre", a edição em curso, desde quando acontece, quem organiza, os
 * Instagrams e o regulamento em PDF.
 *
 * Uma linha só (singleton). Tabela e não variável de ambiente: quem muda é o
 * administrador, pela tela, sem deploy.
 */
export default class extends BaseSchema {
  protected tableName = 'site_settings'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.text('about').nullable()
      table.string('organizer', 160).nullable()
      table.smallint('first_edition_year').nullable()
      table.smallint('edition').nullable()
      table.string('school_instagram', 60).nullable()
      table.string('developer_instagram', 60).nullable()
      // `SET NULL`: o arquivo apagado do storage tira o botão de baixar, não a
      // configuração inteira.
      table
        .uuid('regulation_id')
        .nullable()
        .references('id')
        .inTable('storages')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
