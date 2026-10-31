import type { APIRequestContext } from '@playwright/test'
import { deflateSync, crc32 } from 'node:zlib'

import { apiUrl, writeHeaders } from './support/credentials'
import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

type PhotoRow = Readonly<{ id: string; caption: string | null }>

/** A PNG chunk: length, type, data and CRC32 of type + data. */
function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** A real 16x16 PNG, a single color: the server validates the file type. */
function solidPng(): Buffer {
  const size = 16
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.writeUInt8(8, 8) // 8 bits per channel
  header.writeUInt8(2, 9) // RGB

  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0x2f)])
  const pixels = Buffer.concat(Array.from({ length: size }, () => row))

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Deletes through the API every photo with the caption: the test leaves no junk even if it dies midway. */
async function purge(
  request: APIRequestContext,
  caption: string,
): Promise<void> {
  const list = await request.get(`${apiUrl()}/administrator/photos?perPage=100`)
  if (!list.ok()) return
  const body: { data: ReadonlyArray<PhotoRow> } = await list.json()
  for (const photo of body.data.filter((item) => item.caption === caption)) {
    await request.delete(`${apiUrl()}/administrator/photos/${photo.id}`, {
      headers: writeHeaders(),
    })
  }
}

// docs/USER-FLOWS.md, "Enviar e aprovar fotos".
test('when the advisor uploads and the organization approves, the photo reaches the carousel and is deleted', async ({
  advisor,
  administrator,
  browser,
  baseURL,
}) => {
  const caption = `E2E foto ${Date.now()}`

  try {
    // 1. The advisor uploads: the photo stays pending.
    await advisor.page.goto('/advisor/photos')
    await waitForHydration(advisor.page)
    await advisor.page.locator('input[type="file"]').setInputFiles({
      name: 'e2e.png',
      mimeType: 'image/png',
      buffer: solidPng(),
    })
    // The upload starts as soon as the file is chosen; "Remover" only appears with the image ready,
    // and clicking "Enviar foto" before that is ignored (the submit stays locked).
    await expect(
      advisor.page.getByRole('button', { name: 'Remover' }),
    ).toBeVisible()
    await advisor.page.getByLabel('Legenda (opcional)').fill(caption)
    await advisor.page.getByRole('button', { name: 'Enviar foto' }).click()
    await expect(
      advisor.page.getByText(
        'Foto enviada. Ela aparece no site depois de aprovada.',
      ),
    ).toBeVisible()

    const mine = advisor.page.getByRole('listitem').filter({ hasText: caption })
    await expect(mine).toBeVisible()
    await expect(mine.getByText('Aguardando aprovação')).toBeVisible()

    // 2. The organization approves.
    const { page } = administrator
    await page.goto('/administrator/photos')
    await waitForHydration(page)
    await page.getByRole('tab', { name: 'Aguardando' }).click()
    const pending = page.getByRole('listitem').filter({ hasText: caption })
    await expect(pending).toBeVisible()
    await pending.getByRole('button', { name: 'Aprovar' }).click()
    await expect(
      page.getByText('Foto aprovada: já está no site.'),
    ).toBeVisible()

    // 3. The visitor sees the photo in the home carousel.
    const visitor = await browser.newContext({ baseURL })
    try {
      const home = await visitor.newPage()
      await home.goto('/')
      const slide = home.getByRole('figure', { name: caption })
      await expect(slide).toBeAttached()
    } finally {
      await visitor.close()
    }

    // 4. The organization deletes it from the list.
    await page.getByRole('tab', { name: 'No site' }).click()
    const approved = page.getByRole('listitem').filter({ hasText: caption })
    await expect(approved).toBeVisible()
    await approved.getByRole('button', { name: 'Apagar foto' }).click()
    await page.getByRole('button', { name: 'Apagar', exact: true }).click()
    await expect(page.getByText('Foto apagada.')).toBeVisible()
    await expect(approved).toHaveCount(0)
  } finally {
    await purge(administrator.context.request, caption)
  }
})
