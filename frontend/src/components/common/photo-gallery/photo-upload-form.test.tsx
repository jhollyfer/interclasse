// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { m } from '#/paraglide/messages'

import { PhotoUploadForm } from './index'

const { request, upload } = vi.hoisted(() => ({
  request: vi.fn(
    async (_url: string, _schema: unknown, _options?: RequestInit) => ({}),
  ),
  upload: vi.fn(),
}))

vi.mock('#/integrations/tanstack-query/http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}))

vi.mock('#/hooks/use-multipart-upload', () => ({
  useMultipartUpload: () => ({ upload }),
}))

vi.mock('#/hooks/use-unsaved-changes-blocker', () => ({
  useUnsavedChangesBlocker: () => undefined,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const STORAGE_ID = '0b9c1f5e-4a6d-4c1e-9d3b-5f2a7e8c1d40'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderForm(area: 'administrator' | 'advisor') {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })

  const view = render(
    <QueryClientProvider client={queryClient}>
      <PhotoUploadForm
        area={area}
        description="Vai para o site."
        success="Foto enviada."
      />
    </QueryClientProvider>,
  )

  return view.container
}

describe('PhotoUploadForm', () => {
  it('shows the title, the uploader description and the caption', () => {
    renderForm('advisor')

    expect(screen.getAllByText(m.common_photo_upload_title())).toHaveLength(2)
    expect(screen.getByText('Vai para o site.')).toBeTruthy()
    expect(
      screen.getByRole('textbox', { name: m.common_photo_caption() }),
    ).toBeTruthy()
  })

  it('when no image is chosen, refuses the upload before the API', async () => {
    renderForm('administrator')

    await userEvent.click(
      screen.getByRole('button', { name: m.common_photo_send() }),
    )

    await waitFor(() => expect(request).not.toHaveBeenCalled())
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('sends the chosen photo with the caption to the uploader area', async () => {
    upload.mockResolvedValue({ id: STORAGE_ID, url: 'https://x/foto.png' })
    const container = renderForm('advisor')
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')
    if (!input) throw new Error('o seletor nativo não foi renderizado')

    await userEvent.upload(
      input,
      new File(['x'], 'foto.png', { type: 'image/png' }),
    )
    await userEvent.type(
      screen.getByRole('textbox', { name: m.common_photo_caption() }),
      'Final do futsal',
    )
    await userEvent.click(
      screen.getByRole('button', { name: m.common_photo_send() }),
    )

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    const [url, , options] = request.mock.calls[0] ?? []
    expect(url).toBe('/advisor/photos')
    expect(JSON.parse(String(options?.body))).toEqual({
      storageId: STORAGE_ID,
      caption: 'Final do futsal',
    })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Foto enviada.'),
    )
  })
})
