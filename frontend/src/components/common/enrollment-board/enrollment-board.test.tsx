// @vitest-environment jsdom

import type { AdvisorEnrollmentShowResponse } from '@interclasse/shared'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fromPartial } from '@total-typescript/shoehorn'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { m } from '#/paraglide/messages'

import { EnrollmentBoard } from './index'

afterEach(cleanup)

const FUTSAL = {
  id: 'futsal',
  name: 'Futsal',
  minAthletes: 2,
  maxAthletes: 3,
  drawn: false,
  locked: false,
}

const ANA = { id: 'ana', name: 'Ana', sportIds: ['futsal'] }
const BIA = { id: 'bia', name: 'Bia', sportIds: [] }
const CAIO = { id: 'caio', name: 'Caio', sportIds: [] }
const DUDA = { id: 'duda', name: 'Duda', sportIds: [] }

function board(
  parts: Partial<AdvisorEnrollmentShowResponse>,
): AdvisorEnrollmentShowResponse {
  return fromPartial<AdvisorEnrollmentShowResponse>({
    sports: [FUTSAL],
    students: [ANA, BIA, CAIO, DUDA],
    ...parts,
  })
}

describe('EnrollmentBoard', () => {
  it('sem aluno diz que a lista de alunos vem antes', () => {
    render(<EnrollmentBoard board={board({ students: [] })} onSave={vi.fn()} />)

    expect(screen.getByText(m.common_enrollment_no_students())).toBeTruthy()
  })

  it('sem modalidade diz que não há nenhuma cadastrada', () => {
    render(<EnrollmentBoard board={board({ sports: [] })} onSave={vi.fn()} />)

    expect(screen.getByText(m.common_enrollment_no_sports())).toBeTruthy()
  })

  it('marca quem já está inscrito e mostra a contagem', () => {
    render(<EnrollmentBoard board={board({})} onSave={vi.fn()} />)

    expect(
      screen
        .getByRole('checkbox', { name: 'Ana' })
        .getAttribute('aria-checked'),
    ).toBe('true')
    expect(
      screen.getByText(m.common_enrollment_count({ count: 1, min: 2, max: 3 })),
    ).toBeTruthy()
  })

  it('salvar fica travado até haver mudança', () => {
    render(<EnrollmentBoard board={board({})} onSave={vi.fn()} />)

    expect(
      screen
        .getByRole('button', {
          name: m.common_enrollment_save({ name: 'Futsal' }),
        })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('salvar manda a lista inteira e os nomes de quem saiu', async () => {
    const onSave = vi.fn()
    render(<EnrollmentBoard board={board({})} onSave={onSave} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Ana' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Bia' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Caio' }))
    await userEvent.click(
      screen.getByRole('button', {
        name: m.common_enrollment_save({ name: 'Futsal' }),
      }),
    )

    expect(onSave).toHaveBeenCalledWith('futsal', ['bia', 'caio'], ['Ana'])
  })

  it('passar do máximo avisa e trava o salvar', async () => {
    render(<EnrollmentBoard board={board({})} onSave={vi.fn()} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Bia' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Caio' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Duda' }))

    expect(
      screen.getByText(m.common_enrollment_over({ count: 1 })),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('button', {
          name: m.common_enrollment_save({ name: 'Futsal' }),
        })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('abaixo do mínimo avisa que a turma fica fora do sorteio', () => {
    render(<EnrollmentBoard board={board({})} onSave={vi.fn()} />)

    expect(screen.getByText(m.common_enrollment_under())).toBeTruthy()
  })

  it('modalidade travada não deixa marcar nem salvar', () => {
    render(
      <EnrollmentBoard
        board={board({ sports: [{ ...FUTSAL, locked: true, drawn: true }] })}
        onSave={vi.fn()}
      />,
    )

    expect(
      screen
        .getByRole('checkbox', { name: 'Bia' })
        .hasAttribute('data-disabled'),
    ).toBe(true)
    expect(
      screen.queryByRole('button', {
        name: m.common_enrollment_save({ name: 'Futsal' }),
      }),
    ).toBeNull()
  })

  it('sem canRemove o inscrito não sai, mas o novo entra', () => {
    render(
      <EnrollmentBoard board={board({})} onSave={vi.fn()} canRemove={false} />,
    )

    expect(
      screen
        .getByRole('checkbox', { name: 'Ana' })
        .hasAttribute('data-disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('checkbox', { name: 'Bia' })
        .hasAttribute('data-disabled'),
    ).toBe(false)
  })

  it('só o cartão da modalidade em salvamento trava', () => {
    render(
      <EnrollmentBoard
        board={board({
          sports: [FUTSAL, { ...FUTSAL, id: 'volei', name: 'Vôlei' }],
          students: [{ ...ANA, sportIds: [] }, BIA],
        })}
        onSave={vi.fn()}
        savingSportId="volei"
      />,
    )

    expect(screen.getAllByRole('button', { name: /^Salvar / }).length).toBe(2)
  })
})
