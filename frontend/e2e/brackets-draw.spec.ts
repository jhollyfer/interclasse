import type { APIRequestContext, Locator, Page } from '@playwright/test'

import { apiUrl, writeHeaders } from './support/credentials'
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

/** The advisor's classroom and its first student: the test athlete. */
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
    headers: writeHeaders(),
    data: { ...input, reason: 'limpeza do teste E2E' },
  })
  expect(response.ok(), 'PUT /advisor/enrollments').toBe(true)
}

/** The sport created through the UI, found by its unique name. */
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

/** Opens the draw dialog and picks the sport and the category. */
async function openDraw(page: Page, sport: string): Promise<void> {
  await page.getByRole('button', { name: 'Sortear chave' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sortear chave' })
  await choose(
    page,
    dialog.getByRole('combobox', { name: 'Modalidade' }),
    sport,
  )
  await choose(
    page,
    dialog.getByRole('combobox', { name: 'Categoria' }),
    'Fundamental 1',
  )
}

/** Opens the combobox and picks the option by name (the list renders in a popup outside the dialog). */
async function choose(
  page: Page,
  combobox: Locator,
  option: string,
): Promise<void> {
  await combobox.click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

// docs/USER-FLOWS.md, "Cadastrar uma modalidade" and "Sortear uma chave".
test('when the administrator creates the sport, draws the bracket, draws again and deletes the bracket', async ({
  administrator: { page, context },
  advisor,
  secondAdvisor,
}) => {
  const admin = context.request
  const name = `E2E ${Date.now()}`
  const teams = [advisor.context.request, secondAdvisor.context.request]

  try {
    // 1. Creates the sport through the UI (minimum 1, so a one-athlete list is enough).
    await page.goto('/administrator/sports/new')
    await waitForHydration(page)
    await page.getByLabel('Nome', { exact: true }).fill(name)
    await page.getByLabel('Mínimo de atletas').fill('1')
    await page.getByLabel('Máximo de atletas').fill('2')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(`Modalidade ${name} criada.`)).toBeVisible()

    const sport = await sportNamed(admin, name)

    // 2. Two classrooms of the same category each enroll one athlete (the draw needs two).
    for (const request of teams) {
      const athlete = await firstAthlete(request)
      await enroll(request, {
        classroomId: athlete.classroomId,
        sportId: sport.id,
        studentIds: [athlete.studentId],
      })
    }

    // 3. Draws: the dialog shows both classrooms and opens the whole bracket.
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

    // 4. Repeating the draw returns the same bracket, with no error and no second one.
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

    // 5. Deletes the bracket from the list: asks for confirmation, and enrollments reopen.
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
 * Restores the database to what it was, even if the test dies midway: bracket,
 * enrollments (with a reason, which the API requires) and the sport. The
 * removal notice goes away with the sport (`ON DELETE CASCADE`).
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
    await admin.delete(`${apiUrl()}/administrator/brackets/${bracket.id}`, {
      headers: writeHeaders(),
    })
  }

  for (const request of teams) {
    const { classroomId } = await firstAthlete(request)
    await enroll(request, { classroomId, sportId: sport.id, studentIds: [] })
  }

  await admin.delete(`${apiUrl()}/administrator/sports/${sport.id}`, {
    headers: writeHeaders(),
  })
}
