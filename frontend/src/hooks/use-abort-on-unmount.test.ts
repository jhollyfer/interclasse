// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAbortOnUnmount } from './use-abort-on-unmount'

describe('useAbortOnUnmount', () => {
  it('entrega um sinal novo por chamada', () => {
    const { result } = renderHook(() => useAbortOnUnmount())

    expect(result.current()).not.toBe(result.current())
  })

  it('aborta todos os sinais ao desmontar', () => {
    const { result, unmount } = renderHook(() => useAbortOnUnmount())
    const first = result.current()
    const second = result.current()

    expect(first.aborted).toBe(false)

    unmount()

    expect(first.aborted).toBe(true)
    expect(second.aborted).toBe(true)
  })
})
