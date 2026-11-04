import type { StorefrontSiteShowResponse } from '@interclasse/shared'
import { linkOptions } from '@tanstack/react-router'

import { hasAboutContent } from '#/lib/site-about'
import { m } from '#/paraglide/messages'

/**
 * The site's destinations, typed against the route tree.
 *
 * The `label` is the message function, called on screen: that way the text follows the language.
 * Header and footer draw the **same** list: writing it twice
 * would guarantee they diverge the day a screen changes address.
 */
const HOME = linkOptions({ to: '/', label: m.public_nav_home })

const GAMES = linkOptions({ to: '/matches', label: m.public_nav_games })

const STANDINGS = linkOptions({
  to: '/standings',
  label: m.public_nav_standings,
})

const ANNOUNCEMENTS = linkOptions({
  to: '/announcements',
  label: m.public_nav_announcements,
})

const PHOTOS = linkOptions({ to: '/photos', label: m.public_nav_photos })

const ABOUT = linkOptions({ to: '/about', label: m.public_nav_about })

const SIGN_IN = linkOptions({
  to: '/sign-in',
  label: m.public_nav_sign_in,
})

export type MenuItem =
  | typeof HOME
  | typeof GAMES
  | typeof STANDINGS
  | typeof ANNOUNCEMENTS
  | typeof PHOTOS
  | typeof ABOUT
  | typeof SIGN_IN

export const NAVIGATION: ReadonlyArray<MenuItem> = [
  HOME,
  GAMES,
  STANDINGS,
  ANNOUNCEMENTS,
  PHOTOS,
  ABOUT,
]

/** The dashboard door. It stays outside `NAVIGATION`: it is an action, not a reading destination. */
export const AUTHENTICATION = SIGN_IN

/** `NAVIGATION` without the destinations that have nothing to show yet. */
export function visibleNavigation(
  site?: StorefrontSiteShowResponse,
): ReadonlyArray<MenuItem> {
  if (hasAboutContent(site)) return NAVIGATION

  return NAVIGATION.filter((item) => item.to !== ABOUT.to)
}
