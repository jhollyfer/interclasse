import { apiUrl, writeHeaders } from './support/credentials'
import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

/** O campo vazio da API é `null`; o textarea o mostra como texto vazio. */
function textOf(value: unknown): string {
  if (typeof value === 'string') return value
  return ''
}

// docs/USER-FLOWS.md, "Editar o site", passos 1 e 3.
test('a organização muda o texto do Sobre, o /sobre mostra, e o original volta no fim', async ({
  administrator: { page, context },
  browser,
  baseURL,
}) => {
  const endpoint = `${apiUrl()}/administrator/site`

  // O que existe hoje: é isto que o `finally` devolve, mesmo se o teste falhar.
  const before = await context.request.get(endpoint)
  expect(before.ok()).toBe(true)
  const original: Record<string, unknown> = await before.json()
  const { about: originalAbout } = original

  const text = `Texto do E2E ${Date.now()}: os jogos reúnem as turmas do CMEI.`

  try {
    await page.goto('/administrator/site')
    await waitForHydration(page)

    const field = page.getByLabel('O que são os jogos')
    await expect(field).toBeVisible()
    await field.fill(text)
    await expect(field).toHaveValue(text)

    const saved = page.waitForResponse(
      (response) =>
        response.url() === endpoint && response.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: 'Salvar' }).click()
    expect((await saved).ok()).toBe(true)
    await expect(page.getByText('Site atualizado.')).toBeVisible()

    // O visitante sem conta vê o texto novo.
    const visitor = await browser.newContext({ baseURL })
    try {
      const site = await visitor.newPage()
      await site.goto('/sobre')
      await expect(
        site.getByRole('heading', { level: 1, name: 'Sobre os jogos' }),
      ).toBeVisible()
      await expect(site.getByText(text)).toBeVisible()
    } finally {
      await visitor.close()
    }
  } finally {
    const restore = await context.request.put(endpoint, {
      headers: writeHeaders(),
      data: {
        about: originalAbout,
        organizer: original.organizer,
        firstEditionYear: original.firstEditionYear,
        edition: original.edition,
        schoolInstagram: original.schoolInstagram,
        developerInstagram: original.developerInstagram,
        regulationId: original.regulationId,
      },
    })
    expect(restore.ok()).toBe(true)
  }

  // Restaurado: a tela volta a mostrar o valor de antes.
  await page.reload()
  await waitForHydration(page)
  await expect(page.getByLabel('O que são os jogos')).toHaveValue(
    textOf(originalAbout),
  )
})
