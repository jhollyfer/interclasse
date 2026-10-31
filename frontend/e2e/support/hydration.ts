import type { Page } from '@playwright/test'

/**
 * The app renders on the server: the HTML arrives before React takes over.
 * Whatever the test types in that window is wiped when hydration finishes
 * (the controlled field goes back to empty), and a click falls on the form's
 * native submit.
 *
 * React 19 writes `__reactProps$...` on the element it hydrated; that is the
 * signal the DOM exposes. It looks at the whole page, not only `main`: a text
 * page (About) has no link or button there, but the header hydrates with it.
 * No `waitForTimeout` and no `networkidle` (which the lint rejects).
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('a, button, input')).some((element) =>
      Object.keys(element).some((key) => key.startsWith('__reactProps')),
    ),
  )
}
