import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

// _standards/i18n.md §4: the language switch checks the text in all three.
const HOME = {
  'pt-BR': 'Jogos Estudantis 2026',
  es: 'Juegos Estudiantiles 2026',
  en: 'Student Games 2026',
} as const

test('when the selector switches to en and es, switches back to pt-BR', async ({
  page,
}) => {
  await page.goto('/')
  await waitForHydration(page)
  await expect(
    page.getByRole('heading', { level: 1, name: HOME['pt-BR'] }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')

  // pt-BR → en
  await page.getByRole('button', { name: 'Idioma' }).click()
  await page.getByRole('menuitemradio', { name: 'Inglês' }).click()
  await expect(page).toHaveURL(/\/en\/?$/)
  await expect(
    page.getByRole('heading', { level: 1, name: HOME.en }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Standings' }),
  ).toBeVisible()

  // en → es
  await waitForHydration(page)
  await page.getByRole('button', { name: 'Language' }).click()
  await page.getByRole('menuitemradio', { name: 'Spanish' }).click()
  await expect(page).toHaveURL(/\/es\/?$/)
  await expect(
    page.getByRole('heading', { level: 1, name: HOME.es }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Clasificación' }),
  ).toBeVisible()

  // es → pt-BR: a URL perde o prefixo.
  await waitForHydration(page)
  await page.getByRole('button', { name: 'Idioma' }).click()
  await page.getByRole('menuitemradio', { name: 'Portugués' }).click()
  await expect(page).toHaveURL('/')
  await expect(
    page.getByRole('heading', { level: 1, name: HOME['pt-BR'] }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
})

test('when the language changes, keeps the same page in the other language', async ({
  page,
}) => {
  await page.goto('/about')
  await waitForHydration(page)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sobre os jogos' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Idioma' }).click()
  await page.getByRole('menuitemradio', { name: 'Espanhol' }).click()

  await expect(page).toHaveURL(/\/es\/about\/?$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Acerca de los juegos' }),
  ).toBeVisible()
})
