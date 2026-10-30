import type { Paginated } from '@interclasse/shared'

/**
 * A página que o repository em memória devolve, com o rodapé que o Lucid daria
 * (`_standards/domain.md` §5.3): a segunda implementação não pode devolver um
 * `meta` diferente da primeira. Só as implementações em memória usam.
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
