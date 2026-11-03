import { SpinnerIcon } from '@phosphor-icons/react'

import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <SpinnerIcon
      data-slot="spinner"
      role="status"
      aria-label={m.common_ui_loading()}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  )
}

export { Spinner }
