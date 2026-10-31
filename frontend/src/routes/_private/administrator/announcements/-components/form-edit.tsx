import { AdministratorAnnouncementCreateValidator } from '@interclasse/shared'
import type {
  AdministratorAnnouncementUpdatePayload,
  AdministratorAnnouncementShowResponse,
  Merge,
} from '@interclasse/shared'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'

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
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'
import { useAnnouncementUpdateMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { announcementQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { m } from '#/paraglide/messages'

import type { AnnouncementFormType } from './form-fields'
import { ANNOUNCEMENT_FIELDS, AnnouncementFormFields } from './form-fields'

const route = getRouteApi('/_private/administrator/announcements/$id/edit')

/** Validates with the create schema: a required field cannot be erased. */
export function AnnouncementFormEdit(): React.JSX.Element {
  const { id } = route.useParams()
  const { data: announcement } = useSuspenseQuery(announcementQueryOptions(id))

  const { form, onSubmit, shell } = useResourceForm<
    AnnouncementFormType,
    AdministratorAnnouncementShowResponse,
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
    mutation: useAnnouncementUpdateMutation,
    invalidate: queryKeys.administrator.announcements.all,
    alsoInvalidate: DEPENDENTS.announcements,
    backTo: '/administrator/announcements',
    success: () => m.admin_announcements_saved(),
    retry: 'announcement-update-error',
    payload: (values) => ({ ...values, id }),
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>{m.admin_announcements_edit()}</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={onSubmit}>
        <Card>
          <CardContent>
            <AnnouncementFormFields form={form} idPrefix="edit-announcement" />
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
