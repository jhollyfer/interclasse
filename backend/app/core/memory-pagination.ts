import type { Paginated } from '@interclasse/shared'

/**
 * The page the in-memory repository returns, with the footer Lucid would give
 * (`_standards/domain.md` §5.3): the second implementation cannot return a different
 * `meta` from the first. Only the in-memory implementations use it.
 */
export class MemoryPagination {
  static slice<T>(all: ReadonlyArray<T>, page: number, perPage: number): Paginated<T> {
    const start = (page - 1) * perPage
    const lastPage = Math.max(1, Math.ceil(all.length / perPage))

    return {
      meta: {
        total: all.length,
        perPage,
        currentPage: page,
        lastPage,
        firstPage: 1,
        firstPageUrl: '/?page=1',
        lastPageUrl: `/?page=${lastPage}`,
        nextPageUrl: null,
        previousPageUrl: null,
      },
      data: all.slice(start, start + perPage),
    }
  }
}
