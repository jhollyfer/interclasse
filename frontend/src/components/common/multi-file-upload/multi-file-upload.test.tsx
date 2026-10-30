// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
  it('sobe o arquivo escolhido e entrega o id do anexo ao pai', async () => {
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

  it('o botão de adicionar existe com o texto da casa', () => {
    renderField(() => undefined)

    expect(
      screen.getByRole('button', { name: m.multi_file_upload_add() }),
    ).toBeTruthy()
  })

  it('tirar da fila avisa o pai com a lista sem o arquivo', async () => {
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

  it('uma parte fora do MultiFileUpload diz qual ficou sem provider', () => {
    expect(() => render(<MultiFileUploadList />)).toThrow('MultiFileUploadList')
  })
})
