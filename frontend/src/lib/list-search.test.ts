import { SORT_DIRECTION, TRASHED_MODE } from '@interclasse/shared'
import { describe, expect, it } from 'vitest'

import {
  validateListSearch,
  validateStorefrontSearch,
  withExtra,
} from './list-search'

/**
 * The trash filter. It deserves a test of its own because the accepted values are
 * **literals** in `list-search.ts`, and not `TRASHED_MODE.X`: reading the enum there creates
 * an edge between the router chunk and the vocabulary chunk, and in a cyclic
 * chunk graph it returns `undefined` on SSR. The duplication is intentional, and
 * this is where it is checked against the source.
 */
describe('validateListSearch, trash filter', () => {
  it('accepts the two modes the enum declares', () => {
    expect(validateListSearch({ trashed: TRASHED_MODE.ONLY })).toEqual({
      trashed: 'only',
    })
    expect(validateListSearch({ trashed: TRASHED_MODE.WITH })).toEqual({
      trashed: 'with',
    })
  })

  it('drops an invented mode, upper case and absence', () => {
    // The backend compares in lowercase; `'ONLY'` would be a 422, and not an empty trash.
    expect(validateListSearch({ trashed: 'ONLY' })).toEqual({})
    expect(validateListSearch({ trashed: 'lixo' })).toEqual({})
    expect(validateListSearch({})).toEqual({})
  })
})

describe('validateListSearch, sorting', () => {
  it('accepts the two directions the enum declares', () => {
    expect(
      validateListSearch({ sort: 'name', direction: SORT_DIRECTION.ASC }),
    ).toEqual({ sort: 'name', direction: 'asc' })
    expect(
      validateListSearch({ sort: 'name', direction: SORT_DIRECTION.DESC }),
    ).toEqual({ sort: 'name', direction: 'desc' })
  })

  it('falls back to the default when the direction does not exist, instead of propagating it', () => {
    expect(
      validateListSearch({ sort: 'name', direction: 'ascending' }),
    ).toEqual({ sort: 'name' })
  })

  // `direction` alone sorts nothing, and would dirty the URL with a parameter with no
  // effect.
  it('drops a direction without a column', () => {
    expect(validateListSearch({ direction: 'desc' })).toEqual({})
  })

  /**
   * The column passes through raw on purpose: each resource closes its list in the
   * backend's `sortFields()`, and repeating the lists here would guarantee divergence.
   * An invalid column returns 422 pointing at the field.
   */
  it('lets the column through without checking it against any list', () => {
    expect(validateListSearch({ sort: 'rating' })).toEqual({ sort: 'rating' })
    expect(validateListSearch({ sort: 'coluna-inventada' })).toEqual({
      sort: 'coluna-inventada',
    })
  })
})

describe('validateListSearch, pagination', () => {
  it('accepts what the URL brings as a string', () => {
    expect(validateListSearch({ page: '2', perPage: '50' })).toEqual({
      page: 2,
      perPage: 50,
    })
  })

  it('drops a page outside the backend limits', () => {
    expect(validateListSearch({ page: 0 })).toEqual({})
    expect(validateListSearch({ page: -1 })).toEqual({})
    expect(validateListSearch({ page: 1.5 })).toEqual({})
    expect(validateListSearch({ page: 'abc' })).toEqual({})
  })

  // The backend refuses above 100; letting it through would become a 422 on a navigation.
  it('descarta perPage acima do teto', () => {
    expect(validateListSearch({ perPage: 101 })).toEqual({})
    expect(validateListSearch({ perPage: 100 })).toEqual({ perPage: 100 })
  })

  it('cuts the search at the paginationFields() cap', () => {
    expect(validateListSearch({ search: 'a'.repeat(150) }).search).toHaveLength(
      100,
    )
  })

  it('drops an empty search and a search that is not text', () => {
    expect(validateListSearch({ search: '' })).toEqual({})
    expect(validateListSearch({ search: 42 })).toEqual({})
  })
})

describe('withExtra', () => {
  it('accepts the extra key together with the default set', () => {
    const validate = withExtra(['status'])

    expect(validate({ page: 2, status: 'PENDING' })).toEqual({
      page: 2,
      status: 'PENDING',
    })
  })

  it('ignores a key that was not declared', () => {
    const validate = withExtra(['status'])

    expect(validate({ status: 'PENDING', mimetype: 'image/png' })).toEqual({
      status: 'PENDING',
    })
  })

  it('ignores the declared key when it comes empty', () => {
    const validate = withExtra(['status'])

    expect(validate({ status: '' })).toStrictEqual({})
  })

  // `?size=abc` has to vanish, and not become the string `'abc'` in a request that
  // the backend would refuse with 422.
  it('separates the numeric key and drops what is not a non-negative integer', () => {
    const validate = withExtra([], ['size'])

    expect(validate({ size: '0' })).toEqual({ size: 0 })
    expect(validate({ size: 'abc' })).toEqual({})
    expect(validate({ size: -1 })).toEqual({})
    expect(validate({ size: 1.5 })).toEqual({})
  })
})

describe('validateStorefrontSearch', () => {
  // `/storefront` never sees an archived record: letting the key through would be
  // promising in the URL a filter that the backend refuses with 422.
  it('drops trashed and keeps the rest of the filter', () => {
    expect(
      validateStorefrontSearch({
        page: 2,
        search: 'tikuna',
        sort: 'title',
        direction: 'asc',
        trashed: TRASHED_MODE.ONLY,
      }),
    ).toEqual({
      page: 2,
      search: 'tikuna',
      sort: 'title',
      direction: SORT_DIRECTION.ASC,
    })
  })
})
