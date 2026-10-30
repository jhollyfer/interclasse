/**
 * Do que o `<input>` entrega para o que o schema do `shared/` espera.
 *
 * O Zod não converte `''` em ausente como o VineJS fazia
 * (`convertEmptyStringsToNull`): campo apagado chega como texto vazio, e
 * `.min(8)` ou `.regex()` o recusariam. A conversão fica no campo, no
 * `onChange`, e o valor do formulário já nasce na forma do contrato.
 */

/** Texto apagado vira `null`: apaga o dado em vez de gravar `''`. */
export function blankToNull(value: string): string | null {
  if (value.trim() === '') return null

  return value
}

/** Texto apagado vira ausente: campo opcional "em branco = não mexer". */
export function blankToUndefined(value: string): string | undefined {
  if (value === '') return undefined

  return value
}

/** Número apagado (`valueAsNumber` é `NaN`) vira `null`. */
export function nanToNull(value: number): number | null {
  if (Number.isNaN(value)) return null

  return value
}
