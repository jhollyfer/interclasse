import type { APIRequestContext } from '@playwright/test'

import { apiUrl } from './support/credentials'
import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

/** Uma chave que o seed sorteou: o link compartilhado do teste. */
async function firstBracketId(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${apiUrl()}/storefront/brackets`)
  expect(response.ok()).toBe(true)
  const body: { data: ReadonlyArray<{ id: string }> } = await response.json()
  const first = body.data.at(0)
  if (!first) throw new Error('o seed precisa ter ao menos uma chave')
  return first.id
}

// docs/USER-FLOWS.md, "Consultar o site público", passos 1 e 3.
test.describe('classificação pública', () => {
  test('a home troca de categoria e de modalidade sem mudar de página', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForHydration(page)

    const standings = page.getByRole('heading', {
      name: 'Classificação',
      level: 2,
    })
    await expect(standings).toBeVisible()

    const category = page.getByRole('tablist', { name: 'Categoria' })
    const sports = page.getByRole('group', { name: 'Modalidade' })
    const title = page.getByRole('heading', { level: 3, name: /·/ })

    // Fundamental 1 → Fundamental 2.
    await category.getByRole('tab', { name: /Fundamental 2/ }).click()
    await expect(
      category.getByRole('tab', { name: /Fundamental 2/ }),
    ).toHaveAttribute('aria-selected', 'true')
    await expect(title).toContainText('Fundamental 2')
    await expect(page).toHaveURL('/')

    // Volta e troca de modalidade dentro da categoria.
    await category.getByRole('tab', { name: /Fundamental 1/ }).click()
    await expect(title).toContainText('Fundamental 1')

    const buttons = sports.getByRole('button')
    await expect(buttons.nth(1)).toBeVisible()
    await expect(buttons.nth(0)).toHaveAttribute('aria-pressed', 'true')

    const second = buttons.nth(1)
    const sportName = await second.locator('span').first().innerText()
    await second.click()

    await expect(second).toHaveAttribute('aria-pressed', 'true')
    await expect(buttons.nth(0)).toHaveAttribute('aria-pressed', 'false')
    await expect(title).toContainText(`${sportName} · Fundamental 1`)
    await expect(page).toHaveURL('/')
    await expect(standings).toBeVisible()
  })

  test('a página da chave tem "Voltar ao início" e leva à home', async ({
    page,
    request,
  }) => {
    const id = await firstBracketId(request)

    await page.goto(`/classificacao/${id}`)
    await waitForHydration(page)

    await expect(
      page.getByRole('heading', { level: 3, name: /·/ }),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Jogos Estudantis 2026' }),
    ).toBeVisible()
  })
})
