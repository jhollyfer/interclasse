import { DateTime } from 'luxon'

import { AnnouncementFactory } from '#database/factories/announcement.factory'

/**
 * Três avisos em datas diferentes, um deles fixado e o mais antigo de todos.
 *
 * A ordem padrão do painel e do site é "fixados primeiro, depois do mais novo
 * ao mais antigo": com o fixado sendo também o mais velho, uma listagem que
 * esquecesse o `pinned` o mandaria para o fim, e o teste perceberia.
 */
export async function announcementTimeline() {
  const pinned = await AnnouncementFactory.apply('pinned')
    .merge({ title: 'Fixado antigo', createdAt: DateTime.now().minus({ days: 3 }) })
    .create()
  const older = await AnnouncementFactory.merge({
    title: 'Intermediário',
    createdAt: DateTime.now().minus({ days: 1 }),
  }).create()
  const newest = await AnnouncementFactory.merge({ title: 'Recente' }).create()

  return { pinned, older, newest }
}
