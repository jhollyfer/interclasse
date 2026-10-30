// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { m } from '#/paraglide/messages'

import {
  ImageField,
  ImageFieldActions,
  ImageFieldContent,
  ImageFieldDescription,
  ImageFieldPreview,
  ImageFieldRemove,
  ImageFieldUpload,
} from './index'

const { upload, send } = vi.hoisted(() => ({
  upload: vi.fn(),
  send: vi.fn(async () => undefined),
}))

vi.mock('#/hooks/use-multipart-upload', () => ({
  useMultipartUpload: () => ({ upload }),
}))

vi.mock('#/integrations/tanstack-query/http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  send,
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function Harness({
  onValueChange,
  previewUrl,
}: Readonly<{
  onValueChange: (id: string | null) => void
  previewUrl?: string | null
}>) {
  const [value, setValue] = React.useState<string | null>(
    previewUrl ? 'saved' : null,
  )
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <ImageField
        value={value}
        previewUrl={previewUrl}
        onValueChange={(id) => {
          setValue(id)
          onValueChange(id)
        }}
      >
        <ImageFieldPreview alt="Avatar">JR</ImageFieldPreview>
        <ImageFieldContent>
          <ImageFieldActions>
            <ImageFieldUpload>Enviar avatar</ImageFieldUpload>
            <ImageFieldRemove />
          </ImageFieldActions>
          <ImageFieldDescription />
        </ImageFieldContent>
      </ImageField>
    </QueryClientProvider>
  )
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('o seletor nativo não foi renderizado')

  return input
}

const PHOTO = new File(['x'], 'foto.png', { type: 'image/png' })

describe('ImageField', () => {
  it('sem imagem mostra a sigla, a descrição e nenhum Remover', () => {
    render(<Harness onValueChange={() => undefined} />)

    expect(screen.getByText('JR')).toBeTruthy()
    expect(screen.getByText(m.common_image_formats())).toBeTruthy()
    expect(screen.queryByRole('button', { name: m.common_remove() })).toBeNull()
  })

  it('a escolha sobe o arquivo e entrega o id do anexo ao pai', async () => {
    upload.mockResolvedValue({ id: 'storage-1', url: 'https://x/foto.png' })
    const onValueChange = vi.fn()
    const { container } = render(<Harness onValueChange={onValueChange} />)

    await userEvent.upload(fileInput(container), PHOTO)

    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith('storage-1'))
    expect(
      await screen.findByRole('button', { name: m.common_remove() }),
    ).toBeTruthy()
  })

  it('tipo fora do aceito é recusado antes de qualquer requisição', async () => {
    const onValueChange = vi.fn()
    const { container } = render(<Harness onValueChange={onValueChange} />)
    const pdf = new File(['x'], 'ficha.pdf', { type: 'application/pdf' })

    await userEvent.upload(fileInput(container), pdf, { applyAccept: false })

    expect(toast.error).toHaveBeenCalledWith(
      m.common_file_type_not_accepted({ name: 'ficha.pdf' }),
      { id: 'storage-create-error' },
    )
    expect(upload).not.toHaveBeenCalled()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('Remover limpa o valor e apaga só o arquivo que o campo subiu', async () => {
    upload.mockResolvedValue({ id: 'storage-1', url: 'https://x/foto.png' })
    const onValueChange = vi.fn()
    const { container } = render(<Harness onValueChange={onValueChange} />)

    await userEvent.upload(fileInput(container), PHOTO)
    await userEvent.click(
      await screen.findByRole('button', { name: m.common_remove() }),
    )

    expect(onValueChange).toHaveBeenLastCalledWith(null)
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    expect(send).toHaveBeenCalledWith('/storages/storage-1', {
      method: 'DELETE',
    })
  })

  it('o anexo já salvo some da tela sem ser apagado no servidor', async () => {
    render(
      <Harness
        onValueChange={() => undefined}
        previewUrl="https://x/salvo.png"
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: m.common_remove() }),
    )

    expect(send).not.toHaveBeenCalled()
  })

  it('uma parte fora do ImageField diz qual ficou sem provider', () => {
    expect(() => render(<ImageFieldRemove />)).toThrow('ImageFieldRemove')
  })
})
