import type { SortDirection, TrashedMode } from './entity'

/**
 * Os filtros de qualquer listagem do painel, na URL.
 *
 * Na URL, e não em `useState`, porque é o que sobrevive ao F5 e ao link
 * compartilhado - a tabela na página 2 com um filtro aplicado tem que voltar
 * igual.
 *
 * À mão, e não com `lib/validator.ts`: o `validateSearch` do roteador é
 * síncrono e o `validate` do VineJS devolve promessa.
 *
 * Mora fora de `routes/` para poder ser testado sem que o gerador da árvore
 * trate o arquivo de teste como uma rota.
 */

/**
 * Os valores são literais, e `SortDirections`/`TrashedModes` de `entity.ts`
 * entram só como **tipo**. Não é descuido: este arquivo é importado por toda
 * rota que declara `validateSearch`, então ele cai no chunk do router, enquanto
 * o enum mora com o resto do vocabulário. Ler o enum aqui, em escopo de módulo,
 * cria uma aresta entre os dois chunks - e o Rolldown não garante que o grafo de
 * chunks seja acíclico. Num ciclo, o chunk do vocabulário ainda não terminou de
 * avaliar quando esta linha roda, e o objeto vale `undefined`:
 *
 *     TypeError: Cannot read properties of undefined (reading 'ONLY')
 *
 * O build passa verde e só o primeiro SSR em produção descobre. `import type`
 * some no build e a aresta com ele. A anotação é o que segura a duplicação: se
 * `TrashedModes.ONLY` mudar de valor, `'only'` deixa de ser atribuível a
 * `TrashedMode` e o `tsc` acusa. `list-search.test.ts` confronta os dois mapas
 * com o enum de verdade.
 */
const SORT_DIRECTIONS: Record<string, SortDirection | undefined> = {
  asc: 'asc',
  desc: 'desc',
}

const TRASHED_MODES: Record<string, TrashedMode | undefined> = {
  only: 'only',
  with: 'with',
}

export type ListSearch = {
  page?: number
  perPage?: number
  search?: string
  trashed?: TrashedMode
  /**
   * A coluna da ordem. **Não** é validada contra uma lista aqui: cada recurso
   * aceita as suas, quem fecha a lista é o `sortFields()` do backend, e repetir
   * as listas de sete recursos no cliente seria garantir que as duas
   * divergissem. Coluna inválida volta 422 apontando o campo.
   */
  sort?: string
  direction?: SortDirection
}

/** Search param chega como string na URL e como número na navegação tipada. */
function positive(value: unknown): number | undefined {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1) return undefined

  return parsed
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined

  return value
}

export function validateListSearch(
  search: Record<string, unknown>,
): ListSearch {
  const result: ListSearch = {}

  const page = positive(search.page)
  if (page) result.page = page

  const perPage = positive(search.perPage)
  // O backend recusa acima de 100; deixar passar viraria 422 numa navegação.
  if (perPage && perPage <= 100) result.perPage = perPage

  const term = text(search.search)
  // O teto de `paginationFields()`. Um termo colado da área de transferência
  // passa dos 100 caracteres sem esforço, e o 422 apareceria como busca quebrada.
  if (term) result.search = term.slice(0, 100)

  const trashed = TRASHED_MODES[String(search.trashed)]
  if (trashed) result.trashed = trashed

  const sort = text(search.sort)
  if (sort) result.sort = sort

  // `direction` sem `sort` não ordena nada; deixá-la passar sozinha só sujaria
  // a URL com um parâmetro sem efeito.
  const direction = SORT_DIRECTIONS[String(search.direction)]
  if (sort && direction) result.direction = direction

  return result
}

/**
 * As listagens que somam um filtro próprio ao conjunto padrão - `?status` em
 * depoimentos e em usuários, `?mimetype` na biblioteca de arquivos,
 * `?category` em notícias. O extra é sempre texto: uuid e enum chegam como
 * string na URL, e quem recusa valor inválido é a API, com 422 apontando o
 * campo.
 */
export function withExtra<TKey extends string, TNumeric extends string = never>(
  keys: ReadonlyArray<TKey>,
  /**
   * As chaves que são número na URL. Separadas porque `?size=abc` tem de sumir,
   * e não virar a string `'abc'` numa requisição que o backend recusaria com
   * 422.
   */
  numericKeys: ReadonlyArray<TNumeric> = [],
) {
  return (search: Record<string, unknown>) => {
    const extra: Partial<Record<TKey, string>> = {}

    for (const key of keys) {
      const value = text(search[key])
      if (value) extra[key] = value
    }

    const numeric: Partial<Record<TNumeric, number>> = {}

    for (const key of numericKeys) {
      const parsed = Number(search[key])
      // `0` é filtro legítimo, então a condição é sobre ser inteiro
      // não-negativo, e não sobre ser verdadeiro.
      if (Number.isInteger(parsed) && parsed >= 0) numeric[key] = parsed
    }

    // Os extras são montados à parte e espalhados: escrever direto no objeto
    // combinado exigiria uma asserção para provar ao compilador que a chave
    // genérica cabe ali, e asserção é o que este projeto não usa.
    return { ...validateListSearch(search), ...extra, ...numeric }
  }
}

/**
 * Os filtros da vitrine pública.
 *
 * Separado de `ListSearch` porque **não tem `trashed`**: `/storefront` nunca
 * enxerga registro arquivado - `StorefrontVisibilityService` filtra
 * `deleted_at IS NULL` antes de qualquer parâmetro -, e o `trashedField()` fica
 * fora dos validators de lá. Deixar a chave na tipagem seria prometer um
 * recorte que a URL aceita, o cliente manda e o backend recusa com 422.
 *
 * O resto é igual: `page`, `perPage`, `search`, `sort` e `direction`. Quem fecha
 * a lista de colunas ordenáveis é o `sortFields()` de cada recurso no backend,
 * como no painel.
 */
export type StorefrontSearch = Omit<ListSearch, 'trashed'>

/**
 * A validação do search de uma tela pública.
 *
 * É `validateListSearch` **menos `trashed`**, e nada mais. Escrever a versão
 * completa e recortar depois, em vez de repetir os cinco campos aqui, é o que
 * mantém uma regra só: o teto de 100 do `perPage`, o corte do termo em 100
 * caracteres e a recusa de `direction` sem `sort` valem igual nas duas
 * superfícies, e duplicá-los garantiria que uma delas envelhecesse sozinha.
 *
 * `sort` e `direction` ficam: `/storefront/notices` e `/storefront/events`
 * declaram as próprias colunas ordenáveis, e a ordem escolhida é recorte de
 * URL como qualquer outro.
 */
export function validateStorefrontSearch(
  search: Record<string, unknown>,
): StorefrontSearch {
  const { trashed: _trashed, ...common } = validateListSearch(search)

  return common
}
