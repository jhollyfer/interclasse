// @vitest-environment jsdom

import { PHOTO_STATUS } from '@interclasse/shared'
import type { AdministratorPhotoShowResponse } from '@interclasse/shared'
import { cleanup, render, screen } from '@testing-library/react'
import { fromPartial } from '@total-typescript/shoehorn'
import { afterEach, describe, expect, it } from 'vitest'

import { m } from '#/paraglide/messages'

import { PhotoGrid } from './index'

afterEach(cleanup)

const PHOTO = fromPartial<AdministratorPhotoShowResponse>({
  id: 'p1',
  caption: 'Final do futsal',
  status: PHOTO_STATUS.PENDING,
  storage: { url: 'https://x/p1.png' },
  author: { name: 'Marta' },
  createdAt: '2026-05-01T12:00:00.000Z',
})

describe('PhotoGrid', () => {
  it('carregando mostra o esqueleto, e não a lista nem o vazio', () => {
    const { container } = render(
      <PhotoGrid
        photos={[]}
        isPending
        empty="Sem fotos"
        actions={() => null}
      />,
    )

    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy()
    expect(screen.queryByText('Sem fotos')).toBeNull()
  })

  it('sem foto diz o motivo do vazio', () => {
    render(
      <PhotoGrid
        photos={[]}
        isPending={false}
        empty="Sem fotos"
        actions={() => null}
      />,
    )

    expect(screen.getByText('Sem fotos')).toBeTruthy()
  })

  it('cada foto leva legenda, situação, imagem com alt e as ações', () => {
    render(
      <PhotoGrid
        photos={[PHOTO]}
        isPending={false}
        empty="Sem fotos"
        actions={(photo) => <button type="button">Aprovar {photo.id}</button>}
      />,
    )

    expect(screen.getByRole('img', { name: 'Final do futsal' })).toBeTruthy()
    expect(screen.getByText(m.label_photo_status_pending())).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Aprovar p1' })).toBeTruthy()
  })

  it('sem legenda o alt é o padrão da casa', () => {
    render(
      <PhotoGrid
        photos={[{ ...PHOTO, caption: null }]}
        isPending={false}
        empty="Sem fotos"
        actions={() => null}
      />,
    )

    expect(
      screen.getByRole('img', { name: m.common_photo_alt_default() }),
    ).toBeTruthy()
  })

  it('o autor só aparece quando a tela pede', () => {
    const { unmount } = render(
      <PhotoGrid
        photos={[PHOTO]}
        isPending={false}
        empty=""
        actions={() => null}
      />,
    )

    expect(screen.queryByText(/Marta/)).toBeNull()
    unmount()

    render(
      <PhotoGrid
        photos={[PHOTO]}
        isPending={false}
        empty=""
        showAuthor
        actions={() => null}
      />,
    )

    expect(screen.getByText(/Marta/)).toBeTruthy()
  })
})
