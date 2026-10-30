'use client'

import * as React from 'react'

import { cn } from '#/lib/cn'

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- wrapper genérico: quem usa passa `htmlFor` ou o controle como filho
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-xs/relaxed leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
