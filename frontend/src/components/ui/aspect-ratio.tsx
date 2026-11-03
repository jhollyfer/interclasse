import { cn } from '#/lib/cn'
import type { CssVars } from '#/lib/css-vars'

const RATIO_STYLE = (ratio: number): CssVars => ({ '--ratio': String(ratio) })

function AspectRatio({
  ratio,
  className,
  ...props
}: React.ComponentProps<'div'> & { ratio: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      style={RATIO_STYLE(ratio)}
      className={cn('relative aspect-(--ratio)', className)}
      {...props}
    />
  )
}

export { AspectRatio }
