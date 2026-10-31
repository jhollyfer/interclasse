import { AdministratorUserUpdateValidator } from '@interclasse/shared'
import type {
  AdministratorUserUpdatePayload,
  AdministratorUserShowResponse,
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
import { FieldDescription, FieldLegend, FieldSet } from '#/components/ui/field'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'
import { useUserUpdateMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { userQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { m } from '#/paraglide/messages'

import type { UserFormType } from './form-fields'
import { USER_FIELDS, UserFormFields } from './form-fields'

const route = getRouteApi('/_private/administrator/users/$id/edit')

const FORM_ID = 'user-update'

export function UserFormEdit(): React.JSX.Element {
  const { id } = route.useParams()

  // `useSuspenseQuery` and not `useQuery`: the route's `loader` already guaranteed the
  // record with the same key, and it is the one that handles the 404 and the failure.
  const { data: user } = useSuspenseQuery(userQueryOptions(id))

  // The three parameters are explicit, as in creation. The payload is the
  // **update** one with the `id` in the path, which is the shape `useUserUpdateMutation`
  // receives.
  const { form, onSubmit, shell } = useResourceForm<
    UserFormType,
    AdministratorUserShowResponse,
    Merge<AdministratorUserUpdatePayload, { id: string }>
  >({
    formId: FORM_ID,
    /**
     * The **update** validator, and it is the dashboard's exception - the other six
     * resources validate the edit with the create one, so the user does not erase a
     * required field silently.
     *
     * It cannot be done here: a blank password field means "do not change", and it is
     * `.optional()` that allows that. Validating with the create one would require a new
     * password on every e-mail change, and nobody could edit an account
     * without resetting its password. It is what the reference does in
     * `administrators/-components/form-edit.tsx`, for the same reason.
     */
    validator: AdministratorUserUpdateValidator,
    // No `defaults`: the record arrives from the query and `values` is already the complete
    // object. There is no initial state to declare that `values` would not overwrite
    // on the next render.
    //
    // `values`, and not a `useEffect` with `form.reset`: the query data arrives
    // after the first render, when `defaultValues` has already frozen.
    values: {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatarId: user.avatarId,
    },
    fields: USER_FIELDS,
    mutation: useUserUpdateMutation,
    invalidate: queryKeys.administrator.users.all,
    backTo: '/administrator/users/$id',
    backParams: { id },
    success: (updated) => m.admin_users_saved_ok({ name: updated.name }),
    // Resending a `PUT` is safe: it writes the same record, and not a new one.
    retry: 'user-update-error',
    /**
     * A blank password is **omitted** from the body, and never sent empty.
     *
     * It is the resource's trap: VineJS's `requiredIfExists` and `confirmed`
     * look at the **key**, not the value. `password: ''` becomes `null`, the key
     * stays, and the API starts demanding confirmation from someone who did not want to change
     * the password. The confirmation follows the password - alone it has nothing to confirm.
     */
    payload: ({ password, passwordConfirmation, ...rest }) => {
      if (!password) return { ...rest, id }

      return { ...rest, id, password, passwordConfirmation }
    },
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>
          {m.admin_common_edit_named({ name: user.name })}
        </FormShellTitle>
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
              <UserFormFields
                form={form}
                idPrefix="edit-user"
                previewUrl={user.avatar?.url}
                passwordLabel={m.admin_users_field_new_password()}
              />
              <FieldDescription>{m.admin_users_edit_note()}</FieldDescription>
            </FieldSet>
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
