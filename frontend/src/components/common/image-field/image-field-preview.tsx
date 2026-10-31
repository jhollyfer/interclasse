import type { Merge } from '@interclasse/shared'
import type * as React from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { cn } from '#/lib/cn'

import { useImageFieldContext } from './image-field-context'

type ImageFieldPreviewProps = Readonly<
  Merge<
    Omit<React.ComponentProps<typeof Avatar>, 'alt' | 'children'>,
    {
      /** The image's alternative text. Accessibility, not markup - stays a prop. */
      alt: string
      /** The initials shown while there is no image. */
      children: React.ReactNode
    }
  >
>

/** The square with the current image, or the initials while there is none. */
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
