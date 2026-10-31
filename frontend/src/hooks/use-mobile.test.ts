// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { TABLET_BREAKPOINT, useIsBelow, useIsMobile } from './use-mobile'

const original = window.innerWidth

function resizeTo(width: number): void {
  window.innerWidth = width
  window.dispatchEvent(new Event('resize'))
}

afterEach(() => {
  window.innerWidth = original
})

describe('useIsBelow', () => {
  it('answers by the window width', () => {
    window.innerWidth = 500
    const { result } = renderHook(() => useIsBelow(768))

    expect(result.current).toBe(true)
  })

  it('acompanha o redimensionamento', () => {
    window.innerWidth = 1200
    const { result } = renderHook(() => useIsBelow(TABLET_BREAKPOINT))

    expect(result.current).toBe(false)

    act(() => resizeTo(800))

    expect(result.current).toBe(true)
  })

  it('when at the exact breakpoint width, is no longer "below"', () => {
    window.innerWidth = 768
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })
})
