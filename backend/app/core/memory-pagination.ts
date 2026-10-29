import type { Paginated } from '@interclasse/shared'

/**
 * A página de uma lista em memória, com o rodapé que o Lucid devolve. Existe
 * para as implementações em memória dos repositories (`_standards/domain.md`
 * §5.3) paginarem igual à real.
 */
export class MemoryPagination {
  static of<T>(items: ReadonlyArray<T>, page: number, perPage: number): Paginated<T> {
    const start = (page - 1) * perPage
    const lastPage = Math.max(1, Math.ceil(items.length / perPage))

    return {
      meta: {
        total: items.length,
        perPage,
        currentPage: page,
        lastPage,
        firstPage: 1,
        firstPageUrl: '/?page=1',
        lastPageUrl: `/?page=${lastPage}`,
        nextPageUrl: null,
        previousPageUrl: null,
      },
      data: items.slice(start, start + perPage),
    }
  }
}
