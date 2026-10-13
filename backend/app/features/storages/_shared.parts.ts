import { PRESIGNED_BATCH } from '#services/multipart/multipart-contract.service'

/**
 * A conta das partes de um upload: função pura sobre números já em mãos, usada
 * por `create` e `parts` (_padroes/typescript.md §6, backend.md §4.9).
 */

/** Em quantas partes um arquivo deste tamanho é fatiado. Nunca menos que uma. */
export function countParts(size: number, partSize: number): number {
  return Math.max(1, Math.ceil(size / partSize))
}

/**
 * Os números das partes que ainda faltam, no máximo um lote.
 *
 * É o que serve tanto ao começo (`uploaded` vazio, devolve `[1, 2, 3, …]`)
 * quanto à retomada (devolve o buraco). O corte em `PRESIGNED_BATCH` é o que
 * impede um arquivo grande de virar meio megabyte de URLs numa resposta só.
 */
export function pendingParts(totalParts: number, uploaded: ReadonlyArray<number>): Array<number> {
  const received = new Set(uploaded)
  const pending: Array<number> = []

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    if (received.has(partNumber)) continue
    if (pending.length === PRESIGNED_BATCH) break

    pending.push(partNumber)
  }

  return pending
}
