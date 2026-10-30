import type * as React from 'react'
import { AdministratorAnnouncementCreateValidator } from '@interclasse/shared'
import type {
  AdministratorAnnouncementCreatePayload,
  AdministratorAnnouncementShowResponse,
} from '@interclasse/shared'

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
import { useAnnouncementCreateMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'
import { m } from '#/paraglide/messages'

import type { AnnouncementFormType } from './form-fields'
import {
  ANNOUNCEMENT_FIELDS,
  ANNOUNCEMENT_FORM_DEFAULTS,
  AnnouncementFormFields,
} from './form-fields'

export function AnnouncementFormCreate(): React.JSX.Element {
  const { form, onSubmit, shell } = useResourceForm<
    AnnouncementFormType,
    AdministratorAnnouncementShowResponse,
    AdministratorAnnouncementCreatePayload
  >({
    formId: 'announcement-create',
    validator: AdministratorAnnouncementCreateValidator,
    defaults: ANNOUNCEMENT_FORM_DEFAULTS,
    fields: ANNOUNCEMENT_FIELDS,
    mutation: useAnnouncementCreateMutation,
    invalidate: queryKeys.administrator.announcements.all,
    alsoInvalidate: DEPENDENTS.announcements,
    backTo: '/administrator/announcements',
    success: () => m.admin_announcements_published(),
    // Nome repetido é `409 ANNOUNCEMENT_ALREADY_EXISTS`: reenviar é seguro.
    payload: (values) => values,
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>{m.admin_announcements_create()}</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={onSubmit}>
        <Card>
          <CardContent>
            <AnnouncementFormFields form={form} idPrefix="announcement" />
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
