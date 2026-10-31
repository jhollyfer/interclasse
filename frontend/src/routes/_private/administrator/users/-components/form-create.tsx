import { AdministratorUserCreateValidator } from '@interclasse/shared'
import type {
  AdministratorUserCreatePayload,
  AdministratorUserShowResponse,
} from '@interclasse/shared'
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
import { FieldDescription, FieldLegend, FieldSet } from '#/components/ui/field'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'
import { useUserCreateMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { m } from '#/paraglide/messages'

import type { UserFormType } from './form-fields'
import { USER_FIELDS, USER_FORM_DEFAULTS, UserFormFields } from './form-fields'

const FORM_ID = 'user-create'

/**
 * The only account-creation path in the API: there is no public sign-up, and the
 * first administrator comes from the seeder. The whole module belongs to `ADMINISTRATOR`,
 * - whoever lacks the role gets the backend's `403`, which is
 * where the real authorization lives.
 */
export function UserFormCreate(): React.JSX.Element {
  // The three parameters are explicit, and not inferred as in the testimonial
  // mold: `USER_FORM_DEFAULTS` is `DefaultValues<>`, which is a deep partial,
  // and the compiler has no way back from it to the form's type.
  const { form, onSubmit, shell } = useResourceForm<
    UserFormType,
    AdministratorUserShowResponse,
    AdministratorUserCreatePayload
  >({
    formId: FORM_ID,
    validator: AdministratorUserCreateValidator,
    defaults: USER_FORM_DEFAULTS,
    fields: USER_FIELDS,
    mutation: useUserCreateMutation,
    invalidate: queryKeys.administrator.users.all,
    backTo: '/administrator/users',
    success: (user) => m.admin_users_created_ok({ name: user.name }),
    // With `retry`, unlike testimonials: `create.use-case.ts` refuses the
    // e-mail of a live account with `409 USER_ALREADY_EXISTS`, so resending after
    // a 5xx that may have saved does not create a second account - it bumps into the
    // 409 and says so.
    retry: 'user-create-error',
    // The resolver already validated; `parse` returns the create type, in which the
    // form (the update one, everything optional) does not prove name, e-mail and role.
    payload: (values) => AdministratorUserCreateValidator.parse(values),
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>{m.admin_users_create()}</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={onSubmit}>
        <Card>
          <CardContent>
            <FieldSet>
              <FieldLegend>{m.admin_users_identity_legend()}</FieldLegend>
              <UserFormFields form={form} idPrefix="user" />
              <FieldDescription>{m.admin_users_create_note()}</FieldDescription>
            </FieldSet>
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
