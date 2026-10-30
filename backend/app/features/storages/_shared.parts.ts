/**
 * A conta das partes de um upload: função pura sobre números já em mãos, usada
 * por `create` e `parts` (_standards/typescript.md §6, backend.md §4.9).
 */

/** Em quantas partes um arquivo deste tamanho é fatiado. Nunca menos que uma. */
export function countParts(size: number, partSize: number): number {
  return Math.max(1, Math.ceil(size / partSize))
}

/**
 * Os números das partes que ainda faltam, no máximo um lote.
 *
 * É o que serve tanto ao começo (`uploaded` vazio, devolve `[1, 2, 3, …]`)
 * quanto à retomada (devolve o buraco). O corte em `batch` (o `PRESIGNED_BATCH` do contrato do multipart) é o que
 * impede um arquivo grande de virar meio megabyte de URLs numa resposta só.
 */
export function pendingParts(input: {
  readonly totalParts: number
  readonly uploaded: ReadonlyArray<number>
  readonly batch: number
}): Array<number> {
  const received = new Set(input.uploaded)
  const pending: Array<number> = []

  for (let partNumber = 1; partNumber <= input.totalParts; partNumber++) {
    if (received.has(partNumber)) continue
    if (pending.length === input.batch) break

    pending.push(partNumber)
  }

  return pending
}
