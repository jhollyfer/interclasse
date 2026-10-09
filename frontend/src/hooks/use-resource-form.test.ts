// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { toast } from 'sonner'

import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query'

import { useResourceForm } from './use-resource-form'
import { applyMutationError } from '#/lib/form-errors'
import { HTTPError } from '#/integrations/tanstack-query/http'

/**
 * O que este teste cobra é a **fiação**, que é tudo o que o hook faz.
 *
 * Os formulários de criar e editar dos sete recursos do painel escreveriam essas
 * ligações à mão, e cada uma tem um jeito silencioso de quebrar: o
 * `invalidateQueries` esquecido deixa a listagem com o dado velho, o `navigate`
 * esquecido deixa a pessoa parada num formulário já salvo, o `retry` oferecido
 * num cadastro que insere direto duplica o registro, e o `payload` sem o id
 * manda um `PUT` que a API recusa. Nenhuma delas aparece no `typecheck`.
 *
 * É o único teste do repositório que precisa de DOM, por causa do `renderHook`.
 * O `module is not defined` que o React imprime na saída é interop de CJS do
 * React 19 sob jsdom nesta versão do vitest - aparece com ou sem o pragma de
 * ambiente, e não reprova nada.
 */

const navigate = vi.fn()
const invalidateQueries = vi.fn()

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('#/lib/form-errors', () => ({ applyMutationError: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
}))
vi.mock('@hookform/resolvers/vine', () => ({
  // O resolver não é o assunto: aceita o que vier e devolve sem erro.
  vineResolver: () => (values: unknown) => ({ values, errors: {} }),
}))

type Values = { name: string }
type Record_ = { id: string; name: string }
type Payload = { name: string; id?: string }

const FIELDS = ['name'] as const

/** A mutation do recurso, reduzida ao que o hook usa dela. */
function mutationStub() {
  const mutate = vi.fn()
  type Options = Omit<
    UseMutationOptions<Record_, HTTPError, Payload>,
    'mutationFn'
  >

  let captured: Options | undefined

  function useStub(options?: Options) {
    captured = options

    return { mutate, isPending: false } as unknown as UseMutationResult<
      Record_,
      HTTPError,
      Payload
    >
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
      validator: {} as never,
      defaults: { name: '' },
      fields: FIELDS,
      mutation: stub.useStub,
      invalidate: ['testimonials'],
      backTo: '/administrator/sports',
      success: (created) => `Depoimento de ${created.name} criado.`,
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
      ?.onSuccess?.({ id: '7', name: 'Ana' }, { name: 'Ana' }, undefined, {
        client: {},
      } as never)

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
      ?.onSuccess?.({ id: '7', name: 'Ana' }, { name: 'Ana' }, undefined, {
        client: {},
      } as never)

    expect(toast.success).toHaveBeenCalledWith('Depoimento salvo.')
  })

  it('oferece "Tentar de novo" reenviando o mesmo payload, quando há id de aviso', () => {
    const { stub } = setup({ retry: 'testimonial-update-error' })
    const sent = { name: 'Ana' }

    stub.options()?.onError?.(serverError(), sent, undefined, {
      client: {},
    } as never)

    const call = vi.mocked(applyMutationError).mock.calls[0][0]
    expect(call.retry?.id).toBe('testimonial-update-error')

    call.retry?.onClick()
    expect(stub.mutate).toHaveBeenCalledWith(sent)
  })

  it('não oferece reenvio quando o cadastro insere direto', () => {
    const { stub } = setup()

    stub.options()?.onError?.(serverError(), { name: 'Ana' }, undefined, {
      client: {},
    } as never)

    expect(vi.mocked(applyMutationError).mock.calls[0][0].retry).toBeUndefined()
  })
})
