import { AdministratorPhotoCreateValidator } from '@interclasse/shared'
import type {
  AdministratorPhotoCreatePayload,
  AdministratorPhotoShowResponse,
} from '@interclasse/shared'
import { ImageIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import type * as React from 'react'

import {
  ImageField,
  ImageFieldActions,
  ImageFieldContent,
  ImageFieldDescription,
  ImageFieldPreview,
  ImageFieldRemove,
  ImageFieldUpload,
} from '#/components/common/image-field'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { DEPENDENTS } from '#/hooks/tanstack-query/_query-keys'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import {
  useAdministratorPhotoCreateMutation,
  useAdvisorPhotoCreateMutation,
} from '#/integrations/tanstack-query/mutations/administrator'
import { m } from '#/paraglide/messages'

const PHOTO_FIELDS = ['storageId', 'caption'] as const

/** Each area's hook, chosen by lookup: the area is fixed per screen. */
const PHOTO_CREATE = {
  administrator: useAdministratorPhotoCreateMutation,
  advisor: useAdvisorPhotoCreateMutation,
} as const

const EMPTY: AdministratorPhotoCreatePayload = { storageId: '', caption: null }

type PhotoUploadFormProps = Readonly<{
  /** Who uploads: the administrator's photo goes straight to the site, the advisor's waits. */
  area: 'administrator' | 'advisor'
  /** What happens after uploading, told to whoever uploads. */
  description: string
  success: string
}>

/**
 * Upload a photo to the carousel: the image (uploads on choice, like the
 * avatar) and an optional caption. The same form in both areas.
 */
export function PhotoUploadForm({
  area,
  description,
  success,
}: PhotoUploadFormProps): React.JSX.Element {
  const { form, mutation, onSubmit } = useMutationForm<
    AdministratorPhotoCreatePayload,
    AdministratorPhotoShowResponse,
    AdministratorPhotoCreatePayload
  >({
    validator: AdministratorPhotoCreateValidator,
    defaults: EMPTY,
    fields: PHOTO_FIELDS,
    mutation: PHOTO_CREATE[area],
    invalidate: DEPENDENTS.photos,
    success,
    payload: (values) => values,
    onSuccess: (): void => form.reset(EMPTY),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.common_photo_upload_title()}</CardTitle>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardHeader>
      <CardContent>
        <form method="post" className="flex flex-col gap-4" onSubmit={onSubmit}>
          <AppFormRootError form={form} />
          <AppField
            control={form.control}
            name="storageId"
            id={`${area}-photo-file`}
            label={m.common_photo_field()}
          >
            {({ field, control }) => (
              <ImageField
                id={control.id}
                value={field.value || null}
                onValueChange={(id) => field.onChange(id ?? '')}
              >
                <ImageFieldPreview alt={m.common_photo_preview_alt()}>
                  <ImageIcon />
                </ImageFieldPreview>
                <ImageFieldContent>
                  <ImageFieldActions>
                    <ImageFieldUpload>
                      {m.common_photo_choose()}
                    </ImageFieldUpload>
                    <ImageFieldRemove />
                  </ImageFieldActions>
                  <ImageFieldDescription />
                </ImageFieldContent>
              </ImageField>
            )}
          </AppField>
          <AppField
            control={form.control}
            name="caption"
            id={`${area}-photo-caption`}
            label={m.common_photo_caption()}
          >
            {({ field, control }) => (
              <Input
                {...control}
                maxLength={200}
                placeholder={m.common_photo_caption_placeholder()}
                value={field.value ?? ''}
                onChange={(event) => field.onChange(event.target.value || null)}
                onBlur={field.onBlur}
              />
            )}
          </AppField>
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              <PaperPlaneTiltIcon />
              {m.common_photo_send()}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
