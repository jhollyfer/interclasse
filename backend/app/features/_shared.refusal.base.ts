import type { I18n } from '@adonisjs/i18n'

import type HTTPException from '#exceptions/http.exception'

/** Um fato de domínio: o `code` é o discriminante (`_standards/domain.md` §2). */
type Fact = { readonly code: string }

/** Cada fato do tipo, pela chave do próprio `code`. */
type FactsByCode<TFact extends Fact> = { [TCode in TFact['code']]: Extract<TFact, { code: TCode }> }

/**
 * A tabela de tradução de um tipo de fato: uma entrada por `code`, e o
 * compilador reprova fato novo sem tradução (`satisfies` no ponto de uso).
 */
export type RefusalTable<TFact extends Fact> = {
  [TCode in TFact['code']]: (fact: FactsByCode<TFact>[TCode], i18n: I18n) => HTTPException
}

/**
 * Passo único de todo tradutor `_shared.<recurso>-refusal.ts`: acha a entrada
 * da tabela pelo `code` do fato e a chama com ele já estreitado. A tabela
 * substitui o `switch` com `throw` no `default` (`_standards/backend.md` §4.2:
 * falha é `left`, não `throw`).
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
