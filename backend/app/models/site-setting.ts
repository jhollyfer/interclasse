import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Storage from '#models/storage'
import { SiteSettingSchema } from '#database/schema'

/** The games "About" and the regulation. A single row: see `SiteService`. */
export default class SiteSetting extends SiteSettingSchema {
  @belongsTo(() => Storage, { foreignKey: 'regulationId' })
  declare regulation: BelongsTo<typeof Storage>
}
