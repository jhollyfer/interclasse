// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { m } from '#/paraglide/messages'

import { BrandMark } from './index'

afterEach(cleanup)

describe('BrandMark', () => {
  it('mostra o nome da marca no idioma atual', () => {
    render(<BrandMark />)

    expect(screen.getByText(m.common_brand_name())).toBeTruthy()
  })

  it('a logo é decorativa: o nome ao lado já a descreve', () => {
    const { container } = render(<BrandMark />)

    expect(container.querySelector('img')?.getAttribute('alt')).toBe('')
  })

  it('aceita classe e atributos do span', () => {
    const { container } = render(<BrandMark className="extra" id="marca" />)
    const root = container.querySelector('[data-slot="brand-mark"]')

    expect(root?.id).toBe('marca')
    expect(root?.className).toContain('extra')
  })
})
