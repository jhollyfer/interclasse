// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ConfirmDialogDescription,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { createConfirmHandle } from '#/lib/dialog-handle'
import { m } from '#/paraglide/messages'

import { RowActions, RowActionsConfirm, RowActionsDelete } from './index'

afterEach(cleanup)

function Row({ onConfirm }: Readonly<{ onConfirm: () => void }>) {
  const [handle] = React.useState(() => createConfirmHandle())

  return (
    <RowActions
      dialogs={
        <RowActionsConfirm
          handle={handle}
          destructive
          confirmLabel="Apagar de vez"
          onConfirm={onConfirm}
        >
          <ConfirmDialogTitle>Apagar a linha?</ConfirmDialogTitle>
          <ConfirmDialogDescription>Não tem volta.</ConfirmDialogDescription>
        </RowActionsConfirm>
      }
    >
      <DropdownMenuItem>Editar</DropdownMenuItem>
      <RowActionsDelete handle={handle} />
    </RowActions>
  )
}

async function openMenu() {
  await userEvent.click(
    screen.getByRole('button', { name: m.common_open_actions() }),
  )
}

describe('RowActions', () => {
  it('o gatilho de três pontos tem nome acessível e abre o menu com os itens', async () => {
    render(<Row onConfirm={vi.fn()} />)

    await openMenu()

    expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeTruthy()
    expect(
      screen.getByRole('menuitem', { name: m.common_delete() }),
    ).toBeTruthy()
  })

  it('o item de apagar abre o alerta, que vive fora do menu', async () => {
    render(<Row onConfirm={vi.fn()} />)

    await openMenu()
    await userEvent.click(
      await screen.findByRole('menuitem', { name: m.common_delete() }),
    )

    expect(
      await screen.findByRole('alertdialog', { name: 'Apagar a linha?' }),
    ).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })

  it('confirmar no alerta roda a ação uma vez', async () => {
    const onConfirm = vi.fn()
    render(<Row onConfirm={onConfirm} />)

    await openMenu()
    await userEvent.click(
      await screen.findByRole('menuitem', { name: m.common_delete() }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Apagar de vez' }),
    )

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
