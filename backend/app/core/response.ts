/**
 * O contrato de resposta comum a toda a API (_padroes/backend.md §4.5): o
 * envelope de erro e a paginação. O registro de qual model responde por cada
 * fatia é outra coisa e mora em `core/openapi/response.ts`.
 */

/**
 * O envelope de erro único: `code` é o identificador estável que o cliente
 * compara; `message` é texto de UI em pt-BR e nunca é comparado; `errors` é
 * campo -> mensagem, com a chave `root` para o formulário inteiro.
 */
export type ErrorEnvelope = {
  readonly message: string
  readonly status: number
  readonly code: string
  readonly errors?: Readonly<Record<string, string>>
}

/**
 * A resposta paginada como ela sai no fio, tipada.
 *
 * O paginator do Lucid não serve para isso: `ModelPaginatorContract.toJSON()`
 * devolve `{ meta: any; data: ModelObject[] }` - perde o tipo do item e ainda
 * traz um `any`. Devolver o paginator cru também não serve: o registry do Tuyau
 * infere a resposta do retorno do controller, e o front receberia o tipo da
 * classe (com `serialize`, `toJSON` e mais 55 membros) em vez do JSON.
 *
 * Montar `{ meta: paginator.getMeta(), data: paginator.all() }` resolve os dois:
 * `all()` mantém `T[]`, e o `any` de `getMeta()` morre nesta fronteira.
 */
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

export type Paginated<T> = {
  readonly meta: PaginationMeta
  readonly data: ReadonlyArray<T>
}
