import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { type PhotoStatus } from '@interclasse/shared'

import Storage from '#models/storage'
import User from '#models/user'
import { PhotoSchema } from '#database/schema'

/** Uma foto do carrossel do site, com quem enviou e a decisão da organização. */
export default class Photo extends PhotoSchema {
  declare status: PhotoStatus

  @belongsTo(() => Storage)
  declare storage: BelongsTo<typeof Storage>

  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>
}
