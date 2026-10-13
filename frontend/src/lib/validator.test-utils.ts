/**
 * Os campos que falharam, para não depender da ordem das mensagens.
 *
 * Compartilhado pelos `*.validator.test.ts` de `src/validators/`: cada recurso
 * testa o seu validator ao lado dele, e todos leem o erro do mesmo jeito.
 */
export function fieldsOf(error: { messages: Array<{ field: string }> } | null) {
  return (error?.messages ?? []).map((message) => message.field)
}
