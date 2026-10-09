/**
 * A aritmética do fatiamento, isolada do DOM e da rede.
 *
 * Fica aqui, e não dentro do hook, porque é a parte que erra em silêncio: uma
 * fronteira de byte trocada não estoura exceção nenhuma - ela grava um arquivo
 * corrompido que só aparece quando alguém tenta abrir. Isolada, ela é testável
 * com números, sem subir arquivo nenhum.
 */

/** Uma parte, e onde ela começa e termina dentro do arquivo. */
export type PartPlan = {
  partNumber: number
  start: number
  /** Exclusivo, como o `end` de `Blob.slice`. */
  end: number
}

/**
 * O plano de fatiamento de um arquivo.
 *
 * As partes são numeradas a partir de **1**, e não de zero, porque é o que o S3
 * exige - `PartNumber` zero é erro. A última parte é a sobra, e pode ser
 * qualquer tamanho.
 *
 * Arquivo vazio ainda dá uma parte: um `PUT` de zero byte é um arquivo válido, e
 * devolver plano vazio faria o upload "terminar" sem nunca ter enviado nada.
 */
export function planParts(size: number, partSize: number): Array<PartPlan> {
  const total = Math.max(1, Math.ceil(size / partSize))
  const parts: Array<PartPlan> = []

  for (let index = 0; index < total; index++) {
    const start = index * partSize

    parts.push({
      partNumber: index + 1,
      start,
      // A última parte termina no fim do arquivo, e não no múltiplo do tamanho
      // da parte - sem o `min`, `Blob.slice` pediria além do fim.
      end: Math.min(start + partSize, size),
    })
  }

  return parts
}

/**
 * O que ainda falta enviar: o plano menos o que o servidor disse já ter.
 *
 * É o coração da retomada. Se 1499 partes subiram, isto devolve a 1500 em
 * diante - nunca a primeira.
 */
export function missingParts(
  plan: Array<PartPlan>,
  uploaded: Array<number>,
): Array<PartPlan> {
  const received = new Set(uploaded)

  return plan.filter((part) => !received.has(part.partNumber))
}
