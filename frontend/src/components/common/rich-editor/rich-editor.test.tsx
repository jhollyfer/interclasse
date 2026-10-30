// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { m } from '#/paraglide/messages'

import { RichEditor, RichEditorContent, RichEditorToolbar } from './index'

afterEach(cleanup)

const DOCUMENT = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Olá, mundo' }] },
  ],
}

describe('RichEditor', () => {
  it('mostra o conteúdo gravado e a barra de formatação', async () => {
    render(
      <RichEditor value={DOCUMENT} onValueChange={() => undefined}>
        <RichEditorToolbar />
        <RichEditorContent />
      </RichEditor>,
    )

    expect(await screen.findByText('Olá, mundo')).toBeTruthy()
    expect(
      screen.getByRole('toolbar', { name: m.rich_editor_toolbar() }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: m.rich_editor_bold() }),
    ).toBeTruthy()
  })

  it('um botão da barra edita o documento e avisa com o JSON', async () => {
    const onValueChange = vi.fn()

    render(
      <RichEditor value={null} onValueChange={onValueChange}>
        <RichEditorToolbar />
        <RichEditorContent />
      </RichEditor>,
    )

    await userEvent.click(
      await screen.findByRole('button', { name: m.rich_editor_bullet_list() }),
    )

    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
    expect(JSON.stringify(onValueChange.mock.lastCall)).toContain('bulletList')
  })

  it('desabilitado, a barra trava os botões', async () => {
    render(
      <RichEditor value={null} onValueChange={() => undefined} disabled>
        <RichEditorToolbar />
        <RichEditorContent />
      </RichEditor>,
    )

    const bold = await screen.findByRole('button', {
      name: m.rich_editor_bold(),
    })

    await waitFor(() => expect(bold.hasAttribute('disabled')).toBe(true))
  })

  it('uma parte fora do RichEditor diz qual ficou sem provider', () => {
    expect(() => render(<RichEditorToolbar />)).toThrow('RichEditorToolbar')
  })
})
