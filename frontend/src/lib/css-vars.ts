import type * as React from 'react'

/**
 * `style` com custom property (`--sidebar-width`). O `CSSProperties` do React
 * não conhece `--*`, e a saída seria `as`; o índice de template literal
 * aceita só chave que começa com `--`.
 */
export type CssVars = React.CSSProperties & Record<`--${string}`, string>
