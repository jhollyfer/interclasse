import type { I18n } from '@adonisjs/i18n'

import type HTTPException from '#exceptions/http.exception'

/** A domain fact: `code` is the discriminant (`_standards/domain.md` §2). */
type Fact = { readonly code: string }

/** Each fact of the type, keyed by its own `code`. */
type FactsByCode<TFact extends Fact> = { [TCode in TFact['code']]: Extract<TFact, { code: TCode }> }

/**
 * The translation table of a fact type: one entry per `code`, and the
 * compiler rejects a new fact without a translation (`satisfies` at the call site).
 */
export type RefusalTable<TFact extends Fact> = {
  [TCode in TFact['code']]: (fact: FactsByCode<TFact>[TCode], i18n: I18n) => HTTPException
}

/**
 * The single step of every `_shared.<resource>-refusal.ts` translator: finds the entry
 * in the table by the fact's `code` and calls it with the fact already narrowed. The table
 * replaces the `switch` with `throw` in `default` (`_standards/backend.md` §4.2:
 * failure is `left`, not `throw`).
 */
export abstract class RefusalBase {
  protected static translate<TFact extends Fact, TCode extends TFact['code']>(
    table: RefusalTable<TFact>,
    code: TCode,
    fact: FactsByCode<TFact>[TCode],
    i18n: I18n,
  ): HTTPException {
    const entry: (fact: FactsByCode<TFact>[TCode], i18n: I18n) => HTTPException = table[code]

    return entry(fact, i18n)
  }
}
