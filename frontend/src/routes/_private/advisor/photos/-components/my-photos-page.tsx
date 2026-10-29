import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrashIcon } from '@phosphor-icons/react'
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
import { DEPENDENTS } from '#/hooks/tanstack-query/_query-keys'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { usePhotoDelete } from '#/integrations/tanstack-query/mutations/administrator'
import { advisorPhotosQueryOptions } from '#/integrations/tanstack-query/queries/advisor'
import { notifyError } from '#/lib/form-errors'
import type { IPhoto } from '#/lib/interfaces'

import { MY_PHOTOS } from '../index'

/** O conselheiro envia fotos dos jogos e acompanha a aprovação de cada uma. */
export function MyPhotosPage(): React.JSX.Element {
  const { data, isPending } = useQuery(advisorPhotosQueryOptions(MY_PHOTOS))

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>Fotos dos jogos</PageHeaderTitle>
        <PageHeaderDescription>
          Fotos dos atletas e dos jogos para o carrossel do site.
        </PageHeaderDescription>
      </PageHeader>

      <PhotoUploadForm
        area="advisor"
        description="A organização aprova a foto antes de ela aparecer no site."
        success="Foto enviada. Ela aparece no site depois de aprovada."
      />

      <PhotoGrid
        photos={data?.data ?? []}
        isPending={isPending}
        empty="Você ainda não enviou fotos."
        actions={(photo) => <DeleteAction photo={photo} />}
      />
    </div>
  )
}

function DeleteAction({
  photo,
}: Readonly<{ photo: IPhoto }>): React.JSX.Element {
  const invalidate = useInvalidate()
  const remove = usePhotoDelete('advisor', {
    onSuccess: async () => {
      toast.success('Foto apagada.')
      await invalidate(DEPENDENTS.photos)
    },
    onError: (error) => notifyError(error, { id: 'photo-delete' }),
  })

  return (
    <ConfirmDialog
      destructive
      onConfirm={() => remove.mutate(photo.id)}
      trigger={
        <Button size="sm" variant="ghost">
          <TrashIcon />
          Apagar
        </Button>
      }
    >
      <ConfirmDialogHeader>
        <ConfirmDialogTitle>Apagar esta foto?</ConfirmDialogTitle>
        <ConfirmDialogDescription>
          Se ela já estiver no site, sai de lá também.
        </ConfirmDialogDescription>
      </ConfirmDialogHeader>
      <ConfirmDialogFooter>
        <ConfirmDialogCancel />
        <ConfirmDialogConfirm>Apagar</ConfirmDialogConfirm>
      </ConfirmDialogFooter>
    </ConfirmDialog>
  )
}
