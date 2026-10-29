/**
 * O estado de um arquivo enquanto ele sobe. Existe porque o binário não passa
 * mais por esta aplicação: `POST /storages` grava a linha e devolve URLs
 * assinadas, o navegador sobe as partes direto no bucket, e só depois
 * `POST /storages/:id/complete` confirma. Entre uma coisa e outra a linha
 * existe sem binário íntegro, e é isso que `PENDING` nomeia.
 *
 * Só `UPLOADED` pode ser anexado a alguma coisa - o backend
 * recusa o resto, para nada apontar para um arquivo pela metade.
 */
export const UPLOAD_STATUS = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
} as const

export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS]

export const UPLOAD_STATUSES = Object.values(UPLOAD_STATUS)
