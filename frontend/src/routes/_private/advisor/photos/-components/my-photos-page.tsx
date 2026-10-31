import type { AdministratorPhotoShowResponse } from '@interclasse/shared'
import { TrashIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import type * as React from 'react'
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
import { usePhotoDeleteMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { advisorPhotosQueryOptions } from '#/integrations/tanstack-query/queries/advisor'
import { notifyError } from '#/lib/form-errors'
import { m } from '#/paraglide/messages'

import { MY_PHOTOS } from '../index'

/** The advisor uploads match photos and follows the approval of each one. */
export function MyPhotosPage(): React.JSX.Element {
  const { data, isPending } = useQuery(advisorPhotosQueryOptions(MY_PHOTOS))

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>{m.advisor_photos_title()}</PageHeaderTitle>
        <PageHeaderDescription>
          {m.advisor_photos_subtitle()}
        </PageHeaderDescription>
      </PageHeader>

      <PhotoUploadForm
        area="advisor"
        description={m.advisor_photos_upload_description()}
        success={m.advisor_photos_upload_success()}
      />

      <PhotoGrid
        photos={data?.data ?? []}
        isPending={isPending}
        empty={m.advisor_photos_empty()}
        actions={(photo) => <DeleteAction photo={photo} />}
      />
    </div>
  )
}

function DeleteAction({
  photo,
}: Readonly<{ photo: AdministratorPhotoShowResponse }>): React.JSX.Element {
  const invalidate = useInvalidate()
  const remove = usePhotoDeleteMutation('advisor', {
    onSuccess: async () => {
      toast.success(m.advisor_photo_deleted())
      await invalidate(DEPENDENTS.photos)
    },
    onError: (error) => notifyError(error, { id: 'photo-delete' }),
  })

  return (
    <ConfirmDialog
      destructive
      onConfirm={() => remove.mutate(photo.id)}
      render={
        <Button size="sm" variant="ghost">
          <TrashIcon />
          {m.advisor_photo_delete()}
        </Button>
      }
    >
      <ConfirmDialogHeader>
        <ConfirmDialogTitle>
          {m.advisor_photo_delete_title()}
        </ConfirmDialogTitle>
        <ConfirmDialogDescription>
          {m.advisor_photo_delete_description()}
        </ConfirmDialogDescription>
      </ConfirmDialogHeader>
      <ConfirmDialogFooter>
        <ConfirmDialogCancel />
        <ConfirmDialogConfirm>{m.advisor_photo_delete()}</ConfirmDialogConfirm>
      </ConfirmDialogFooter>
    </ConfirmDialog>
  )
}
