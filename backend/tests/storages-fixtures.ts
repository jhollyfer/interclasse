import { randomUUID } from 'node:crypto'

import { DateTime } from 'luxon'
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

/** Se a linha de `storages` ainda existe, para o spec conferir o efeito sem importar o model. */
export async function storageExists(id: string): Promise<boolean> {
  return (await Storage.find(id)) !== null
}

/** Envelhece a linha no banco: é a idade que o comando de limpeza usa para decidir. */
export async function ageStorage(id: string, hours: number): Promise<void> {
  await Storage.query()
    .where('id', id)
    .update({ created_at: DateTime.now().minus({ hours }).toSQL() })
}
