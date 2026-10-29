import type * as React from 'react'
import { AdministratorAnnouncementCreateValidator } from '@interclasse/shared'
import type { AdministratorAnnouncementCreatePayload } from '@interclasse/shared'

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
import type { IAnnouncement } from '#/lib/interfaces'
import { useAnnouncementCreate } from '#/integrations/tanstack-query/mutations/administrator'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'

import type { AnnouncementFormType } from './form-fields'
import {
  ANNOUNCEMENT_FIELDS,
  ANNOUNCEMENT_FORM_DEFAULTS,
  AnnouncementFormFields,
} from './form-fields'

export function AnnouncementFormCreate(): React.JSX.Element {
  const { form, onSubmit, shell } = useResourceForm<
    AnnouncementFormType,
    IAnnouncement,
    AdministratorAnnouncementCreatePayload
  >({
    formId: 'announcement-create',
    validator: AdministratorAnnouncementCreateValidator,
    defaults: ANNOUNCEMENT_FORM_DEFAULTS,
    fields: ANNOUNCEMENT_FIELDS,
    mutation: useAnnouncementCreate,
    invalidate: queryKeys.administrator.announcements.all,
    alsoInvalidate: DEPENDENTS.announcements,
    backTo: '/administrator/announcements',
    success: () => 'Aviso publicado.',
    // Nome repetido é `409 ANNOUNCEMENT_ALREADY_EXISTS`: reenviar é seguro.
    payload: (values) => values,
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>Adicionar aviso</FormShellTitle>
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
