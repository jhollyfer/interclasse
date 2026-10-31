import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

// docs/USER-FLOWS.md, "Cadastrar uma turma", steps 1 and 4.
test('when the administrator views the classrooms as cards, filters Fundamental 1 and opens a classroom', async ({
  administrator: { page },
  expectAccessible,
}) => {
  await page.goto('/administrator/classrooms')
  await waitForHydration(page)
  await expectAccessible(page)

  // Each card's title is the link to the classroom ("3º A").
  const cards = page
    .getByRole('main')
    .getByRole('link', { name: /^\d+º [A-Z]$/ })
  const category = page.getByRole('tablist', { name: 'Categoria' })

  await expect(cards.first()).toBeVisible()
  const all = await cards.count()

  // Filters by Fundamental 1: the URL gains the filter and only its cards remain.
  await category.getByRole('tab', { name: /Fundamental 1/ }).click()
  await expect(page).toHaveURL(/category=F1/)
  await expect(
    category.getByRole('tab', { name: /Fundamental 1/ }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Fundamental 2 ·')).toHaveCount(0)
  await expect(page.getByText('Fundamental 1 ·').first()).toBeVisible()
  expect(await cards.count()).toBeLessThan(all)

  // Opens the first classroom: "Sobre a turma" panel and the Jogos tab.
  const first = cards.first()
  const name = await first.innerText()
  await first.click()

  await expect(page).toHaveURL(/\/administrator\/classrooms\/[\w-]+$/)
  await expect(page.getByRole('heading', { name })).toBeVisible()
  await expect(page.getByText('Sobre a turma')).toBeVisible()
  await expect(page.getByText('Conselheiro').first()).toBeVisible()

  const matches = page.getByRole('tab', { name: 'Jogos' })
  await matches.click()
  await expect(matches).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Algo quebrou aqui')).toHaveCount(0)
})
