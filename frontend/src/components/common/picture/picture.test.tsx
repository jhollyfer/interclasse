// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Picture } from './index'

afterEach(cleanup)

describe('Picture', () => {
  it('loads an LCP image eagerly and with high priority', () => {
    render(
      <Picture
        src="/a.png"
        alt="Logo"
        width={10}
        height={10}
        placement="lcp"
      />,
    )

    const image = screen.getByRole('img', { name: 'Logo' })

    expect(image.getAttribute('loading')).toBe('eager')
    expect(image.getAttribute('fetchpriority')).toBe('high')
  })

  it('loads an image below the fold on demand', () => {
    render(
      <Picture
        src="/a.png"
        alt="Foto"
        width={10}
        height={10}
        placement="fold"
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Foto' }).getAttribute('loading'),
    ).toBe('lazy')
  })

  it('carries the dimension and async decoding', () => {
    render(
      <Picture
        src="/a.png"
        alt="Foto"
        width={800}
        height={600}
        placement="fold"
      />,
    )

    const image = screen.getByRole('img', { name: 'Foto' })

    expect(image.getAttribute('width')).toBe('800')
    expect(image.getAttribute('height')).toBe('600')
    expect(image.getAttribute('decoding')).toBe('async')
  })
})
