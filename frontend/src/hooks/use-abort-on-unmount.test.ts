// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAbortOnUnmount } from './use-abort-on-unmount'

describe('useAbortOnUnmount', () => {
  it('hands out a new signal per call', () => {
    const { result } = renderHook(() => useAbortOnUnmount())

    expect(result.current()).not.toBe(result.current())
  })

  it('aborts all signals on unmount', () => {
    const { result, unmount } = renderHook(() => useAbortOnUnmount())
    const first = result.current()
    const second = result.current()

    expect(first.aborted).toBe(false)

    unmount()

    expect(first.aborted).toBe(true)
    expect(second.aborted).toBe(true)
  })
})
