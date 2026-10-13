import { TrashedModes, type TrashedMode } from '#core/entity'

/**
 * Consulta de um model com o par de scopes de soft delete (_padroes/backend.md
 * §4.8). Estrutural porque `ExtractScopes<Model>` não resolve sobre um genérico.
 */
type TrashableQuery = {
  withScopes(callback: (scopes: { notDeleted(): unknown; onlyDeleted(): unknown }) => void): unknown
}

/**
 * O `?trashed` de uma listagem, num lugar só.
 *
 * Ausente é a listagem de sempre, só os vivos: quem não pediu lixeira não vê a
 * resposta mudar. `only` é a tela de restauração, `with` traz os dois e não
 * filtra nada. Função pura sobre a consulta em mãos - por isso `_shared`, e
 * não service (_padroes/backend.md §4.9).
 */
export function applyTrashed(query: TrashableQuery, mode: TrashedMode | undefined): void {
  if (mode === undefined) {
    query.withScopes((scopes) => scopes.notDeleted())
    return
  }
  if (mode === TrashedModes.ONLY) query.withScopes((scopes) => scopes.onlyDeleted())
}
