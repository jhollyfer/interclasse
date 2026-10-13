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
import {
  ANNOUNCEMENT_FIELDS,
  ANNOUNCEMENT_FORM_DEFAULTS,
  AnnouncementFormFields,
} from './form-fields'
import type { AnnouncementFormType } from './form-fields'
import { AdministratorAnnouncementCreateValidator } from '#/lib/validator'
import type {
  AdministratorAnnouncementCreatePayload,
  Announcement,
} from '#/lib/validator'
import { useAnnouncementCreate } from '#/integrations/tanstack-query/mutations'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'

export function AnnouncementFormCreate(): React.JSX.Element {
  const { form, onValid, shell } = useResourceForm<
    AnnouncementFormType,
    Announcement,
    AdministratorAnnouncementCreatePayload
  >({
    formId: 'announcement-create',
    validator: AdministratorAnnouncementCreateValidator,
    defaults: ANNOUNCEMENT_FORM_DEFAULTS,
    fields: ANNOUNCEMENT_FIELDS,
    mutation: useAnnouncementCreate,
    invalidate: queryKeys.announcements.all,
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

      <FormShellContent onSubmit={form.handleSubmit(onValid)}>
        <Card>
          <CardContent>
            <AnnouncementFormFields form={form} idPrefix="announcement" />
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
