// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
  it('shows the saved content and the formatting bar', async () => {
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

  it('when a bar button is used, edits the document and notifies with the JSON', async () => {
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

  it('when disabled, the bar locks the buttons', async () => {
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

  it('when a part is outside RichEditor, says which one is without a provider', () => {
    expect(() => render(<RichEditorToolbar />)).toThrow('RichEditorToolbar')
  })
})
