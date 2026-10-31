import { expect, test as setup } from '@playwright/test'
import type { Page } from '@playwright/test'

import { credentialsOf } from './credentials'
import type { Role } from './credentials'
import { waitForHydration } from './hydration'
import { storageStatePath } from './session'

/**
 * Signs in once per role and saves the session to a file
 * (_doc-lib/playwright.md#docs/auth). The API limits login to 5 per minute per
 * IP and 20 per hour per account, so logging in on every test would block the suite.
 */
async function signIn(role: Role, area: string, page: Page): Promise<void> {
  const { email, password } = credentialsOf(role)

  await page.goto('/sign-in')
  await waitForHydration(page)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(new RegExp(`/${area}`))

  await page.context().storageState({ path: storageStatePath(role) })
}

setup('entra como organização', async ({ page }) => {
  await signIn('administrator', 'administrator', page)
  await expect(page).toHaveURL(/\/administrator/)
})

setup('entra como conselheira', async ({ page }) => {
  await signIn('advisor', 'advisor', page)
  await expect(page).toHaveURL(/\/advisor/)
})

// The second classroom of the same draw needs a different advisor.
setup('entra como a segunda conselheira', async ({ page }) => {
  await signIn('secondAdvisor', 'advisor', page)
  await expect(page).toHaveURL(/\/advisor/)
})
