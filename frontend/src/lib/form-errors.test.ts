import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

import { HTTPError, HTTPErrorCode } from '#/integrations/tanstack-query/http'

import { applyHTTPErrorToForm, applyMutationError } from './form-errors'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

type FormValues = { name: string; position: string }

const FIELDS = ['name', 'position'] as const

/** Só `setError` é usado; o resto do formulário não entra nesta conta. */
function formStub() {
  const setError = vi.fn()

  return {
    setError,
    form: { setError } as unknown as UseFormReturn<FormValues & FieldValues>,
  }
}

function httpError(errors?: Record<string, string>, status = 422) {
  return new HTTPError({
    message: 'Dados inválidos',
    status,
    code: HTTPErrorCode.VALIDATION_ERROR,
    errors,
  })
}

describe('applyHTTPErrorToForm', () => {
  it('marca o campo que o backend acusou', () => {
    const { form, setError } = formStub()

    const handled = applyHTTPErrorToForm({
      form,
      error: httpError({ name: 'O campo name deve ter no máximo 255 itens' }),
      fields: FIELDS,
    })

    expect(handled).toBe(true)
    expect(setError).toHaveBeenCalledWith('name', {
      message: 'O campo name deve ter no máximo 255 itens',
    })
  })

  it('leva `root` para o formulário, e não para um campo', () => {
    const { form, setError } = formStub()

    applyHTTPErrorToForm({
      form,
      error: httpError({ root: 'Credenciais inválidas' }),
      fields: FIELDS,
    })

    expect(setError).toHaveBeenCalledWith('root', {
      message: 'Credenciais inválidas',
    })
  })

  it('não engole chave desconhecida: ela vira mensagem do formulário', () => {
    const { form, setError } = formStub()

    const handled = applyHTTPErrorToForm({
      form,
      error: httpError({ campoQueNinguemConhece: 'Valor inesperado' }),
      fields: FIELDS,
    })

    expect(handled).toBe(true)
    expect(setError).toHaveBeenCalledWith('root', {
      message: 'Valor inesperado',
    })
  })

  it('marca o campo conhecido e manda o desconhecido para o rodapé', () => {
    const { form, setError } = formStub()

    const handled = applyHTTPErrorToForm({
      form,
      error: httpError({
        name: 'O campo name é obrigatório',
        campoNovo: 'Valor inesperado',
      }),
      fields: FIELDS,
    })

    expect(handled).toBe(true)
    expect(setError).toHaveBeenCalledWith('name', {
      message: 'O campo name é obrigatório',
    })
    expect(setError).toHaveBeenCalledWith('root', {
      message: 'Valor inesperado',
    })
  })

  it('devolve false quando não há nada atribuível - aí a tela decide', () => {
    const { form, setError } = formStub()

    const handled = applyHTTPErrorToForm({
      form,
      error: httpError(undefined, 500),
      fields: FIELDS,
    })

    expect(handled).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })
})

describe('applyMutationError', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
  })

  it('erro de campo para aqui: nem aviso, nem mensagem de rodapé', () => {
    const { form, setError } = formStub()

    applyMutationError({
      form,
      error: httpError({ name: 'O campo name é obrigatório' }),
      fields: FIELDS,
      retry: { id: 'x', onClick: vi.fn() },
    })

    expect(setError).toHaveBeenCalledWith('name', {
      message: 'O campo name é obrigatório',
    })
    expect(setError).not.toHaveBeenCalledWith('root', expect.anything())
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('edição sempre pode reenviar: 5xx com `retry` vira aviso com a ação', () => {
    const { form, setError } = formStub()
    const onClick = vi.fn()

    applyMutationError({
      form,
      error: httpError(undefined, 500),
      fields: FIELDS,
      retry: { id: 'testimonial-update-error', onClick },
    })

    expect(setError).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Dados inválidos', {
      id: 'testimonial-update-error',
      action: { label: 'Tentar de novo', onClick },
    })
  })

  it('criação que insere direto não passa `retry`: o 5xx cai no rodapé', () => {
    const { form, setError } = formStub()

    // `POST /administrator/testimonials` insere sem checar duplicata, então um
    // 500 pode ter vindo depois da escrita e o reenvio criaria o segundo
    // depoimento. Quem chama simplesmente não passa `retry`.
    applyMutationError({
      form,
      error: httpError(undefined, 500),
      fields: FIELDS,
    })

    expect(toast.error).not.toHaveBeenCalled()
    expect(setError).toHaveBeenCalledWith('root', {
      message: 'Dados inválidos',
    })
  })

  it('`retry` não vale para erro que não é do servidor', () => {
    const { form, setError } = formStub()

    applyMutationError({
      form,
      error: httpError(undefined, 403),
      fields: FIELDS,
      retry: { id: 'x', onClick: vi.fn() },
    })

    expect(toast.error).not.toHaveBeenCalled()
    expect(setError).toHaveBeenCalledWith('root', {
      message: 'Dados inválidos',
    })
  })

  it('falha de rede também é do servidor: oferece o reenvio', () => {
    const { form } = formStub()
    const onClick = vi.fn()

    const error = new HTTPError({
      message: 'Não foi possível conectar ao servidor. Tente novamente.',
      status: 0,
      code: HTTPErrorCode.NETWORK_ERROR,
    })

    applyMutationError({
      form,
      error,
      fields: FIELDS,
      retry: { id: 'testimonial-update-error', onClick },
    })

    expect(toast.error).toHaveBeenCalledWith(
      'Não foi possível conectar ao servidor. Tente novamente.',
      expect.objectContaining({ id: 'testimonial-update-error' }),
    )
  })
})
