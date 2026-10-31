import { credentialsOf } from './support/credentials'
import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

// Regression: opening the profile from the account menu fell into "Algo quebrou aqui" (500).
test('o administrador abre o menu da conta e chega ao perfil sem erro', async ({
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

test('o endereço antigo do perfil leva ao /profile', async ({
  administrator: { page },
}) => {
  await page.goto('/administrator/profile')

  await expect(page).toHaveURL(/\/profile\/?$/)
  await expect(page.getByText('Algo quebrou aqui')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Editar perfil' })).toBeVisible()
})
