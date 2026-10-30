import { deflateSync, crc32 } from 'node:zlib'
import type { APIRequestContext } from '@playwright/test'

import { apiUrl } from './support/credentials'
import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

type PhotoRow = Readonly<{ id: string; caption: string | null }>

/** Um bloco PNG: tamanho, tipo, dados e CRC32 do tipo + dados. */
function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** PNG verdadeiro de 16x16, uma cor só: o servidor valida o tipo do arquivo. */
function solidPng(): Buffer {
  const size = 16
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.writeUInt8(8, 8) // 8 bits por canal
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

/** Apaga pela API toda foto com a legenda: o teste não deixa lixo mesmo se cair no meio. */
async function purge(
  request: APIRequestContext,
  caption: string,
): Promise<void> {
  const list = await request.get(`${apiUrl()}/administrator/photos?perPage=100`)
  if (!list.ok()) return
  const body: { data: ReadonlyArray<PhotoRow> } = await list.json()
  for (const photo of body.data.filter((item) => item.caption === caption)) {
    await request.delete(`${apiUrl()}/administrator/photos/${photo.id}`)
  }
}

// docs/USER-FLOWS.md, "Enviar e aprovar fotos".
test('a conselheira envia, a organização aprova, a foto vai ao carrossel e é apagada', async ({
  advisor,
  administrator,
  browser,
  baseURL,
}) => {
  const caption = `E2E foto ${Date.now()}`

  try {
    // 1. A conselheira envia: a foto fica aguardando.
    await advisor.page.goto('/advisor/photos')
    await waitForHydration(advisor.page)
    await advisor.page.locator('input[type="file"]').setInputFiles({
      name: 'e2e.png',
      mimeType: 'image/png',
      buffer: solidPng(),
    })
    // O envio sobe na hora da escolha; "Remover" só aparece com a imagem pronta,
    // e clicar em "Enviar foto" antes disso é ignorado (o submit fica travado).
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

    // 2. A organização aprova.
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

    // 3. O visitante vê a foto no carrossel da home.
    const visitor = await browser.newContext({ baseURL })
    try {
      const home = await visitor.newPage()
      await home.goto('/')
      const slide = home.getByRole('figure', { name: caption })
      await expect(slide).toBeAttached()
    } finally {
      await visitor.close()
    }

    // 4. A organização apaga, pela lista.
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
