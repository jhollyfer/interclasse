import factory from '@adonisjs/lucid/factories'

import Storage from '#models/storage'
import { UploadStatuses } from '#core/entity'

/**
 * Registro de arquivo. A factory grava só a linha na tabela: nada vai para o
 * bucket.
 *
 * Isso basta para tudo o que o teste precisa - `cover_id`, `audio_id`,
 * `avatar_id` e os pivôs de galeria - porque a `url` da resposta é derivada
 * pelo hook de `app/models/storage.ts` a partir de `path`. A URL sai
 * preenchida no JSON; abrir a URL dá 404, e é o esperado.
 *
 * `path` é igual a `filename`, sem diretório nenhum: é exatamente a chave que
 * o upload grava no bucket.
 *
 * Nasce `UPLOADED` porque é o único estado anexável a um recurso - um
 * `PENDING` é upload em andamento, e nenhum use-case aceita.
 */
export const StorageFactory = factory
  .define(Storage, ({ faker }) => {
    const filename = `${faker.string.uuid()}.png`

    return {
      filename,
      originalName: 'capa.png',
      mimetype: 'image/png',
      size: 1024,
      path: filename,
      status: UploadStatuses.UPLOADED,
    }
  })
  .build()
