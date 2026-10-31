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

import { useResourceForm } from './use-resource-form'

/**
 * What this test checks is the **wiring**, which is everything the hook does.
 *
 * The create and edit forms of the seven dashboard resources would write these
 * connections by hand, and each has a silent way to break: a forgotten
 * `invalidateQueries` leaves the listing with stale data, a forgotten `navigate`
 * leaves the person stuck on an already saved form, a `retry` offered on a
 * create that inserts directly duplicates the record, and a `payload` without
 * the id sends a `PUT` the API refuses. None of them shows up in `typecheck`.
 *
 * It is the only test in the repository that needs a DOM, because of `renderHook`.
 */

const navigate = vi.fn()
const invalidateQueries = vi.fn()

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('#/lib/form-errors', () => ({ applyMutationError: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate }),
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
type Record_ = { id: string; name: string }
type Payload = { name: string; id?: string }

const FIELDS = ['name'] as const

const NameValidator = z.object({ name: z.string() })

/** The callbacks' fourth argument; the hook does not read it. */
const CONTEXT = fromPartial<MutationFunctionContext>({})

/** The resource's mutation, reduced to what the hook uses of it. */
function mutationStub() {
  const mutate = vi.fn()
  type Options = Omit<
    UseMutationOptions<Record_, HTTPError, Payload>,
    'mutationFn'
  >

  let captured: Options | undefined

  function useStub(options?: Options) {
    captured = options

    return fromPartial<UseMutationResult<Record_, HTTPError, Payload>>({
      mutate,
      isPending: false,
    })
  }

  return {
    mutate,
    useStub,
    options: () => captured,
  }
}

function setup(overrides: Record<string, unknown> = {}) {
  const stub = mutationStub()

  const { result } = renderHook(() =>
    useResourceForm<Values, Record_, Payload>({
      formId: 'testimonial-create',
      validator: NameValidator,
      defaults: { name: '' },
      fields: FIELDS,
      mutation: stub.useStub,
      invalidate: ['testimonials'],
      backTo: '/administrator/sports',
      success: (created) => `Depoimento de ${created.name} criado.`,
      payload: (values) => values,
      ...overrides,
    }),
  )

  return { stub, result }
}

function serverError() {
  return new HTTPError({
    message: 'Erro interno',
    status: 500,
    code: 'INTERNAL_ERROR',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useResourceForm', () => {
  it('espalha as quatro props do FormShell, com o destino escrito uma vez só', () => {
    const { result } = setup({ backParams: { id: '7' } })

    expect(result.current.shell).toEqual({
      formId: 'testimonial-create',
      backTo: '/administrator/sports',
      backParams: { id: '7' },
      isPending: false,
    })
  })

  it('limpa o erro de rodapé da tentativa anterior antes de reenviar', () => {
    const { result, stub } = setup()

    result.current.form.setError('root', { message: 'já existe' })
    result.current.onValid({ name: 'Ana' })

    expect(result.current.form.formState.errors.root).toBeUndefined()
    expect(stub.mutate).toHaveBeenCalledWith({ name: 'Ana' })
  })

  it('manda o payload transformado quando a edição acrescenta o id', () => {
    const { result, stub } = setup({
      payload: (values: Values) => ({ ...values, id: '7' }),
    })

    result.current.onValid({ name: 'Ana' })

    expect(stub.mutate).toHaveBeenCalledWith({ name: 'Ana', id: '7' })
  })

  it('invalida, avisa e volta, nessa ordem, no sucesso', async () => {
    const { result, stub } = setup()

    await stub
      .options()
      ?.onSuccess?.(
        { id: '7', name: 'Ana' },
        { name: 'Ana' },
        undefined,
        CONTEXT,
      )

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testimonials'],
    })
    expect(toast.success).toHaveBeenCalledWith('Depoimento de Ana criado.')
    expect(navigate).toHaveBeenCalledWith({
      to: '/administrator/sports',
      params: undefined,
    })
    expect(result.current.mutation.isPending).toBe(false)
  })

  it('aceita o texto de sucesso fixo, para quem não cita o registro', async () => {
    const { stub } = setup({ success: 'Depoimento salvo.' })

    await stub
      .options()
      ?.onSuccess?.(
        { id: '7', name: 'Ana' },
        { name: 'Ana' },
        undefined,
        CONTEXT,
      )

    expect(toast.success).toHaveBeenCalledWith('Depoimento salvo.')
  })

  it('onSuccess próprio substitui a volta para backTo', async () => {
    const onSuccess = vi.fn()
    const { stub } = setup({ onSuccess })

    await stub
      .options()
      ?.onSuccess?.(
        { id: '7', name: 'Ana' },
        { name: 'Ana' },
        undefined,
        CONTEXT,
      )

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['testimonials'],
    })
    expect(onSuccess).toHaveBeenCalledWith(
      { id: '7', name: 'Ana' },
      { name: 'Ana' },
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('oferece "Tentar de novo" reenviando o mesmo payload, quando há id de aviso', () => {
    const { stub } = setup({ retry: 'testimonial-update-error' })
    const sent = { name: 'Ana' }

    stub.options()?.onError?.(serverError(), sent, undefined, CONTEXT)

    const call = vi.mocked(applyMutationError).mock.calls[0]?.[0]
    expect(call?.retry?.id).toBe('testimonial-update-error')

    call?.retry?.onClick()
    expect(stub.mutate).toHaveBeenCalledWith(sent)
  })

  it('não oferece reenvio quando o cadastro insere direto', () => {
    const { stub } = setup()

    stub
      .options()
      ?.onError?.(serverError(), { name: 'Ana' }, undefined, CONTEXT)

    expect(
      vi.mocked(applyMutationError).mock.calls[0]?.[0].retry,
    ).toBeUndefined()
  })
})
