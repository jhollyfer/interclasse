import type { CellData, RowData, TableFeatures } from '@tanstack/react-table'

/**
 * O rótulo de uma coluna, em texto puro.
 *
 * Existe porque `header` deixou de servir para isso: ele passou a ser um
 * componente (`<TableColumnHeader/>`), e `String(elemento)` imprime
 * `[object Object]` no menu de colunas visíveis. O rótulo tem de ser um dado.
 *
 * `interface` e não `type` porque augmentation de módulo exige interface - é a
 * exceção que a convenção do projeto abre, junto com os `Register` do
 * TanStack Query e do roteador.
 */
declare module '@tanstack/react-table' {
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    label?: string
    /** A coluna que vira título do card no celular. Ausente, a primeira de dados. */
    primary?: boolean
  }
}
