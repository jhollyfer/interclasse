import type * as React from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { cn } from '#/lib/utils'
import type { Merge } from '#/lib/interfaces'

import { useImageFieldContext } from './image-field-context'

type ImageFieldPreviewProps = Readonly<
  Merge<
    React.ComponentProps<typeof Avatar>,
    {
      /** O texto alternativo da imagem. Acessibilidade, não markup - segue prop. */
      alt: string
      /** A sigla que aparece enquanto não há imagem. */
      children: React.ReactNode
    }
  >
>

/** O quadrado com a imagem atual, ou a sigla enquanto não há nenhuma. */
export function ImageFieldPreview({
  alt,
  className,
  children,
  ...props
}: ImageFieldPreviewProps): React.JSX.Element {
  const { shown } = useImageFieldContext('ImageFieldPreview')

  return (
    <Avatar
      data-slot="image-field-preview"
      className={cn('size-16 rounded-lg', className)}
      {...props}
    >
      {shown && <AvatarImage src={shown} alt={alt} />}
      <AvatarFallback className="rounded-lg">{children}</AvatarFallback>
    </Avatar>
  )
}
