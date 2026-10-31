// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { m } from '#/paraglide/messages'

import {
  MultiFileUpload,
  MultiFileUploadList,
  MultiFileUploadTrigger,
} from './index'

const upload = vi.fn()

vi.mock('#/hooks/use-multipart-upload', () => ({
  useMultipartUpload: () => ({ upload }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderField(onValueChange: (ids: ReadonlyArray<string>) => void) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })

  const view = render(
    <QueryClientProvider client={queryClient}>
      <MultiFileUpload onValueChange={onValueChange}>
        <MultiFileUploadTrigger />
        <MultiFileUploadList />
      </MultiFileUpload>
    </QueryClientProvider>,
  )

  const input =
    view.container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('o seletor nativo não foi renderizado')

  return input
}

const PHOTO = new File(['x'], 'foto.png', { type: 'image/png' })

describe('MultiFileUpload', () => {
  it('uploads the chosen file and hands the attachment id to the parent', async () => {
    upload.mockResolvedValue({ id: 'storage-1' })
    const onValueChange = vi.fn()
    const input = renderField(onValueChange)

    await userEvent.upload(input, PHOTO)

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(['storage-1']),
    )
    expect(upload).toHaveBeenCalledTimes(1)
    expect(screen.getByText('foto.png')).toBeTruthy()
  })

  it('renders the add button with the house text', () => {
    renderField(() => undefined)

    expect(
      screen.getByRole('button', { name: m.multi_file_upload_add() }),
    ).toBeTruthy()
  })

  it('when removed from the queue, notifies the parent with the list without the file', async () => {
    upload.mockResolvedValue({ id: 'storage-1' })
    const onValueChange = vi.fn()
    const input = renderField(onValueChange)

    await userEvent.upload(input, PHOTO)
    await userEvent.click(
      await screen.findByRole('button', {
        name: m.multi_file_upload_remove({ name: 'foto.png' }),
      }),
    )

    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith([]))
  })

  it('when a part is outside MultiFileUpload, says which one is without a provider', () => {
    expect(() => render(<MultiFileUploadList />)).toThrow('MultiFileUploadList')
  })
})
