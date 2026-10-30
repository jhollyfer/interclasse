import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Storage from '#models/storage'
import { SiteSettingSchema } from '#database/schema'

/** O "Sobre" dos jogos e o regulamento. Uma linha só: ver `SiteService`. */
export default class SiteSetting extends SiteSettingSchema {
  @belongsTo(() => Storage, { foreignKey: 'regulationId' })
  declare regulation: BelongsTo<typeof Storage>
}
