import { describe, expect, it } from 'vitest'

import {
  validateListSearch,
  validateStorefrontSearch,
  withExtra,
} from './list-search'
import { SORT_DIRECTION, TRASHED_MODE } from './entity'

/**
 * O recorte de lixeira. Vale um teste próprio porque os valores aceitos são
 * **literais** em `list-search.ts`, e não `TRASHED_MODE.X`: ler o enum ali cria
 * uma aresta entre o chunk do router e o chunk do vocabulário, e num grafo de
 * chunks cíclico ela devolve `undefined` no SSR. A duplicação é intencional, e
 * é aqui que ela é confrontada com a fonte.
 */
describe('validateListSearch, recorte de lixeira', () => {
  it('aceita os dois modos que o enum declara', () => {
    expect(validateListSearch({ trashed: TRASHED_MODE.ONLY })).toEqual({
      trashed: 'only',
    })
    expect(validateListSearch({ trashed: TRASHED_MODE.WITH })).toEqual({
      trashed: 'with',
    })
  })

  it('descarta modo inventado, caixa alta e ausência', () => {
    // O backend compara em minúsculo; `'ONLY'` seria 422, e não lixeira vazia.
    expect(validateListSearch({ trashed: 'ONLY' })).toEqual({})
    expect(validateListSearch({ trashed: 'lixo' })).toEqual({})
    expect(validateListSearch({})).toEqual({})
  })
})

describe('validateListSearch, ordenação', () => {
  it('aceita as duas direções que o enum declara', () => {
    expect(
      validateListSearch({ sort: 'name', direction: SORT_DIRECTION.ASC }),
    ).toEqual({ sort: 'name', direction: 'asc' })
    expect(
      validateListSearch({ sort: 'name', direction: SORT_DIRECTION.DESC }),
    ).toEqual({ sort: 'name', direction: 'desc' })
  })

  it('cai no padrão quando a direção não existe, em vez de propagá-la', () => {
    expect(
      validateListSearch({ sort: 'name', direction: 'ascending' }),
    ).toEqual({ sort: 'name' })
  })

  // `direction` sozinha não ordena nada, e sujaria a URL com um parâmetro sem
  // efeito.
  it('descarta a direção sem coluna', () => {
    expect(validateListSearch({ direction: 'desc' })).toEqual({})
  })

  /**
   * A coluna passa crua de propósito: cada recurso fecha a lista dele no
   * `sortFields()` do backend, e repetir as listas aqui garantiria divergência.
   * Coluna inválida volta 422 apontando o campo.
   */
  it('deixa a coluna passar sem conferir contra lista nenhuma', () => {
    expect(validateListSearch({ sort: 'rating' })).toEqual({ sort: 'rating' })
    expect(validateListSearch({ sort: 'coluna-inventada' })).toEqual({
      sort: 'coluna-inventada',
    })
  })
})

describe('validateListSearch, paginação', () => {
  it('aceita o que a URL traz como string', () => {
    expect(validateListSearch({ page: '2', perPage: '50' })).toEqual({
      page: 2,
      perPage: 50,
    })
  })

  it('descarta página fora dos limites do backend', () => {
    expect(validateListSearch({ page: 0 })).toEqual({})
    expect(validateListSearch({ page: -1 })).toEqual({})
    expect(validateListSearch({ page: 1.5 })).toEqual({})
    expect(validateListSearch({ page: 'abc' })).toEqual({})
  })

  // O backend recusa acima de 100; deixar passar viraria 422 numa navegação.
  it('descarta perPage acima do teto', () => {
    expect(validateListSearch({ perPage: 101 })).toEqual({})
    expect(validateListSearch({ perPage: 100 })).toEqual({ perPage: 100 })
  })

  it('corta a busca no teto de paginationFields()', () => {
    expect(validateListSearch({ search: 'a'.repeat(150) }).search).toHaveLength(
      100,
    )
  })

  it('descarta busca vazia e busca que não é texto', () => {
    expect(validateListSearch({ search: '' })).toEqual({})
    expect(validateListSearch({ search: 42 })).toEqual({})
  })
})

describe('withExtra', () => {
  it('aceita a chave extra junto do conjunto padrão', () => {
    const validate = withExtra(['status'])

    expect(validate({ page: 2, status: 'PENDING' })).toEqual({
      page: 2,
      status: 'PENDING',
    })
  })

  it('ignora chave que não foi declarada', () => {
    const validate = withExtra(['status'])

    expect(validate({ status: 'PENDING', mimetype: 'image/png' })).toEqual({
      status: 'PENDING',
    })
  })

  it('ignora a chave declarada quando ela vem vazia', () => {
    const validate = withExtra(['status'])

    expect(validate({ status: '' })).toStrictEqual({})
  })

  // `?size=abc` tem de sumir, e não virar a string `'abc'` numa requisição que
  // o backend recusaria com 422.
  it('separa a chave numérica e descarta o que não é inteiro não-negativo', () => {
    const validate = withExtra([], ['size'])

    expect(validate({ size: '0' })).toEqual({ size: 0 })
    expect(validate({ size: 'abc' })).toEqual({})
    expect(validate({ size: -1 })).toEqual({})
    expect(validate({ size: 1.5 })).toEqual({})
  })
})

describe('validateStorefrontSearch', () => {
  // `/storefront` nunca enxerga registro arquivado: deixar a chave passar seria
  // prometer na URL um recorte que o backend recusa com 422.
  it('descarta trashed e mantém o resto do recorte', () => {
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
