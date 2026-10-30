import { expect, test as setup } from '@playwright/test'
import type { Page } from '@playwright/test'

import { credentialsOf } from './credentials'
import type { Role } from './credentials'
import { waitForHydration } from './hydration'
import { storageStatePath } from './session'

/**
 * Entra uma vez por papel e guarda a sessão em arquivo
 * (_doc-lib/playwright.md#docs/auth). A API limita o login a 5 por minuto por
 * IP e 20 por hora por conta, então logar a cada teste bloquearia a suíte.
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

// A segunda turma do mesmo sorteio precisa de outro conselheiro.
setup('entra como a segunda conselheira', async ({ page }) => {
  await signIn('secondAdvisor', 'advisor', page)
  await expect(page).toHaveURL(/\/advisor/)
})
