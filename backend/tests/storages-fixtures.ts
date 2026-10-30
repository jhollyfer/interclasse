import { randomUUID } from 'node:crypto'

import { UPLOAD_STATUS } from '@interclasse/shared'

import Storage from '#models/storage'
import { PNG_HEAD } from '#tests/storages-unit-fixtures'

/**
 * Um corpo de PNG com o tamanho pedido, para os specs que sobem arquivo de
 * verdade: o `complete` confere o conteúdo contra o tipo declarado, e bytes
 * soltos seriam recusados.
 */
export function pngBytes(size: number, fill = 66): Uint8Array {
  const bytes = new Uint8Array(size).fill(fill)
  bytes.set(PNG_HEAD)

  return bytes
}

/**
 * Uma linha com os metadados escolhidos, para os testes de listagem.
 *
 * Separada do `record(status)` acima porque aquele fixa `originalName` e
 * `mimetype`, que são justamente as colunas que a busca e os filtros recortam.
 * `filename` sai aleatório para não repetir a mesma chave de bucket em duas
 * linhas.
 */
export function storageRow(attributes: Partial<Storage> = {}) {
  const filename = `${randomUUID()}.png`

  return Storage.create({
    filename,
    originalName: 'capa.png',
    mimetype: 'image/png',
    size: 1024,
    path: filename,
    status: UPLOAD_STATUS.UPLOADED,
    ...attributes,
  })
}
