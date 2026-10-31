import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import * as React from 'react'

import { Picture } from '#/components/common/picture'
import { storefrontPhotosQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import { HOME_PHOTOS } from '../index'
import { Section, SectionHeader, SectionTitle } from './section'

/** How long each photo stays on screen before moving on by itself. */
const AUTOPLAY_MS = 5000

/**
 * The match photos, moving on by themselves. Native scrolling with `scroll-snap`, and
 * not a library: dragging with a finger, scrolling with the trackpad and the keyboard
 * arrows already work for free.
 *
 * The automatic advance stops when the mouse or focus is on the carousel and does not
 * exist for whoever asked for less motion in the system. It vanishes entirely while there is no
 * approved photo.
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
            className="w-full shrink-0 snap-start sm:w-carousel-half lg:w-carousel-third"
          >
            <figure className="overflow-hidden rounded-lg border">
              <Picture
                src={photo.url}
                alt={photo.caption ?? m.public_photos_alt_fallback()}
                className="aspect-photo w-full object-cover"
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
