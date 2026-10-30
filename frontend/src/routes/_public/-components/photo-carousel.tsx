import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import * as React from 'react'

import { Picture } from '#/components/common/picture'
import { storefrontPhotosQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import { HOME_PHOTOS } from '../index'
import { Section, SectionHeader, SectionTitle } from './section'

/** Quanto cada foto fica na tela antes de passar sozinha. */
const AUTOPLAY_MS = 5000

/**
 * As fotos dos jogos, passando sozinhas. Rolagem nativa com `scroll-snap`, e
 * não uma biblioteca: arrastar com o dedo, rolar com o trackpad e as setas do
 * teclado já funcionam de graça.
 *
 * A passagem automática para quando o mouse ou o foco estão no carrossel e não
 * existe para quem pediu menos movimento no sistema. Some inteiro enquanto não
 * houver foto aprovada.
 */
export function PhotoCarousel(): React.JSX.Element | null {
  const { data } = useQuery(storefrontPhotosQueryOptions(HOME_PHOTOS))
  const track = React.useRef<HTMLUListElement>(null)
  const [paused, setPaused] = React.useState(false)
  const photos = data?.data ?? []

  function step(direction: 1 | -1): void {
    const element = track.current
    if (!element) return

    const end =
      element.scrollLeft + element.clientWidth >= element.scrollWidth - 4
    if (direction === 1 && end) {
      element.scrollTo({ left: 0, behavior: 'smooth' })
      return
    }

    element.scrollBy({
      left: direction * element.clientWidth,
      behavior: 'smooth',
    })
  }

  const advance = React.useEffectEvent((): void => step(1))

  React.useEffect(() => {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (paused || reduced || photos.length < 2) return

    const timer = window.setInterval(() => advance(), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [paused, photos.length])

  if (photos.length === 0) return null

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>{m.public_photos_title()}</SectionTitle>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={m.public_photos_previous()}
            onClick={() => step(-1)}
            className="hover:border-primary rounded-full border p-2"
          >
            <CaretLeftIcon />
          </button>
          <button
            type="button"
            aria-label={m.public_photos_next()}
            onClick={() => step(1)}
            className="hover:border-primary rounded-full border p-2"
          >
            <CaretRightIcon />
          </button>
        </div>
      </SectionHeader>
      <ul
        ref={track}
        aria-label={m.public_photos_title()}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {photos.map((photo) => (
          <li
            key={photo.id}
            className="w-full shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
          >
            <figure className="overflow-hidden rounded-lg border">
              <Picture
                src={photo.url}
                alt={photo.caption ?? m.public_photos_alt_fallback()}
                className="aspect-[4/3] w-full object-cover"
                width={800}
                height={600}
                placement="fold"
              />
              {photo.caption && (
                <figcaption className="text-muted-foreground p-3 text-sm">
                  {photo.caption}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  )
}
