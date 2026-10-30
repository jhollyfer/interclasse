import type { Merge } from '@interclasse/shared'
import type * as React from 'react'

/**
 * A posição decide o carregamento (`frontend.md` §9.6): imagem de LCP nunca é
 * `lazy`, e abaixo da dobra é sempre. Lookup, e não condição na tela.
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
      /** Vazio só para imagem decorativa; a que informa leva texto (§10.4). */
      alt: string
      /** A dimensão intrínseca, que reserva o espaço e evita salto de layout. */
      width: number
      height: number
      /** `lcp` é a de maior área acima da dobra; `fold`, o que fica abaixo. */
      placement: PicturePlacement
    }
  >
>

/**
 * A `<img>` da casa: toda imagem tem `width`/`height` e `alt`, e a posição
 * escolhe `loading` e `fetchPriority`. Nenhuma tela escreve `<img>` crua.
 * _doc-lib/vitejs.md#assets.
 */
export function Picture({
  placement,
  ...props
}: PictureProps): React.JSX.Element {
  return (
    <img
      data-slot="picture"
      decoding="async"
      {...IMAGE_LOADING[placement]}
      {...props}
    />
  )
}
