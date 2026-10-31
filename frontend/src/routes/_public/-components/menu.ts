import { linkOptions } from '@tanstack/react-router'

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
  | typeof ABOUT
  | typeof SIGN_IN

export const NAVIGATION: ReadonlyArray<MenuItem> = [
  HOME,
  GAMES,
  STANDINGS,
  ANNOUNCEMENTS,
  ABOUT,
]

/** The dashboard door. It stays outside `NAVIGATION`: it is an action, not a reading destination. */
export const AUTHENTICATION = SIGN_IN
