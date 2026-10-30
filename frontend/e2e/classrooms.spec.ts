import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

// docs/USER-FLOWS.md, "Cadastrar uma turma", passos 1 e 4.
test('o administrador vê as turmas em cartões, filtra o Fundamental 1 e abre uma turma', async ({
  administrator: { page },
}) => {
  await page.goto('/administrator/classrooms')
  await waitForHydration(page)

  // O título de cada cartão é o link para a turma ("3º A").
  const cards = page
    .getByRole('main')
    .getByRole('link', { name: /^\d+º [A-Z]$/ })
  const category = page.getByRole('tablist', { name: 'Categoria' })

  await expect(cards.first()).toBeVisible()
  const all = await cards.count()

  // Filtra pelo Fundamental 1: a URL ganha o filtro e só ficam cartões dele.
  await category.getByRole('tab', { name: /Fundamental 1/ }).click()
  await expect(page).toHaveURL(/category=F1/)
  await expect(
    category.getByRole('tab', { name: /Fundamental 1/ }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Fundamental 2 ·')).toHaveCount(0)
  await expect(page.getByText('Fundamental 1 ·').first()).toBeVisible()
  expect(await cards.count()).toBeLessThan(all)

  // Abre a primeira turma: quadro "Sobre a turma" e a aba Jogos.
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
