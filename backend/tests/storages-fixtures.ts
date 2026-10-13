import { randomUUID } from 'node:crypto'
import Storage from '#models/storage'
import { UploadStatuses } from '#core/entity'

/**
 * Uma linha com os metadados escolhidos, para os testes de listagem.
 *
 * Separada do `record(status)` acima porque aquele fixa `originalName` e
 * `mimetype`, que são justamente as colunas que a busca e os filtros recortam.
 * `filename` sai aleatório para não repetir a mesma chave de bucket em duas
 * linhas.
 */
export function linha(attributes: Partial<Storage> = {}) {
  const filename = `${randomUUID()}.png`

  return Storage.create({
    filename,
    originalName: 'capa.png',
    mimetype: 'image/png',
    size: 1024,
    path: filename,
    status: UploadStatuses.UPLOADED,
    ...attributes,
  })
}
