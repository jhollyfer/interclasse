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
export type PaginationMeta = {
  readonly total: number
  readonly perPage: number
  readonly currentPage: number
  readonly lastPage: number
  readonly firstPage: number
  readonly firstPageUrl: string
  readonly lastPageUrl: string
  readonly nextPageUrl: string | null
  readonly previousPageUrl: string | null
}

/** Uma página de uma listagem: o rodapé e os registros. */
export type Paginated<T> = {
  readonly meta: PaginationMeta
  readonly data: ReadonlyArray<T>
}
