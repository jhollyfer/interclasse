import type * as React from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import {
  FormShell,
  FormShellActions,
  FormShellBack,
  FormShellContent,
  FormShellDiscard,
  FormShellHeader,
  FormShellSubmit,
  FormShellTitle,
} from '#/components/common/form-shell'
import { Card, CardContent } from '#/components/ui/card'
import { ANNOUNCEMENT_FIELDS, AnnouncementFormFields } from './form-fields'
import type { AnnouncementFormType } from './form-fields'
import { AdministratorAnnouncementCreateValidator } from '#/lib/validator'
import type {
  AdministratorAnnouncementUpdatePayload,
  Announcement,
} from '#/lib/validator'
import type { Merge } from '#/lib/interfaces'
import { announcementQueryOptions } from '#/integrations/tanstack-query/queries'
import { useAnnouncementUpdate } from '#/integrations/tanstack-query/mutations'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'

const route = getRouteApi('/_private/administrator/announcements/$id/edit')

/** Valida com o schema de criação: campo obrigatório não pode ser apagado. */
export function AnnouncementFormEdit(): React.JSX.Element {
  const { id } = route.useParams()
  const { data: announcement } = useSuspenseQuery(announcementQueryOptions(id))

  const { form, onValid, shell } = useResourceForm<
    AnnouncementFormType,
    Announcement,
    Merge<AdministratorAnnouncementUpdatePayload, { id: string }>
  >({
    formId: 'announcement-update',
    validator: AdministratorAnnouncementCreateValidator,
    values: {
      title: announcement.title,
      body: announcement.body,
      pinned: announcement.pinned,
    },
    fields: ANNOUNCEMENT_FIELDS,
    mutation: useAnnouncementUpdate,
    invalidate: queryKeys.announcements.all,
    alsoInvalidate: DEPENDENTS.announcements,
    backTo: '/administrator/announcements',
    success: () => 'Aviso salvo.',
    retry: 'announcement-update-error',
    payload: (values) => ({ ...values, id }),
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>Editar aviso</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={form.handleSubmit(onValid)}>
        <Card>
          <CardContent>
            <AnnouncementFormFields form={form} idPrefix="edit-announcement" />
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
