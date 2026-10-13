import {
  vine,
  paginationFields,
  sortFields,
  STORAGE_MIMETYPES,
  UPLOAD_MAX_SIZE,
} from '#core/validator'
import type { Infer } from '#core/validator'
import { UPLOAD_STATUSES } from '#core/entity'

/**
 * O que `POST /storages` recebe: metadados, nunca bytes.
 *
 * O binário vai do navegador direto ao bucket, então tipo e tamanho
 * são **declarados** aqui e conferidos contra o objeto real no
 * `POST /storages/:id/complete`. Recusar antes de assinar é o que impede um
 * arquivo proibido de chegar ao bucket; conferir depois é o que impede que o
 * declarado tenha sido mentira.
 */
export const StorageCreateValidator = vine.create({
  fileName: vine.string().trim().minLength(1).maxLength(255),
  mimetype: vine.enum(STORAGE_MIMETYPES),
  size: vine.number().min(1).max(UPLOAD_MAX_SIZE).withoutDecimals(),
})

export type StorageCreatePayload = Infer<typeof StorageCreateValidator>

/**
 * O que `POST /storages/:id/complete` recebe: o `ETag` de cada parte enviada.
 *
 * Vazio - ou ausente - é upload de parte única, que não tem parte para
 * confirmar. O teto de dez mil é o do próprio S3.
 */
export const StorageCompleteValidator = vine.create({
  parts: vine
    .array(
      vine.object({
        partNumber: vine.number().min(1).max(10_000).withoutDecimals(),
        etag: vine.string().trim().maxLength(64).minLength(1),
      })
    )
    .optional(),
})

export type StorageCompletePayload = Infer<typeof StorageCompleteValidator>

/**
 * Por quais colunas a biblioteca de arquivos pode ser ordenada.
 *
 * Tupla fechada pelo mesmo motivo das outras: o valor entra direto no
 * `orderBy`, que o compõe no SQL, e texto livre da URL seria entregar a
 * cláusula ao cliente.
 *
 * `path` e `uploadId` ficam de fora de propósito - são detalhe do bucket e do
 * multipart, e ordenar por eles não é pergunta que a tela faça.
 */
export const STORAGE_SORT_COLUMNS = ['originalName', 'mimetype', 'size', 'createdAt'] as const

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
export const StoragePaginationValidator = vine.create({
  ...paginationFields(),
  status: vine.enum(UPLOAD_STATUSES).optional(),
  // A lista fechada, e não texto livre: é a mesma tupla que `POST /storages`
  // aceita, então filtrar por um tipo que a API nunca grava é 422 em vez de uma
  // página vazia que parece um bug.
  mimetype: vine.enum(STORAGE_MIMETYPES).optional(),
  ...sortFields(STORAGE_SORT_COLUMNS),
})

export type StoragePaginationPayload = Infer<typeof StoragePaginationValidator>
