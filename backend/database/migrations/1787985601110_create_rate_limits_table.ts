import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * O contador de tentativas do `@adonisjs/limiter`.
 *
 * O formato das colunas é do pacote, e não nosso: ele lê e escreve por conta
 * própria, sem model Lucid. Por isso também não há `deleted_at` nem os
 * timestamps do resto do schema - a linha some quando expira
 * (`clearExpiredByTimeout`), e uma linha de contador não é registro do domínio.
 */
export default class extends BaseSchema {
  protected tableName = 'rate_limits'

  async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.string('key', 255).notNullable().primary()
      table.integer('points', 9).notNullable().defaultTo(0)
      table.bigint('expire').unsigned()
    })
  }

  async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
