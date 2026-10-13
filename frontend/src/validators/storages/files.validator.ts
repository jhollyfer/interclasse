import { vine, paginationFields, sortFields } from '#/lib/validator'
import type { Infer } from '#/lib/validator'
import { STORAGE_MIMETYPES, UPLOAD_STATUSES } from '#/lib/entity'

/**
 * O que `POST /storages` recebe: metadados, nunca bytes.
 *
 * O binário vai do navegador direto ao bucket, então tipo e tamanho são
 * **declarados** aqui e conferidos contra o objeto real no
 * `POST /storages/:id/complete`.
 *
 * Sem o teto de `size`: ele é `UPLOAD_MAX_SIZE`, que é do ambiente do servidor e
 * não existe aqui. Quem sabe o teto do cliente é a variável de ambiente do
 * frontend, e a checagem mora no componente que escolhe o arquivo - copiar um
 * número para cá seria uma terceira fonte de verdade sobre o mesmo limite.
 */
export const FileCreateValidator = vine.create({
  fileName: vine.string().trim().minLength(1).maxLength(255),
  mimetype: vine.enum(STORAGE_MIMETYPES),
  size: vine.number().min(1).withoutDecimals(),
})

export type FileCreatePayload = Infer<typeof FileCreateValidator>

/**
 * O que `POST /storages/:id/complete` recebe: o `ETag` de cada parte enviada.
 *
 * Vazio - ou ausente - é upload de parte única, que não tem parte para
 * confirmar. O teto de dez mil é o do próprio S3.
 */
export const FileCompleteValidator = vine.create({
  parts: vine
    .array(
      vine.object({
        partNumber: vine.number().min(1).max(10_000).withoutDecimals(),
        etag: vine.string().trim().maxLength(64).minLength(1),
      }),
    )
    .optional(),
})

export type FileCompletePayload = Infer<typeof FileCompleteValidator>

/**
 * Por quais colunas a biblioteca de arquivos pode ser ordenada.
 *
 * `path` e `uploadId` ficam de fora de propósito - são detalhe do bucket e do
 * multipart, e ordenar por eles não é pergunta que a tela faça.
 */
export const STORAGE_SORT_COLUMNS = [
  'originalName',
  'mimetype',
  'size',
  'createdAt',
] as const

/**
 * O que `GET /storages` recebe.
 *
 * Sem `trashedField()`: `storages` tem `deleted_at`, mas apagar arquivo é
 * `DELETE /storages/:id`, que remove a linha **e** o binário. Não há lixeira de
 * arquivo para restaurar.
 */
export const FilePaginateValidator = vine.create({
  ...paginationFields(),
  status: vine.enum(UPLOAD_STATUSES).optional(),
  // A lista fechada, e não texto livre: é a mesma tupla que `POST /storages`
  // aceita, então filtrar por um tipo que a API nunca grava é 422 em vez de uma
  // página vazia que parece um bug.
  mimetype: vine.enum(STORAGE_MIMETYPES).optional(),
  ...sortFields(STORAGE_SORT_COLUMNS),
})

export type FilePaginatePayload = Infer<typeof FilePaginateValidator>
