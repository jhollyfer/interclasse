import { z } from '../validator.js'

/**
 * O corpo de toda resposta de erro da API: o texto para a pessoa, o status, o
 * código que é o contrato (nunca traduzido) e, no 422, o erro de cada campo.
 */
export type ErrorEnvelope = {
  readonly message: string
  readonly status: number
  readonly code: string
  readonly errors?: Readonly<Record<string, string>>
}

/** O rodapé de uma listagem paginada, como o Lucid o devolve. */
export const PaginationMeta = z.object({
  total: z.number(),
  perPage: z.number(),
  currentPage: z.number(),
  lastPage: z.number(),
  firstPage: z.number(),
  firstPageUrl: z.string(),
  lastPageUrl: z.string(),
  nextPageUrl: z.string().nullable(),
  previousPageUrl: z.string().nullable(),
})

export type PaginationMeta = z.infer<typeof PaginationMeta>

/** Uma página de uma listagem: o rodapé e os registros. */
export type Paginated<T> = {
  readonly meta: PaginationMeta
  readonly data: ReadonlyArray<T>
}

/**
 * O schema de uma página de qualquer `*Response` de registro: é o que o
 * `request()` do frontend recebe nas listagens (`frontend.md` §3.3).
 */
export function paginatedResponse<TItem extends z.ZodType>(item: TItem) {
  return z.object({ meta: PaginationMeta, data: z.array(item) })
}
