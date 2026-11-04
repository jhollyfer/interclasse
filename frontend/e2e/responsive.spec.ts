import type { Page } from '@playwright/test'

import type { Role } from './support/env'
import { waitForHydration } from './support/hydration'
import { storageStatePath } from './support/session'
import { expect, test } from './support/test'

/**
 * Every static route, per profile, at phone, tablet and desktop width (and the
 * phone in dark theme): the page
 * never scrolls sideways, the controls a finger hits are at least 44 px tall on
 * the phone, and axe finds nothing serious (_doc-lib/playwright.md#docs/emulation,
 * _doc-lib/playwright.md#docs/accessibility-testing).
 *
 * Routes with an id in the path stay with the flow specs, which create the data
 * they open.
 */

const WIDTHS = [375, 768, 1280] as const

const PHONE = 375

const MIN_TARGET = 44

const PUBLIC_ROUTES = [
  '/',
  '/standings',
  '/matches',
  '/announcements',
  '/photos',
  '/about',
  '/sign-in',
] as const

const ADMINISTRATOR_ROUTES = [
  '/administrator',
  '/administrator/announcements',
  '/administrator/announcements/new',
  '/administrator/brackets',
  '/administrator/cards',
  '/administrator/classrooms',
  '/administrator/classrooms/new',
  '/administrator/matches',
  '/administrator/photos',
  '/administrator/removals',
  '/administrator/reports',
  '/administrator/site',
  '/administrator/sports',
  '/administrator/sports/new',
  '/administrator/users',
  '/administrator/users/new',
  '/profile',
  '/profile/edit',
] as const

const ADVISOR_ROUTES = ['/advisor', '/advisor/photos', '/profile'] as const

const REPRESENTATIVE_ROUTES = ['/representative', '/profile'] as const

/**
 * Controls whose box is the hit area. Links are left out on purpose: a link
 * inside running text is sized by the line, and WCAG 2.5.8 exempts it. Checkbox
 * and radio keep a 16 px square and grow the area through the label.
 */
const TARGETS = [
  'button:not([role="checkbox"]):not([role="radio"])',
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])',
  'select',
  'textarea',
  '[role="tab"]',
  '[role="combobox"]',
].join(', ')

type Small = Readonly<{ label: string; height: number }>

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )
}

async function smallTargets(page: Page): Promise<ReadonlyArray<Small>> {
  return page.locator(TARGETS).evaluateAll(
    (elements, min) =>
      elements.flatMap((element) => {
        const box = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        const hidden =
          box.width === 0 ||
          box.height === 0 ||
          style.visibility === 'hidden' ||
          element.closest('[aria-hidden="true"], [inert]') !== null

        if (hidden || box.height >= min) return []

        const label = [
          element.getAttribute('aria-label'),
          element.textContent.trim().slice(0, 40),
          element.tagName,
        ].find(Boolean)

        return [{ label: String(label), height: Math.round(box.height) }]
      }),
    MIN_TARGET,
  )
}

type Fit = Readonly<{ overflow: number; small: ReadonlyArray<Small> }>

/** Opens the route at the width and measures what the assertions check. */
async function measure(page: Page, path: string, width: number): Promise<Fit> {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(path)
  await waitForHydration(page)

  const overflow = await horizontalOverflow(page)

  if (width !== PHONE) return { overflow, small: [] }

  return { overflow, small: await smallTargets(page) }
}

type Visitor = Role | 'visitor'

const ROUTES = [
  ...PUBLIC_ROUTES.map((path) => ({ visitor: 'visitor', path }) as const),
  ...ADMINISTRATOR_ROUTES.map(
    (path) => ({ visitor: 'administrator', path }) as const,
  ),
  ...ADVISOR_ROUTES.map((path) => ({ visitor: 'advisor', path }) as const),
  ...REPRESENTATIVE_ROUTES.map(
    (path) => ({ visitor: 'representative', path }) as const,
  ),
] satisfies ReadonlyArray<Readonly<{ visitor: Visitor; path: string }>>

/** The visitor has no session; every role reuses the one `auth.setup.ts` saved. */
function storageStateOf(visitor: Visitor): string | undefined {
  if (visitor === 'visitor') return undefined

  return storageStatePath(visitor)
}

/**
 * Light at every width, and dark at the narrowest and the widest: rolling sideways and
 * target size do not depend on the theme, and the dark pass at both ends covers the
 * two layouts that change most (phone and desktop). Without the theme
 * cookie the app follows `prefers-color-scheme`, which `colorScheme` emulates
 * (_doc-lib/playwright.md#docs/emulation).
 */
const PASSES = [
  ...WIDTHS.map((width) => ({ width, colorScheme: 'light' }) as const),
  { width: PHONE, colorScheme: 'dark' } as const,
  { width: 1280, colorScheme: 'dark' } as const,
]

for (const { width, colorScheme } of PASSES) {
  test.describe(`at ${width}px, ${colorScheme}`, () => {
    for (const { visitor, path } of ROUTES) {
      test(`${visitor} sees ${path} fitting the screen`, async ({
        browser,
        baseURL,
        expectAccessible,
      }) => {
        const context = await browser.newContext({
          baseURL,
          colorScheme,
          storageState: storageStateOf(visitor),
        })
        const page = await context.newPage()

        const fit = await measure(page, path, width)

        expect(fit.overflow, 'scrolls sideways').toBeLessThanOrEqual(0)
        expect(fit.small, `controls under ${MIN_TARGET}px`).toEqual([])
        await expectAccessible(page)

        await context.close()
      })
    }
  })
}
