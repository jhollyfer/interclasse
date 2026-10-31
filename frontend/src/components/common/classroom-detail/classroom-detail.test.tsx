// @vitest-environment jsdom

import { CATEGORY } from '@interclasse/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type * as React from 'react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CATEGORY_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { ClassroomDetail } from './index'

const { request, send } = vi.hoisted(() => ({
  request: vi.fn(),
  send: vi.fn(async () => undefined),
}))

vi.mock('#/integrations/tanstack-query/http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
  send,
}))

vi.mock('#/hooks/use-unsaved-changes-blocker', () => ({
  useUnsavedChangesBlocker: () => undefined,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: Readonly<{ to: string; children?: React.ReactNode }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const CLASSROOM_ID = '0b9c1f5e-4a6d-4c1e-9d3b-5f2a7e8c1d40'

const SPORT_ID = '5c7d0a52-0f35-4a8e-8d0c-2b6f3f8f9a11'
const ANA_ID = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
const BIA_ID = '8b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e'

const META = { total: 2, perPage: 100, currentPage: 1, lastPage: 1 }

const FUTSAL = {
  id: SPORT_ID,
  name: 'Futsal',
  minAthletes: 1,
  maxAthletes: 5,
  drawn: false,
  locked: false,
}

const BOARD = {
  classroom: { id: CLASSROOM_ID, name: '6º A', category: CATEGORY.F2 },
  sports: [FUTSAL],
  students: [
    { id: ANA_ID, name: 'Ana', sportIds: [SPORT_ID] },
    { id: BIA_ID, name: 'Bia', sportIds: [] },
  ],
}

const ROUTES: Record<string, unknown> = {
  '/advisor/enrollments': BOARD,
  '/advisor/students': { data: BOARD.students, meta: META },
  '/advisor/classrooms': {
    data: [
      {
        id: CLASSROOM_ID,
        advisor: { name: 'Marta' },
        representative: { name: 'Caio' },
      },
    ],
    meta: META,
  },
  '/advisor/cards': { data: [], meta: META },
  '/storefront/matches': { data: [], meta: META },
}

function path(url: string): string {
  return url.split('?')[0] ?? url
}

beforeEach(() => {
  request.mockImplementation(async (url: string) => ROUTES[path(url)])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderDetail(back?: '/administrator/classrooms') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <ClassroomDetail classroomId={CLASSROOM_ID} back={back} />
    </QueryClientProvider>,
  )
}

function requestsTo(url: string, method: string) {
  return request.mock.calls.filter(
    ([called, , options]) =>
      path(String(called)) === url && options?.method === method,
  )
}

describe('ClassroomDetail', () => {
  it('opens with the name, the category and the classroom panel', async () => {
    renderDetail()

    expect(
      await screen.findByRole('heading', { level: 1, name: '6º A' }),
    ).toBeTruthy()
    expect(
      screen.getAllByText(String(CATEGORY_LABELS[CATEGORY.F2])).length,
    ).toBeGreaterThan(0)
    expect(await screen.findByText('Marta')).toBeTruthy()
    expect(await screen.findByText('Caio')).toBeTruthy()
  })

  it('when back is given, shows the back arrow; without it, does not', async () => {
    renderDetail('/administrator/classrooms')

    expect(
      (await screen.findByRole('link', { name: m.common_back() })).getAttribute(
        'href',
      ),
    ).toBe('/administrator/classrooms')

    cleanup()
    renderDetail()
    await screen.findByRole('heading', { level: 1, name: '6º A' })

    expect(screen.queryByRole('link', { name: m.common_back() })).toBeNull()
  })

  it('when saving only additions, saves directly without asking for a reason', async () => {
    ROUTES['/advisor/enrollments'] = BOARD
    renderDetail()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Bia' }))
    await userEvent.click(
      screen.getByRole('button', {
        name: m.common_enrollment_save({ name: 'Futsal' }),
      }),
    )

    await waitFor(() =>
      expect(requestsTo('/advisor/enrollments', 'PUT')).toHaveLength(1),
    )
    expect(
      JSON.parse(
        String(requestsTo('/advisor/enrollments', 'PUT')[0]?.[2]?.body),
      ),
    ).toEqual({
      classroomId: CLASSROOM_ID,
      sportId: SPORT_ID,
      studentIds: expect.arrayContaining([ANA_ID, BIA_ID]),
    })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(m.common_classroom_saved()),
    )
  })

  it('when removing an athlete, opens the reason request before saving', async () => {
    renderDetail()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ana' }))
    await userEvent.click(
      screen.getByRole('button', {
        name: m.common_enrollment_save({ name: 'Futsal' }),
      }),
    )

    expect(
      await screen.findByRole('dialog', {
        name: m.common_removal_title({ sport: 'Futsal' }),
      }),
    ).toBeTruthy()
    expect(requestsTo('/advisor/enrollments', 'PUT')).toHaveLength(0)

    await userEvent.click(
      screen.getByRole('button', { name: m.common_cancel() }),
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('when the reason is given, saves the list, notifies and closes the request', async () => {
    renderDetail()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ana' }))
    await userEvent.click(
      screen.getByRole('button', {
        name: m.common_enrollment_save({ name: 'Futsal' }),
      }),
    )
    await userEvent.type(
      await screen.findByRole('textbox', { name: m.common_removal_reason() }),
      'Mudou de escola',
    )
    await userEvent.click(
      screen.getByRole('button', { name: m.common_removal_submit() }),
    )

    await waitFor(() =>
      expect(requestsTo('/advisor/enrollments', 'PUT')).toHaveLength(1),
    )
    expect(
      JSON.parse(
        String(requestsTo('/advisor/enrollments', 'PUT')[0]?.[2]?.body),
      ),
    ).toMatchObject({ studentIds: [], reason: 'Mudou de escola' })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(m.common_removal_saved()),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('when on the students tab, lists the classroom and registers a new student', async () => {
    renderDetail()

    await userEvent.click(
      await screen.findByRole('tab', {
        name: m.common_classroom_tab_students(),
      }),
    )
    await userEvent.type(
      await screen.findByRole('textbox', { name: m.common_student_name() }),
      'Duda',
    )
    await userEvent.click(
      screen.getByRole('button', { name: m.common_student_add() }),
    )

    await waitFor(() =>
      expect(requestsTo('/advisor/students', 'POST')).toHaveLength(1),
    )
    expect(
      JSON.parse(String(requestsTo('/advisor/students', 'POST')[0]?.[2]?.body)),
    ).toEqual({ classroomId: CLASSROOM_ID, name: 'Duda' })
  })

  it('when removing a student, asks for confirmation and only then deletes', async () => {
    renderDetail()

    await userEvent.click(
      await screen.findByRole('tab', {
        name: m.common_classroom_tab_students(),
      }),
    )
    await userEvent.click(
      await screen.findByRole('button', {
        name: m.common_student_remove_aria({ name: 'Bia' }),
      }),
    )
    expect(send).not.toHaveBeenCalled()

    await userEvent.click(
      await screen.findByRole('button', { name: m.common_remove() }),
    )

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(`/advisor/students/${BIA_ID}`, {
        method: 'DELETE',
      }),
    )
  })

  it('when there is nothing, the cards and matches tabs say so', async () => {
    renderDetail()

    await userEvent.click(
      await screen.findByRole('tab', { name: m.common_classroom_tab_cards() }),
    )
    expect(await screen.findByText(m.common_classroom_no_cards())).toBeTruthy()

    await userEvent.click(
      screen.getByRole('tab', { name: m.common_classroom_tab_matches() }),
    )
    expect(
      await screen.findByText(m.common_classroom_no_matches()),
    ).toBeTruthy()
  })
})
