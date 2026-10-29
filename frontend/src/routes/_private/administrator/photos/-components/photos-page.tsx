import type * as React from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckIcon, TrashIcon, XIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogDescription,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { PhotoGrid, PhotoUploadForm } from '#/components/common/photo-gallery'
import { Button } from '#/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { DEPENDENTS } from '#/hooks/tanstack-query/_query-keys'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import {
  usePhotoDelete,
  usePhotoReview,
} from '#/integrations/tanstack-query/mutations'
import { photosQueryOptions } from '#/integrations/tanstack-query/queries'
import { PHOTO_STATUS, PHOTO_STATUSES } from '#/lib/entity'
import { notifyError } from '#/lib/form-errors'
import type { IPhoto } from '#/lib/interfaces'

import { PHOTO_PAGE } from '../index'

const route = getRouteApi('/_private/administrator/photos/')

/** "Todas" é a aba sem `?status`. */
const ALL = 'ALL'

const TABS = [
  { value: PHOTO_STATUS.PENDING, label: 'Aguardando' },
  { value: PHOTO_STATUS.APPROVED, label: 'No site' },
  { value: PHOTO_STATUS.REJECTED, label: 'Recusadas' },
  { value: ALL, label: 'Todas' },
] as const

/**
 * As fotos do carrossel: a fila do que os conselheiros enviaram e o envio da
 * própria organização, que já vai ao ar.
 */
export function PhotosPage(): React.JSX.Element {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isPending } = useQuery(
    photosQueryOptions({ ...PHOTO_PAGE, status: search.status }),
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>Fotos</PageHeaderTitle>
        <PageHeaderDescription>
          As fotos do carrossel do site. As dos conselheiros só aparecem depois
          de aprovadas aqui.
        </PageHeaderDescription>
      </PageHeader>

      <PhotoUploadForm
        area="administrator"
        description="A foto da organização vai direto para o site."
        success="Foto publicada no site."
      />

      <Tabs
        value={search.status ?? ALL}
        onValueChange={(value: string) =>
          void navigate({
            search: { status: PHOTO_STATUSES.find((item) => item === value) },
            replace: true,
          })
        }
      >
        <TabsList aria-label="Situação">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="px-4">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <PhotoGrid
        photos={data?.data ?? []}
        isPending={isPending}
        empty="Nenhuma foto aqui."
        showAuthor
        actions={(photo) => <ReviewActions photo={photo} />}
      />
    </div>
  )
}

/** Aprovar, recusar e apagar. Só o que muda a situação atual aparece. */
function ReviewActions({
  photo,
}: Readonly<{ photo: IPhoto }>): React.JSX.Element {
  const invalidate = useInvalidate()
  const done = (message: string) => async (): Promise<void> => {
    toast.success(message)
    await invalidate(DEPENDENTS.photos)
  }

  const review = usePhotoReview({
    onSuccess: async (updated) => {
      if (updated.status === PHOTO_STATUS.APPROVED)
        return done('Foto aprovada: já está no site.')()
      return done('Foto recusada: saiu do site.')()
    },
    onError: (error) => notifyError(error, { id: 'photo-review' }),
  })
  const remove = usePhotoDelete('administrator', {
    onSuccess: done('Foto apagada.'),
    onError: (error) => notifyError(error, { id: 'photo-delete' }),
  })

  return (
    <>
      {photo.status !== PHOTO_STATUS.APPROVED && (
        <Button
          size="sm"
          disabled={review.isPending}
          onClick={() =>
            review.mutate({ id: photo.id, status: PHOTO_STATUS.APPROVED })
          }
        >
          <CheckIcon />
          Aprovar
        </Button>
      )}
      {photo.status !== PHOTO_STATUS.REJECTED && (
        <Button
          size="sm"
          variant="outline"
          disabled={review.isPending}
          onClick={() =>
            review.mutate({ id: photo.id, status: PHOTO_STATUS.REJECTED })
          }
        >
          <XIcon />
          Recusar
        </Button>
      )}
      <ConfirmDialog
        destructive
        onConfirm={() => remove.mutate(photo.id)}
        trigger={
          <Button size="sm" variant="ghost" aria-label="Apagar foto">
            <TrashIcon />
          </Button>
        }
      >
        <ConfirmDialogHeader>
          <ConfirmDialogTitle>Apagar esta foto?</ConfirmDialogTitle>
          <ConfirmDialogDescription>
            Ela some do site e da lista de quem enviou. Não dá para desfazer.
          </ConfirmDialogDescription>
        </ConfirmDialogHeader>
        <ConfirmDialogFooter>
          <ConfirmDialogCancel />
          <ConfirmDialogConfirm>Apagar</ConfirmDialogConfirm>
        </ConfirmDialogFooter>
      </ConfirmDialog>
    </>
  )
}
