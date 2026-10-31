import { z } from '../validator.js'

/**
 * The body of every API error response: the text for the person, the status, the
 * code that is the contract (never translated) and, on 422, each field's error.
 */
export type ErrorEnvelope = {
  readonly message: string
  readonly status: number
  readonly code: string
  readonly errors?: Readonly<Record<string, string>>
}

/** The footer of a paginated listing, as Lucid returns it. */
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

/** A page of a listing: the footer and the records. */
export type Paginated<T> = {
  readonly meta: PaginationMeta
  readonly data: ReadonlyArray<T>
}

/**
 * The schema of a page of any record `*Response`: it is what the frontend's
 * `request()` receives on listings (`frontend.md` §3.3).
 */
export function paginatedResponse<TItem extends z.ZodType>(item: TItem) {
  return z.object({ meta: PaginationMeta, data: z.array(item) })
}
