import { readFile } from 'node:fs/promises'

import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

const BOM = '﻿'

// docs/USER-FLOWS.md, "Baixar o relatório".
test('a tela de relatórios abre e o botão baixa o CSV com BOM e o cabeçalho', async ({
  administrator: { page },
}) => {
  await page.goto('/administrator/reports')
  await waitForHydration(page)

  await expect(
    page.getByRole('heading', { level: 1, name: 'Relatórios' }),
  ).toBeVisible()
  await expect(page.getByText('Por turma')).toBeVisible()
  await expect(page.getByText('Algo quebrou aqui')).toHaveCount(0)

  const download = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Baixar planilha (CSV)' }).click()
  const file = await download

  expect(file.suggestedFilename()).toBe('relatorio-jogos.csv')

  const path = await file.path()
  const csv = await readFile(path, 'utf8')

  // O BOM é o que faz o Excel abrir os acentos certos; `;` separa as colunas.
  expect(csv.startsWith(BOM)).toBe(true)
  const [header] = csv.slice(BOM.length).split(/\r?\n/)
  expect(header).toBe(
    [
      'Turma',
      'Categoria',
      'Conselheiro',
      'Representante',
      'Alunos',
      'Atletas',
      'Modalidades',
    ]
      .map((column) => `"${column}"`)
      .join(';'),
  )
})
