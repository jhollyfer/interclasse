import type { Merge } from '@interclasse/shared'
import type * as React from 'react'

/**
 * The position decides the loading (`frontend.md` §9.6): an LCP image is never
 * `lazy`, and below the fold it always is. A lookup, and not a condition on the screen.
 */
const IMAGE_LOADING = {
  lcp: { loading: 'eager', fetchPriority: 'high' },
  fold: { loading: 'lazy', fetchPriority: 'auto' },
} as const

export type PicturePlacement = keyof typeof IMAGE_LOADING

type PictureProps = Readonly<
  Merge<
    Omit<
      React.ComponentProps<'img'>,
      'src' | 'alt' | 'width' | 'height' | 'loading' | 'fetchPriority'
    >,
    {
      src: string
      /** Empty only for a decorative image; one that informs carries text (§10.4). */
      alt: string
      /** The intrinsic dimension, which reserves the space and avoids layout shift. */
      width: number
      height: number
      /** `lcp` is the largest area above the fold; `fold`, what stays below. */
      placement: PicturePlacement
    }
  >
>

/**
 * The house `<img>`: every image has `width`/`height` and `alt`, and the position
 * chooses `loading` and `fetchPriority`. No screen writes a raw `<img>`.
 * _doc-lib/vitejs.md#assets.
 */
export function Picture({
  placement,
  alt,
  ...props
}: PictureProps): React.JSX.Element {
  return (
    <img
      data-slot="picture"
      alt={alt}
      decoding="async"
      {...IMAGE_LOADING[placement]}
      {...props}
    />
  )
}
