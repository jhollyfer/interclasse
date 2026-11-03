import { z } from '@interclasse/shared'

import { apiUrl, baseUrl } from './support/env'
import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

// Regression: the role and status badges were inside the `h1`, so the screen's name
// read "Adalberto Sampaio Professor conselheiro Ativo" to a screen reader.
test('when the administrator opens a user, the h1 is only the name and the badges come after it', async ({
  administrator: { page, context },
}) => {
  const response = await context.request.get(
    `${apiUrl()}/administrator/users?perPage=1`,
    { headers: { origin: new URL(baseUrl()).origin } },
  )
  const { data } = z
    .object({ data: z.array(z.object({ id: z.string(), name: z.string() })) })
    .parse(await response.json())
  const [user] = data
  expect(user, 'The seed has no user to open').toBeDefined()

  await page.goto(`/administrator/users/${user?.id}`)
  await waitForHydration(page)

  await expect(
    page.getByRole('heading', { level: 1, name: user?.name, exact: true }),
  ).toBeVisible()
  await expect(page.locator('[data-slot="page-header-badges"]')).toBeVisible()
  await expect(page.locator('h1 [data-slot="badge"]')).toHaveCount(0)
})
