// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Button } from '#/components/ui/button'
import { createConfirmHandle } from '#/lib/dialog-handle'
import { m } from '#/paraglide/messages'

import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogDescription,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
  ConfirmDialogTitle,
} from './index'

afterEach(cleanup)

function body() {
  return (
    <>
      <ConfirmDialogHeader>
        <ConfirmDialogTitle>Remover a turma 7A?</ConfirmDialogTitle>
        <ConfirmDialogDescription>Some do site.</ConfirmDialogDescription>
      </ConfirmDialogHeader>
      <ConfirmDialogFooter>
        <ConfirmDialogCancel />
        <ConfirmDialogConfirm>Remover</ConfirmDialogConfirm>
      </ConfirmDialogFooter>
    </>
  )
}

describe('ConfirmDialog', () => {
  it('abre pelo gatilho visível e nomeia o alerta pelo título', async () => {
    render(
      <ConfirmDialog render={<Button>Abrir</Button>} onConfirm={vi.fn()}>
        {body()}
      </ConfirmDialog>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    expect(
      await screen.findByRole('alertdialog', { name: 'Remover a turma 7A?' }),
    ).toBeTruthy()
  })

  it('confirmar roda a ação uma vez e fecha o alerta', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog render={<Button>Abrir</Button>} onConfirm={onConfirm}>
        {body()}
      </ConfirmDialog>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Remover' }),
    )

    expect(onConfirm).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('cancelar fecha sem rodar a ação', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog render={<Button>Abrir</Button>} onConfirm={onConfirm}>
        {body()}
      </ConfirmDialog>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    await userEvent.click(
      await screen.findByRole('button', { name: m.common_cancel() }),
    )

    expect(onConfirm).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('abre por handle, sem gatilho, e passa o payload ao texto e à ação', async () => {
    const handle = createConfirmHandle<{ name: string }>()
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog handle={handle} onConfirm={onConfirm}>
        {(target) => (
          <ConfirmDialogHeader>
            <ConfirmDialogTitle>Remover {target.name}?</ConfirmDialogTitle>
            <ConfirmDialogDescription>Some do site.</ConfirmDialogDescription>
            <ConfirmDialogConfirm>Remover</ConfirmDialogConfirm>
          </ConfirmDialogHeader>
        )}
      </ConfirmDialog>,
    )

    act(() => handle.openWithPayload({ name: '8B' }))

    expect(
      await screen.findByRole('alertdialog', { name: 'Remover 8B?' }),
    ).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }))

    expect(onConfirm).toHaveBeenCalledWith({ name: '8B' })
  })

  it('uma parte fora do ConfirmDialog diz qual ficou sem provider', () => {
    expect(() =>
      render(<ConfirmDialogConfirm>Remover</ConfirmDialogConfirm>),
    ).toThrow('ConfirmDialogConfirm')
  })
})
