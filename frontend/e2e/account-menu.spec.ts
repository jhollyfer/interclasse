import { credentialsOf } from './support/credentials'
import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

// Regression: opening the profile from the account menu fell into "Algo quebrou aqui" (500).
test('when the administrator opens the account menu, reaches the profile without error', async ({
  administrator: { page },
}) => {
  const { email } = credentialsOf('administrator')

  await page.goto('/administrator')
  await waitForHydration(page)

  await page.getByRole('button', { name: /^Conta:/ }).click()
  await page.getByRole('menuitem', { name: 'Meu perfil' }).click()

  await expect(page).toHaveURL(/\/profile\/?$/)
  await expect(page.getByText('Algo quebrou aqui')).toHaveCount(0)
  await expect(page.getByText(email).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Editar perfil' })).toBeVisible()
})

test('when the old profile address is opened, redirects to /profile', async ({
  administrator: { page },
}) => {
  await page.goto('/administrator/profile')

  await expect(page).toHaveURL(/\/profile\/?$/)
  await expect(page.getByText('Algo quebrou aqui')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Editar perfil' })).toBeVisible()
})
