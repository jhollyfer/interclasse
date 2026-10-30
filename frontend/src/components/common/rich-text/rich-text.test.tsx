// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown'
import { MarkdownManager } from '@tiptap/markdown'

import { RICH_TEXT_EXTENSIONS, RichText } from './index'

afterEach(cleanup)

const DOCUMENT = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Regulamento' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Veja o ' },
        {
          type: 'text',
          text: 'site',
          marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
        },
      ],
    },
  ],
}

describe('RichText', () => {
  it('lê o JSON do editor como elementos, sem innerHTML', () => {
    render(<RichText json={DOCUMENT} />)

    expect(screen.getByRole('heading', { name: 'Regulamento' })).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'site' }).getAttribute('href'),
    ).toBe('https://example.com')
  })

  it('converte Markdown de fora pelo mesmo renderizador', () => {
    render(<RichText markdown={'## Título\n\n- um\n- dois'} />)

    expect(screen.getByRole('heading', { name: 'Título' })).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('não troca -- por travessão (Typography com emDash desligado)', () => {
    const manager = new MarkdownManager({ extensions: RICH_TEXT_EXTENSIONS })
    const markdown = renderToMarkdown({
      extensions: RICH_TEXT_EXTENSIONS,
      content: manager.parse('a -- b'),
    })

    expect(markdown).toContain('--')
    expect(markdown).not.toContain('—')
  })

  it('Markdown vira JSON e volta a Markdown sem perder a estrutura', () => {
    const manager = new MarkdownManager({ extensions: RICH_TEXT_EXTENSIONS })
    const source = '## Título\n\n- um\n- dois'
    const back = renderToMarkdown({
      extensions: RICH_TEXT_EXTENSIONS,
      content: manager.parse(source),
    })

    expect(back.trim()).toBe(source)
  })
})
