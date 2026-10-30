import type { APIRequestContext, Page } from '@playwright/test'

import { apiUrl } from './support/credentials'
import { waitForHydration } from './support/hydration'
import { expect, test } from './support/test'

type Row = Readonly<{ id: string; name: string }>
type BracketRow = Readonly<{ id: string; sport: Row }>
type Page_<T> = Readonly<{ data: ReadonlyArray<T> }>

async function readPage<T>(
  request: APIRequestContext,
  path: string,
): Promise<ReadonlyArray<T>> {
  const response = await request.get(`${apiUrl()}${path}`)
  expect(response.ok(), `GET ${path}`).toBe(true)
  const body: Page_<T> = await response.json()
  return body.data
}

/** A turma da conselheira e o primeiro aluno dela: o atleta do teste. */
async function firstAthlete(
  request: APIRequestContext,
): Promise<Readonly<{ classroomId: string; studentId: string }>> {
  const [classroom] = await readPage<Row>(request, '/advisor/classrooms')
  if (!classroom) throw new Error('a conselheira do seed precisa ter turma')
  const [student] = await readPage<Row>(
    request,
    `/advisor/students?classroomId=${classroom.id}&perPage=1`,
  )
  if (!student) throw new Error('a turma do seed precisa ter alunos')
  return { classroomId: classroom.id, studentId: student.id }
}

async function enroll(
  request: APIRequestContext,
  input: Readonly<{
    classroomId: string
    sportId: string
    studentIds: ReadonlyArray<string>
  }>,
): Promise<void> {
  const response = await request.put(`${apiUrl()}/advisor/enrollments`, {
    data: { ...input, reason: 'limpeza do teste E2E' },
  })
  expect(response.ok(), 'PUT /advisor/enrollments').toBe(true)
}

/** A modalidade criada pela tela, achada pelo nome único. */
async function sportNamed(
  request: APIRequestContext,
  name: string,
): Promise<Row> {
  const sports = await readPage<Row>(
    request,
    '/administrator/sports?perPage=100',
  )
  const sport = sports.find((item) => item.name === name)
  if (!sport) throw new Error(`a modalidade ${name} não apareceu na API`)
  return sport
}

/** Abre o diálogo de sorteio e escolhe a modalidade e a categoria. */
async function openDraw(page: Page, sport: string): Promise<void> {
  await page.getByRole('button', { name: 'Sortear chave' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sortear chave' })
  await dialog.getByLabel('Modalidade').selectOption({ label: sport })
  await dialog.getByLabel('Categoria').selectOption({ label: 'Fundamental 1' })
}

// docs/USER-FLOWS.md, "Cadastrar uma modalidade" e "Sortear uma chave".
test('o administrador cria a modalidade, sorteia a chave, sorteia de novo e apaga a chave', async ({
  administrator: { page, context },
  advisor,
  secondAdvisor,
}) => {
  const admin = context.request
  const name = `E2E ${Date.now()}`
  const teams = [advisor.context.request, secondAdvisor.context.request]

  try {
    // 1. Cria a modalidade pela tela (mínimo 1, para uma lista de um atleta bastar).
    await page.goto('/administrator/sports/new')
    await waitForHydration(page)
    await page.getByLabel('Nome', { exact: true }).fill(name)
    await page.getByLabel('Mínimo de atletas').fill('1')
    await page.getByLabel('Máximo de atletas').fill('2')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(`Modalidade ${name} criada.`)).toBeVisible()

    const sport = await sportNamed(admin, name)

    // 2. Duas turmas da mesma categoria inscrevem um atleta cada (o sorteio exige duas).
    for (const request of teams) {
      const athlete = await firstAthlete(request)
      await enroll(request, {
        classroomId: athlete.classroomId,
        sportId: sport.id,
        studentIds: [athlete.studentId],
      })
    }

    // 3. Sorteia: o diálogo mostra as duas turmas e abre a chave inteira.
    await page.goto('/administrator/brackets')
    await waitForHydration(page)
    await openDraw(page, name)
    const dialog = page.getByRole('dialog', { name: 'Sortear chave' })
    await expect(dialog.getByText(/2 turmas/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Sortear', exact: true }).click()
    await expect(page.getByText('Chave sorteada.')).toBeVisible()
    await expect(page).toHaveURL(/\/administrator\/brackets\/[\w-]+$/)
    const bracketUrl = page.url()
    await expect(page.getByText('Algo quebrou aqui')).toHaveCount(0)

    // 4. Repetir o sorteio devolve a mesma chave, sem erro e sem outra.
    await page.goto('/administrator/brackets')
    await waitForHydration(page)
    await openDraw(page, name)
    await expect(
      page.getByText('Esta modalidade já foi sorteada nesta categoria.'),
    ).toBeVisible()
    await page
      .getByRole('dialog', { name: 'Sortear chave' })
      .getByRole('button', { name: 'Sortear', exact: true })
      .click()
    await expect(page).toHaveURL(bracketUrl)
    const brackets = await readPage<BracketRow>(
      admin,
      '/administrator/brackets?perPage=50',
    )
    expect(brackets.filter((item) => item.sport.id === sport.id)).toHaveLength(
      1,
    )

    // 5. Apaga a chave pela lista: pede confirmação, e as inscrições reabrem.
    await page.goto('/administrator/brackets')
    await waitForHydration(page)
    const row = page.getByRole('row').filter({ hasText: name })
    await row.getByRole('button', { name: 'Abrir ações' }).click()
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toContainText(name)
    await confirm.getByRole('button', { name: 'Remover' }).click()
    await expect(
      page.getByText('Chave apagada. As inscrições reabriram.'),
    ).toBeVisible()
    await expect(row).toHaveCount(0)
  } finally {
    await cleanUp(admin, teams, name)
  }
})

/**
 * Devolve o banco ao que era, mesmo se o teste cair no meio: chave, inscrições
 * (com motivo, que a API exige) e a modalidade. O aviso de remoção some junto
 * com a modalidade (`ON DELETE CASCADE`).
 */
async function cleanUp(
  admin: APIRequestContext,
  teams: ReadonlyArray<APIRequestContext>,
  name: string,
): Promise<void> {
  const sports = await readPage<Row>(admin, '/administrator/sports?perPage=100')
  const sport = sports.find((item) => item.name === name)
  if (!sport) return

  const brackets = await readPage<BracketRow>(
    admin,
    '/administrator/brackets?perPage=50',
  )
  for (const bracket of brackets.filter((item) => item.sport.id === sport.id)) {
    await admin.delete(`${apiUrl()}/administrator/brackets/${bracket.id}`)
  }

  for (const request of teams) {
    const { classroomId } = await firstAthlete(request)
    await enroll(request, { classroomId, sportId: sport.id, studentIds: [] })
  }

  await admin.delete(`${apiUrl()}/administrator/sports/${sport.id}`)
}
