import AxeBuilder from '@axe-core/playwright'
import { expect, test as base } from '@playwright/test'
import type { Browser, BrowserContext, Page } from '@playwright/test'

import type { Role } from './credentials'
import { storageStatePath } from './session'

type RoleSession = Readonly<{ page: Page; context: BrowserContext }>

type Fixtures = Readonly<{
  /** Tab already signed in as the organization (session from `auth.setup.ts`). */
  administrator: RoleSession
  /** Tab already signed in as the seed's advisor. */
  advisor: RoleSession
  /** Another advisor, from another classroom of the same category (the draw needs two). */
  secondAdvisor: RoleSession
  /**
   * Scans the tab with axe and fails on serious or critical violations
   * (_doc-lib/playwright.md#docs/accessibility-testing). It only catches what
   * a machine can detect; the rest is left to manual review.
   */
  expectAccessible: (page: Page) => Promise<void>
}>

async function openSession(
  browser: Browser,
  baseURL: string | undefined,
  role: Role,
): Promise<RoleSession> {
  const context = await browser.newContext({
    baseURL,
    storageState: storageStatePath(role),
  })
  return { context, page: await context.newPage() }
}

/**
 * The suite's `test`: `page` is the visitor without an account (public site),
 * and `administrator`/`advisor` are the same browser with the role's session
 * (_doc-lib/playwright.md#docs/test-fixtures). A new context per test, with
 * the saved `storageState`: no extra login against the API.
 */
export const test = base.extend<Fixtures>({
  expectAccessible: async ({}, provide) => {
    await provide(async (page) => {
      const results = await new AxeBuilder({ page }).analyze()
      const blocking = results.violations.filter(
        (violation) =>
          violation.impact === 'serious' || violation.impact === 'critical',
      )
      expect(blocking).toEqual([])
    })
  },
  administrator: async ({ browser, baseURL }, provide) => {
    const session = await openSession(browser, baseURL, 'administrator')
    await provide(session)
    await session.context.close()
  },
  advisor: async ({ browser, baseURL }, provide) => {
    const session = await openSession(browser, baseURL, 'advisor')
    await provide(session)
    await session.context.close()
  },
  secondAdvisor: async ({ browser, baseURL }, provide) => {
    const session = await openSession(browser, baseURL, 'secondAdvisor')
    await provide(session)
    await session.context.close()
  },
})

export { expect }
