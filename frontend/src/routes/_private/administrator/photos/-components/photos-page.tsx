import type * as React from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckIcon, TrashIcon, XIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { AdministratorPhotoShowResponse } from '@interclasse/shared'
import { PHOTO_STATUS, PHOTO_STATUSES } from '@interclasse/shared'

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
  usePhotoDeleteMutation,
  usePhotoReviewMutation,
} from '#/integrations/tanstack-query/mutations/administrator'
import { photosQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { notifyError } from '#/lib/form-errors'
import { m } from '#/paraglide/messages'

import { PHOTO_PAGE } from '../index'

const route = getRouteApi('/_private/administrator/photos/')

/** "Todas" é a aba sem `?status`. */
const ALL = 'ALL'

const TABS = [
  { value: PHOTO_STATUS.PENDING, label: () => m.admin_photos_tab_pending() },
  { value: PHOTO_STATUS.APPROVED, label: () => m.admin_photos_tab_approved() },
  { value: PHOTO_STATUS.REJECTED, label: () => m.admin_photos_tab_rejected() },
  { value: ALL, label: () => m.admin_common_all() },
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
        <PageHeaderTitle>{m.admin_photos_title()}</PageHeaderTitle>
        <PageHeaderDescription>
          {m.admin_photos_description()}
        </PageHeaderDescription>
      </PageHeader>

      <PhotoUploadForm
        area="administrator"
        description={m.admin_photos_upload_description()}
        success={m.admin_photos_upload_success()}
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
        <TabsList aria-label={m.admin_common_status()}>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="px-4">
              {tab.label()}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <PhotoGrid
        photos={data?.data ?? []}
        isPending={isPending}
        empty={m.admin_photos_empty()}
        showAuthor
        actions={(photo) => <ReviewActions photo={photo} />}
      />
    </div>
  )
}

/** Aprovar, recusar e apagar. Só o que muda a situação atual aparece. */
function ReviewActions({
  photo,
}: Readonly<{ photo: AdministratorPhotoShowResponse }>): React.JSX.Element {
  const invalidate = useInvalidate()
  const done = (message: string) => async (): Promise<void> => {
    toast.success(message)
    await invalidate(DEPENDENTS.photos)
  }

  const review = usePhotoReviewMutation({
    onSuccess: async (updated) => {
      if (updated.status === PHOTO_STATUS.APPROVED)
        return done(m.admin_photos_approved())()
      return done(m.admin_photos_rejected())()
    },
    onError: (error) => notifyError(error, { id: 'photo-review' }),
  })
  const remove = usePhotoDeleteMutation('administrator', {
    onSuccess: done(m.admin_photos_deleted()),
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
          {m.admin_photos_approve()}
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
          {m.admin_photos_reject()}
        </Button>
      )}
      <ConfirmDialog
        destructive
        onConfirm={() => remove.mutate(photo.id)}
        trigger={
          <Button
            size="sm"
            variant="ghost"
            aria-label={m.admin_photos_delete_label()}
          >
            <TrashIcon />
          </Button>
        }
      >
        <ConfirmDialogHeader>
          <ConfirmDialogTitle>
            {m.admin_photos_delete_title()}
          </ConfirmDialogTitle>
          <ConfirmDialogDescription>
            {m.admin_photos_delete_description()}
          </ConfirmDialogDescription>
        </ConfirmDialogHeader>
        <ConfirmDialogFooter>
          <ConfirmDialogCancel />
          <ConfirmDialogConfirm>{m.admin_common_delete()}</ConfirmDialogConfirm>
        </ConfirmDialogFooter>
      </ConfirmDialog>
    </>
  )
}
