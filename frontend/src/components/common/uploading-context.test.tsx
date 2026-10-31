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
  it('is free while no field is uploading', () => {
    render(
      <UploadingProvider>
        <Field active={false} />
        <Status />
      </UploadingProvider>,
    )

    expect(screen.getByText('livre')).toBeTruthy()
  })

  it('when a field is uploading, locks, and finishing releases', () => {
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

  it('with two fields, releases only when the last one finishes', () => {
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

  it('when the in-flight field unmounts, releases the lock', () => {
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
