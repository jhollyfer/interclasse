import { STORAGE_MIMETYPES, STORAGE_SORT_COLUMNS, UPLOAD_STATUSES } from '@interclasse/shared'

import { vine, paginationFields, sortFields } from '#core/validator'
import type { Infer } from '#core/validator'
import env from '#start/env'

/**
 * O que `POST /storages` recebe: metadados, nunca bytes.
 *
 * O binário vai do navegador direto ao bucket, então tipo e tamanho
 * são **declarados** aqui e conferidos contra o objeto real no
 * `POST /storages/:id/complete`. Recusar antes de assinar é o que impede um
 * arquivo proibido de chegar ao bucket; conferir depois é o que impede que o
 * declarado tenha sido mentira.
 */
/**
 * O teto por arquivo, em bytes. Vem do ambiente e não tem default: sem a
 * variável a aplicação nem sobe (`start/env.ts`). A coluna `size` é
 * `bigint` justamente para não impor aqui um teto que o operador não pediu.
 */
export const UPLOAD_MAX_SIZE = env.get('UPLOAD_MAX_SIZE')

export const StoragesFileCreateValidator = vine.create({
  fileName: vine.string().trim().minLength(1).maxLength(255),
  mimetype: vine.enum(STORAGE_MIMETYPES),
  size: vine.number().min(1).max(UPLOAD_MAX_SIZE).withoutDecimals(),
})

export type StoragesFileCreatePayload = Infer<typeof StoragesFileCreateValidator>

/**
 * O que `POST /storages/:id/complete` recebe: o `ETag` de cada parte enviada.
 *
 * Vazio - ou ausente - é upload de parte única, que não tem parte para
 * confirmar. O teto de dez mil é o do próprio S3.
 */
export const StoragesFileCompleteValidator = vine.create({
  parts: vine
    .array(
      vine.object({
        partNumber: vine.number().min(1).max(10_000).withoutDecimals(),
        etag: vine.string().trim().maxLength(64).minLength(1),
      }),
    )
    .optional(),
})

export type StoragesFileCompletePayload = Infer<typeof StoragesFileCompleteValidator>

/**
 * O que `GET /storages` recebe.
 *
 * A biblioteca de arquivos do painel: `?search` acha pelo rótulo original, pelo
 * nome gerado ou pelo tipo - é a busca de `backend-old`, nas colunas que
 * sobreviveram ao de-para -, e `?status` e `?mimetype` recortam o que já subiu
 * e o que é imagem.
 *
 * Sem `trashedField()`: `storages` tem `deleted_at`, mas apagar arquivo é
 * `DELETE /storages/:id`, que remove a linha **e** o binário. Não há lixeira de
 * arquivo para restaurar, e o parâmetro seria aceito e ignorado em silêncio.
 */
export const StoragesFilePaginateValidator = vine.create({
  ...paginationFields(),
  status: vine.enum(UPLOAD_STATUSES).optional(),
  // A lista fechada, e não texto livre: é a mesma tupla que `POST /storages`
  // aceita, então filtrar por um tipo que a API nunca grava é 422 em vez de uma
  // página vazia que parece um bug.
  mimetype: vine.enum(STORAGE_MIMETYPES).optional(),
  ...sortFields(STORAGE_SORT_COLUMNS),
})

export type StoragesFilePaginatePayload = Infer<typeof StoragesFilePaginateValidator>
