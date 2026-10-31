// @vitest-environment jsdom

import { z } from '@interclasse/shared'
import type {
  MutationFunctionContext,
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { fromPartial } from '@total-typescript/shoehorn'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTPError } from '#/integrations/tanstack-query/http'
import { applyMutationError } from '#/lib/form-errors'

import { useMutationForm } from './use-mutation-form'

/**
 * The wiring of the form that is not a screen (score dialog, draw, login):
 * invalidate, notify and only then call the screen's `onSuccess`. `typecheck` does
 * not see the swapped order or the forgotten notice (`frontend.md` §11.1). The
 * create/edit screen, which still navigates, has its test in `use-resource-form.test.ts`.
 */

const invalidateQueries = vi.fn()

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('#/lib/form-errors', () => ({ applyMutationError: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
  // Navigation blocking is not the subject: it needs a mounted router.
  useBlocker: vi.fn(),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
}))
vi.mock('@hookform/resolvers/zod', () => ({
  // The resolver is not the subject: it accepts whatever comes and returns no error.
  zodResolver: () => (values: unknown) => ({ values, errors: {} }),
}))

type Values = { name: string }
type SavedRecord = { id: string; name: string }

const NameValidator = z.object({ name: z.string() })

/** The callbacks' fourth argument; the hook does not read it. */
const CONTEXT = fromPartial<MutationFunctionContext>({})

const SAVED: SavedRecord = { id: '7', name: 'Ana' }

function setup(overrides: Record<string, unknown> = {}) {
  const mutate = vi.fn()
  type Options = Omit<
    UseMutationOptions<SavedRecord, HTTPError, Values>,
    'mutationFn'
  >
  let captured: Options | undefined

  function useStub(options?: Options) {
    captured = options

    return fromPartial<UseMutationResult<SavedRecord, HTTPError, Values>>({
      mutate,
      isPending: false,
    })
  }

  const { result } = renderHook(() =>
    useMutationForm<Values, SavedRecord, Values>({
      validator: NameValidator,
      defaults: { name: '' },
      fields: ['name'],
      mutation: useStub,
      invalidate: [['scores']],
      success: 'Placar salvo.',
      payload: (values) => values,
      ...overrides,
    }),
  )

  return { mutate, result, options: () => captured }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useMutationForm', () => {
  it('invalidates before calling the screen onSuccess', async () => {
    const order: string[] = []
    invalidateQueries.mockImplementation(() => {
      order.push('invalidate')
      return Promise.resolve()
    })
    const { options } = setup({
      onSuccess: () => {
        order.push('onSuccess')
      },
    })

    await options()?.onSuccess?.(SAVED, { name: 'Ana' }, undefined, CONTEXT)

    expect(order).toEqual(['invalidate', 'onSuccess'])
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['scores'] })
  })

  it('notifies with the fixed text, or with the one citing the saved record', async () => {
    const fixed = setup()
    await fixed
      .options()
      ?.onSuccess?.(SAVED, { name: 'Ana' }, undefined, CONTEXT)

    const quoted = setup({
      success: (record: SavedRecord) => `${record.name} salva.`,
    })
    await quoted
      .options()
      ?.onSuccess?.(SAVED, { name: 'Ana' }, undefined, CONTEXT)

    expect(toast.success).toHaveBeenNthCalledWith(1, 'Placar salvo.')
    expect(toast.success).toHaveBeenNthCalledWith(2, 'Ana salva.')
  })

  it('does not notify when the form declares no success text', async () => {
    const { options } = setup({ success: undefined })

    await options()?.onSuccess?.(SAVED, { name: 'Ana' }, undefined, CONTEXT)

    expect(toast.success).not.toHaveBeenCalled()
  })

  it('clears the footer error and sends the transformed payload', () => {
    const { result, mutate } = setup({
      payload: (values: Values) => ({ name: values.name.toUpperCase() }),
    })

    result.current.form.setError('root', { message: 'já existe' })
    result.current.onValid({ name: 'Ana' })

    expect(result.current.form.formState.errors.root).toBeUndefined()
    expect(mutate).toHaveBeenCalledWith({ name: 'ANA' })
  })

  it('carries the API error to the fields the form declares', () => {
    const { options } = setup()
    const error = new HTTPError({
      message: 'Erro interno',
      status: 500,
      code: 'INTERNAL_ERROR',
    })

    options()?.onError?.(error, { name: 'Ana' }, undefined, CONTEXT)

    const call = vi.mocked(applyMutationError).mock.calls[0]?.[0]
    expect(call?.fields).toEqual(['name'])
    expect(call?.error).toBe(error)
  })
})
