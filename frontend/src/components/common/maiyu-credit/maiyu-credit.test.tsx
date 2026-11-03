// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { MaiyuCredit } from './index'

afterEach(cleanup)

describe('MaiyuCredit', () => {
  it('opens the Maiyu link in another tab without leaking the opener', () => {
    render(<MaiyuCredit />)
    const link = screen.getByRole('link', { name: 'Maiyu' })

    expect(link.getAttribute('href')).toBe('https://maiyu.com.br')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('shows only the credit phrase, with no tagline', () => {
    const { container } = render(<MaiyuCredit />)

    expect(container.textContent).toBe('Desenvolvido por Maiyu')
  })

  it('accepts an extra class on the paragraph', () => {
    const { container } = render(<MaiyuCredit className="extra" />)

    expect(
      container.querySelector('[data-slot="maiyu-credit"]')?.className,
    ).toContain('extra')
  })
})
