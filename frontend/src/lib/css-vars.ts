import type * as React from 'react'

/**
 * `style` with a custom property (`--sidebar-width`). React's `CSSProperties`
 * does not know `--*`, and the way out would be `as`; the template literal
 * index accepts only keys that start with `--`.
 */
export type CssVars = React.CSSProperties & Record<`--${string}`, string>
