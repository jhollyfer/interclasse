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
  it('is a submit and is enabled by default', () => {
    render(<SubmitButton>Salvar</SubmitButton>)
    const button = screen.getByRole('button', { name: 'Salvar' })

    expect(button.getAttribute('type')).toBe('submit')
    expect(button.hasAttribute('disabled')).toBe(false)
  })

  it('when the mutation is in flight, locks and shows the spinner', () => {
    render(<SubmitButton isPending>Salvar</SubmitButton>)
    const button = screen.getByRole('button', { name: /Salvar/ })

    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.querySelector('svg, [role="status"]')).toBeTruthy()
  })

  it('locks with explicit disabled too', () => {
    render(<SubmitButton disabled>Salvar</SubmitButton>)

    expect(
      screen.getByRole('button', { name: 'Salvar' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('locks while any form field is still uploading a file', () => {
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
