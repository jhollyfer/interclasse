import { AccountProfileUpdateValidator } from '@interclasse/shared'
import type {
  AccountProfileUpdatePayload,
  AccountProfileShowResponse,
} from '@interclasse/shared'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type * as React from 'react'
import { toast } from 'sonner'

import {
  FormShell,
  FormShellActions,
  FormShellBack,
  FormShellCard,
  FormShellContent,
  FormShellDiscard,
  FormShellHeader,
  FormShellSubmit,
  FormShellTitle,
} from '#/components/common/form-shell'
import {
  ImageField,
  ImageFieldActions,
  ImageFieldContent,
  ImageFieldDescription,
  ImageFieldPreview,
  ImageFieldRemove,
  ImageFieldUpload,
} from '#/components/common/image-field'
import { InputPassword } from '#/components/common/input-password'
import { FieldDescription, FieldLegend, FieldSet } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useAccountUpdateMutation } from '#/integrations/tanstack-query/mutations/account'
import { accountQueryOptions } from '#/integrations/tanstack-query/queries/account'
import { blankToUndefined } from '#/lib/form-values'
import { initials } from '#/lib/labels'
import { m } from '#/paraglide/messages'

/**
 * The fields the backend may flag.
 *
 * `currentPassword` is on the list because the
 * `422 CURRENT_PASSWORD_INVALID` comes from it: the use-case returns
 * `errors: { currentPassword: 'Senha atual inválida' }`, and without the key here the
 * message would fall to the form footer instead of pointing at the field.
 */
const FIELDS = [
  'name',
  'email',
  'password',
  'passwordConfirmation',
  'currentPassword',
  'avatarId',
] as const

/**
 * The three password keys **leave** the body when there is no change, and that is this
 * screen's trap: the backend's `requiredIfExists` looks at the **key**, not
 * the value. `password: ''` becomes `null` and still counts as present, and the API
 * would start demanding `currentPassword` from someone who did not want to change the password.
 */
function toPayload(
  values: AccountProfileUpdatePayload,
): AccountProfileUpdatePayload {
  const { password, passwordConfirmation, currentPassword, ...rest } = values

  if (!password) return rest

  return { ...rest, password, passwordConfirmation, currentPassword }
}

/**
 * Editing the account itself. Whoever only wants to check the data stays on the record, in
 * `-components/profile.tsx`.
 *
 * The `onSuccess` is its own: changing e-mail or password takes down **all** sessions
 * on the server, including this one, and the right place after that is the login, not the
 * record.
 */
export function ProfileFormEdit(): React.JSX.Element {
  const router = useRouter()

  // The route's `loader` already guaranteed the data; here it is a cache read.
  const { data: account } = useSuspenseQuery(accountQueryOptions())

  const { form, onSubmit, shell } = useResourceForm<
    AccountProfileUpdatePayload,
    AccountProfileShowResponse,
    AccountProfileUpdatePayload
  >({
    formId: 'profile',
    validator: AccountProfileUpdateValidator,
    // Without this the fields are born `undefined`, and the input mounts uncontrolled
    // only to become controlled on the first keystroke.
    defaults: {
      name: '',
      email: '',
      avatarId: null,
    },
    values: {
      name: account.name,
      email: account.email,
      avatarId: account.avatarId,
    },
    fields: FIELDS,
    mutation: useAccountUpdateMutation,
    // By prefix: the layout's guard and the header read the same key.
    invalidate: queryKeys.account.profile.all,
    backTo: '/profile',
    // Editing can always resend: the `PUT` writes the same final state.
    retry: 'account-update-error',
    payload: toPayload,
    async onSuccess(updated, payload) {
      // The redirect to the login is not a side effect to avoid: it is what
      // has already happened on the server side.
      if (payload.email !== account.email || payload.password) {
        toast.success(m.profile_access_updated())
        await router.navigate({ to: '/sign-in' })
        return
      }

      // Back to the record: that is where the new name and e-mail show up to be
      // checked.
      toast.success(m.profile_saved({ name: updated.name }))
      await router.navigate({ to: '/profile' })
    },
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>{m.profile_edit()}</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={onSubmit}>
        <FormShellCard>
          <FieldSet>
            <FieldLegend>{m.profile_identity()}</FieldLegend>

            <AppField
              control={form.control}
              name="avatarId"
              id="account-avatar"
              label={m.profile_photo()}
            >
              {({ field, control }) => (
                <ImageField
                  id={control.id}
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                  previewUrl={account.avatar?.url}
                >
                  <ImageFieldPreview alt={account.name}>
                    {initials(account.name)}
                  </ImageFieldPreview>
                  <ImageFieldContent>
                    <ImageFieldActions>
                      <ImageFieldUpload>
                        {m.profile_upload_photo()}
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
              name="name"
              id="account-name"
              label={m.common_name()}
            >
              {({ field, control }) => (
                <Input
                  {...field}
                  {...control}
                  value={field.value ?? ''}
                  autoComplete="name"
                />
              )}
            </AppField>

            <AppField
              control={form.control}
              name="email"
              id="account-email"
              label={m.common_email()}
            >
              {({ field, control }) => (
                <Input
                  {...field}
                  {...control}
                  value={field.value ?? ''}
                  autoComplete="email"
                />
              )}
            </AppField>
          </FieldSet>

          <FieldSet>
            <FieldLegend>{m.common_password()}</FieldLegend>

            <AppField
              control={form.control}
              name="password"
              id="account-password"
              label={m.profile_new_password()}
            >
              {({ field, control }) => (
                <InputPassword
                  {...field}
                  {...control}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(blankToUndefined(event.target.value))
                  }
                  autoComplete="new-password"
                />
              )}
            </AppField>

            <AppField
              control={form.control}
              name="passwordConfirmation"
              id="account-password-confirmation"
              label={m.profile_confirm_password()}
            >
              {({ field, control }) => (
                <InputPassword
                  {...field}
                  {...control}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(blankToUndefined(event.target.value))
                  }
                  autoComplete="new-password"
                />
              )}
            </AppField>

            <AppField
              control={form.control}
              name="currentPassword"
              id="account-current-password"
              label={m.profile_current_password()}
            >
              {({ field, control }) => (
                <>
                  <InputPassword
                    {...field}
                    {...control}
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(blankToUndefined(event.target.value))
                    }
                    autoComplete="current-password"
                  />
                  {/* The rule belongs to the validator - `requiredIfExists('password')` -,
                      and the text is here for whoever reads before typing. */}
                  <FieldDescription>
                    {m.profile_current_password_help()}
                  </FieldDescription>
                </>
              )}
            </AppField>

            <FieldDescription>
              {m.profile_credentials_notice()}
            </FieldDescription>
          </FieldSet>

          <AppFormRootError form={form} />
        </FormShellCard>
      </FormShellContent>
    </FormShell>
  )
}
