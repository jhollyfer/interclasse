/**
 * From what the `<input>` delivers to what the `shared/` schema expects.
 *
 * Zod does not convert `''` to absent the way VineJS did
 * (`convertEmptyStringsToNull`): an erased field arrives as empty text, and
 * `.min(8)` or `.regex()` would refuse it. The conversion stays in the field, in
 * `onChange`, and the form's value is already born in the contract's shape.
 */

/** Erased text becomes `null`: it deletes the data instead of saving `''`. */
export function blankToNull(value: string): string | null {
  if (value.trim() === '') return null

  return value
}

/** Erased text becomes absent: an optional field "em branco = não mexer". */
export function blankToUndefined(value: string): string | undefined {
  if (value === '') return undefined

  return value
}

/** An erased number (`valueAsNumber` is `NaN`) becomes `null`. */
export function nanToNull(value: number): number | null {
  if (Number.isNaN(value)) return null

  return value
}
