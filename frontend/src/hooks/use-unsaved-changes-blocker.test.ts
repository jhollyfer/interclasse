// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { m } from '#/paraglide/messages'

import { useUnsavedChangesBlocker } from './use-unsaved-changes-blocker'

type BlockerOptions = {
  shouldBlockFn: () => boolean
  enableBeforeUnload: boolean
}

const useBlocker = vi.fn<(options: BlockerOptions) => void>()

vi.mock('@tanstack/react-router', () => ({
  useBlocker: (options: BlockerOptions) => useBlocker(options),
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

function lastOptions(): BlockerOptions {
  const options = useBlocker.mock.lastCall?.[0]
  if (!options) throw new Error('useBlocker não foi chamado')

  return options
}

describe('useUnsavedChangesBlocker', () => {
  it('when the form is clean, neither blocks nor asks', () => {
    const confirm = vi.spyOn(window, 'confirm')
    renderHook(() => useUnsavedChangesBlocker(false))

    expect(lastOptions().shouldBlockFn()).toBe(false)
    expect(lastOptions().enableBeforeUnload).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('when the form is dirty, asks and blocks if the person stays', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderHook(() => useUnsavedChangesBlocker(true))

    expect(lastOptions().shouldBlockFn()).toBe(true)
    expect(confirm).toHaveBeenCalledWith(m.form_unsaved_changes_confirm())
    expect(lastOptions().enableBeforeUnload).toBe(true)
  })

  it('when the form is dirty, lets the person leave once they confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderHook(() => useUnsavedChangesBlocker(true))

    expect(lastOptions().shouldBlockFn()).toBe(false)
  })
})
