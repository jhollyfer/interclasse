// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type * as React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  UploadingProvider,
  useIsUploading,
  useRegisterUpload,
} from './uploading-context'

afterEach(cleanup)

function Field({ active }: Readonly<{ active: boolean }>): React.JSX.Element {
  useRegisterUpload(active)

  return <span>campo</span>
}

function Status(): React.JSX.Element {
  if (useIsUploading()) return <p>enviando</p>

  return <p>livre</p>
}

describe('UploadingProvider', () => {
  it('livre enquanto nenhum campo está enviando', () => {
    render(
      <UploadingProvider>
        <Field active={false} />
        <Status />
      </UploadingProvider>,
    )

    expect(screen.getByText('livre')).toBeTruthy()
  })

  it('um campo enviando trava, e terminar libera', () => {
    const { rerender } = render(
      <UploadingProvider>
        <Field active />
        <Status />
      </UploadingProvider>,
    )

    expect(screen.getByText('enviando')).toBeTruthy()

    rerender(
      <UploadingProvider>
        <Field active={false} />
        <Status />
      </UploadingProvider>,
    )

    expect(screen.getByText('livre')).toBeTruthy()
  })

  it('com dois campos, só libera quando o último termina', () => {
    const { rerender } = render(
      <UploadingProvider>
        <Field active />
        <Field active />
        <Status />
      </UploadingProvider>,
    )

    rerender(
      <UploadingProvider>
        <Field active />
        <Field active={false} />
        <Status />
      </UploadingProvider>,
    )

    expect(screen.getByText('enviando')).toBeTruthy()
  })

  it('desmontar o campo em voo libera o cadeado', () => {
    const { rerender } = render(
      <UploadingProvider>
        <Field active />
        <Status />
      </UploadingProvider>,
    )

    rerender(
      <UploadingProvider>
        <Status />
      </UploadingProvider>,
    )

    expect(screen.getByText('livre')).toBeTruthy()
  })

  it('fora do provider o campo funciona e nada trava', () => {
    render(
      <>
        <Field active />
        <Status />
      </>,
    )

    expect(screen.getByText('livre')).toBeTruthy()
  })
})
