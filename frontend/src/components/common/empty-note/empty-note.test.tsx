// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { EmptyNote } from './index'

afterEach(cleanup)

describe('EmptyNote', () => {
  it('shows the sentence the screen passed', () => {
    render(<EmptyNote>Nenhum aviso ainda.</EmptyNote>)

    expect(screen.getByText('Nenhum aviso ainda.')).toBeTruthy()
  })

  it('keeps the dashed frame and merges the className of the screen', () => {
    const { container } = render(<EmptyNote className="mt-4">Vazio</EmptyNote>)
    const note = container.querySelector('[data-slot="empty-note"]')

    expect(note?.className).toContain('border-dashed')
    expect(note?.className).toContain('mt-4')
  })
})
