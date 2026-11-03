import type { StorefrontSiteShowResponse } from '@interclasse/shared'

/**
 * Whether the organization wrote anything for "Sobre". The page, the menu, the footer and
 * the sitemap share this answer: an address that leads to an empty screen is not offered.
 */
export function hasAboutContent(site?: StorefrontSiteShowResponse): boolean {
  if (!site) return false

  return Boolean(site.about || site.organizer || site.edition)
}
