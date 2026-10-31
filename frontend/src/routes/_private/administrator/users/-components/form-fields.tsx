import type { AdministratorUserUpdatePayload } from '@interclasse/shared'
import { ACTIVE_STATUS, ACTIVE_STATUSES, USER_ROLES } from '@interclasse/shared'
import type * as React from 'react'
import type { DefaultValues, UseFormReturn } from 'react-hook-form'

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
import { OptionCombobox, toOptions } from '#/components/common/option-combobox'
import { FieldDescription, FieldGroup } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { blankToUndefined } from '#/lib/form-values'
import {
  ACCOUNT_STATUS_LABELS,
  ACTIVE_STATUS_DOTS,
  USER_ROLE_LABELS,
  initials,
} from '#/lib/labels'
import { m } from '#/paraglide/messages'

export type UserFormType = AdministratorUserUpdatePayload

/**
 * The empty form.
 *
 * `DefaultValues<>` and not the whole type because **`role` has no honest
 * starting value**: the column has no `DEFAULT`, the role is always explicit on the
 * server, and picking one here would make the form invent a starting value that the
 * database would not give the same payload without the field. The combobox is born empty and
 * shows the `placeholder`; whoever does not choose gets the 422 pointing at the field.
 *
 * `status` is born `ACTIVE` because it is the column's `DEFAULT` - the account is born
 * able to sign in, and deactivating is an edit.
 */
export const USER_FORM_DEFAULTS: DefaultValues<UserFormType> = {
  name: '',
  email: '',
  status: ACTIVE_STATUS.ACTIVE,
  avatarId: null,
}

/**
 * The fields the API knows how to flag. Outside this list, the error becomes `root`.
 *
 * `passwordConfirmation` is here because the error of the `confirmed()` rule comes
 * from it: VineJS reports the mismatch **on the confirmation**, and without the
 * key the message would fall to the footer instead of pointing at the field.
 */
export const USER_FIELDS = [
  'name',
  'email',
  'password',
  'passwordConfirmation',
  'role',
  'status',
  'avatarId',
] as const

type UserFormFieldsProps = Readonly<{
  form: UseFormReturn<UserFormType>
  /** `id` prefix, so the same form can appear twice on the page. */
  idPrefix: string
  /**
   * The already saved photo's URL. A prop and not a slot - it is record data, not
   * markup, and only editing has something to pass here.
   */
  previewUrl?: string | null
  /**
   * The password field's label.
   *
   * On creation the password is required; on editing, blank means "do not
   * change". It is the only sentence that differs between the two screens, and a whole slot
   * for it would be more part than text.
   */
  passwordLabel?: string
}>

/**
 * The account fields, shared by creation and editing. Each screen
 * owns its own mutation and its own `onSuccess` - what repeats is the
 * markup, and only it lives here, one level above the two.
 *
 * Field by field it is `AppField` (a `Controller`), never `register`: the components come from Base UI
 * and do not expose the `<input>` to receive a `ref`.
 *
 * The current password does not appear: `currentPassword` is a requirement of `PUT /account`,
 * where whoever changes it is the account owner and must prove identity. Here whoever
 * changes it is the administrator, on someone else's account - they do not know the
 * current password, and demanding it would block the reset for someone who lost access.
 */
export function UserFormFields({
  form,
  idPrefix,
  previewUrl,
  passwordLabel = m.admin_users_field_password(),
}: UserFormFieldsProps): React.JSX.Element {
  const name = form.watch('name')

  return (
    <FieldGroup>
      <AppFormRootError form={form} />

      <AppField
        control={form.control}
        name="avatarId"
        id={`${idPrefix}-avatar`}
        label={m.admin_users_field_photo()}
      >
        {({ field, control }) => (
          <ImageField
            id={control.id}
            value={field.value ?? null}
            onValueChange={field.onChange}
            previewUrl={previewUrl}
          >
            {/* Without a photo and without a name, the reserved space stays empty, and that is what
                is wanted: `initials('')` is `''` and `AvatarFallback` knows how to stay
                blank. */}
            <ImageFieldPreview alt={m.admin_users_photo_alt()}>
              {initials(name)}
            </ImageFieldPreview>
            <ImageFieldContent>
              <ImageFieldActions>
                <ImageFieldUpload>
                  {m.admin_users_upload_photo()}
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
        id={`${idPrefix}-name`}
        label={m.admin_common_name()}
      >
        {({ field, control }) => (
          <Input
            {...field}
            {...control}
            autoComplete="name"
            placeholder={m.admin_users_field_name_placeholder()}
          />
        )}
      </AppField>

      <AppField
        control={form.control}
        name="email"
        id={`${idPrefix}-email`}
        label={m.admin_common_email()}
      >
        {({ field, control }) => (
          <>
            <Input
              {...field}
              {...control}
              autoComplete="email"
              placeholder={m.admin_users_field_email_placeholder()}
            />
            {/* The e-mail is globally `UNIQUE`, and the use-case answers `409` when
                a live account with it already exists. */}
            <FieldDescription>
              {m.admin_users_field_email_description()}
            </FieldDescription>
          </>
        )}
      </AppField>

      <AppField
        control={form.control}
        name="password"
        id={`${idPrefix}-password`}
        label={passwordLabel}
      >
        {({ field, control }) => (
          <>
            {/* A blank password and confirmation are **absent**, and not `''`:
                the `shared/` schema would refuse `''` for its length. The form's type
                is the update one (everything optional); on creation it is the create
                validator that demands both fields. */}
            <InputPassword
              {...control}
              value={field.value ?? ''}
              onChange={(event) =>
                field.onChange(blankToUndefined(event.target.value))
              }
              onBlur={field.onBlur}
              autoComplete="new-password"
            />
            <FieldDescription>
              {m.admin_users_field_password_description()}
            </FieldDescription>
          </>
        )}
      </AppField>

      <AppField
        control={form.control}
        name="passwordConfirmation"
        id={`${idPrefix}-password-confirmation`}
        label={m.admin_users_field_password_confirmation()}
      >
        {({ field, control }) => (
          <InputPassword
            {...control}
            value={field.value ?? ''}
            onChange={(event) =>
              field.onChange(blankToUndefined(event.target.value))
            }
            onBlur={field.onBlur}
            autoComplete="new-password"
          />
        )}
      </AppField>

      <AppField
        control={form.control}
        name="role"
        id={`${idPrefix}-role`}
        label={m.admin_common_role()}
      >
        {({ field, control }) => (
          <>
            <OptionCombobox
              {...control}
              // No `?? some role`: the field has no starting value, and forcing one
              // here would silently save a role nobody chose.
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={toOptions(USER_ROLES, USER_ROLE_LABELS)}
            />
            <FieldDescription>
              {m.admin_users_field_role_description()}
            </FieldDescription>
          </>
        )}
      </AppField>

      <AppField
        control={form.control}
        name="status"
        id={`${idPrefix}-status`}
        label={m.admin_common_status()}
      >
        {({ field, control }) => (
          <>
            <OptionCombobox
              {...control}
              value={field.value ?? ACTIVE_STATUS.ACTIVE}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={toOptions(
                ACTIVE_STATUSES,
                ACCOUNT_STATUS_LABELS,
                ACTIVE_STATUS_DOTS,
              )}
            />
            {/* Inactive is not archived: the row stays in the listing and the
                record stays alive, only the access closes. */}
            <FieldDescription>
              {m.admin_users_field_status_description()}
            </FieldDescription>
          </>
        )}
      </AppField>
    </FieldGroup>
  )
}
