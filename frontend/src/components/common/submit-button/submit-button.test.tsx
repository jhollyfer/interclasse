// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { UploadingProvider, useRegisterUpload } from '../uploading-context'
import { SubmitButton } from './index'

afterEach(cleanup)

function Uploading(): null {
  useRegisterUpload(true)

  return null
}

describe('SubmitButton', () => {
  it('é submit e fica habilitado por padrão', () => {
    render(<SubmitButton>Salvar</SubmitButton>)
    const button = screen.getByRole('button', { name: 'Salvar' })

    expect(button.getAttribute('type')).toBe('submit')
    expect(button.hasAttribute('disabled')).toBe(false)
  })

  it('com a mutation em voo trava e mostra o spinner', () => {
    render(<SubmitButton isPending>Salvar</SubmitButton>)
    const button = screen.getByRole('button', { name: /Salvar/ })

    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.querySelector('svg, [role="status"]')).toBeTruthy()
  })

  it('disabled explícito também trava', () => {
    render(<SubmitButton disabled>Salvar</SubmitButton>)

    expect(
      screen.getByRole('button', { name: 'Salvar' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('trava enquanto algum campo do formulário ainda está enviando arquivo', () => {
    render(
      <UploadingProvider>
        <Uploading />
        <SubmitButton>Salvar</SubmitButton>
      </UploadingProvider>,
    )

    expect(
      screen.getByRole('button', { name: 'Salvar' }).hasAttribute('disabled'),
    ).toBe(true)
  })
})
