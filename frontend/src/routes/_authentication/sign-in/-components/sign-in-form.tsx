import { AuthenticationSessionSignInValidator } from '@interclasse/shared'
import type { AuthenticationSessionSignInPayload } from '@interclasse/shared'
import { Link, getRouteApi, useRouter } from '@tanstack/react-router'
import type * as React from 'react'

import logo512 from '#/assets/logo-512.png'
import { InputPassword } from '#/components/common/input-password'
import { Picture } from '#/components/common/picture'
import { SubmitButton } from '#/components/common/submit-button'
import { Field, FieldGroup } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useAuthenticationSignInMutation } from '#/integrations/tanstack-query/mutations/authentication'
import { m } from '#/paraglide/messages'

import {
  AuthShell,
  AuthShellAside,
  AuthShellAsideBody,
  AuthShellContent,
  AuthShellHeader,
  AuthShellTagline,
} from '../../-components/auth-shell'

const route = getRouteApi('/_authentication/sign-in/')

/**
 * The fields this form knows how to highlight. A key of `errors` outside
 * this list (the backend gained a field, for example) does not vanish silently:
 * it becomes a form message.
 */
const FIELDS = ['email', 'password'] as const

export function SignInForm(): React.JSX.Element {
  const router = useRouter()
  // Validated in the parent layout (`_authentication/layout.tsx`), which already refused
  // any destination that is not a path in this app.
  const search = route.useSearch()

  const { form, mutation, onSubmit } = useMutationForm<
    AuthenticationSessionSignInPayload,
    void,
    AuthenticationSessionSignInPayload
  >({
    validator: AuthenticationSessionSignInValidator,
    // Without this the fields are born `undefined`, and the input mounts uncontrolled
    // only to become controlled on the first keystroke.
    defaults: { email: '', password: '' },
    // The 401 arrives in `root` - the backend's channel for "the message belongs to the
    // form, not to a field", and it uses it because it does not reveal whether the
    // e-mail, the password, the inactive account or the archived one failed.
    fields: FIELDS,
    mutation: useAuthenticationSignInMutation,
    // The sign-in answers 204 and does not say who came in - whoever knows is
    // `GET /account`. Without invalidating, the cache still holds the absence of a session
    // from a second ago, and the dashboard guard would send back to the login.
    invalidate: [queryKeys.account.profile.all],
    // Signing in creates nothing: 5xx and network become a notice with "Tentar de novo".
    retry: 'sign-in-error',
    payload: (values) => values,
    async onSuccess() {
      // `href` and not `to`: the destination came from the URL as a string, and `to` is the field
      // typed against the route tree. It takes priority over the dashboard: whoever
      // was stopped midway goes back to where they were.
      if (search.redirect) {
        await router.navigate({ href: search.redirect })
        return
      }

      await router.navigate({ to: '/dashboard' })
    },
  })

  return (
    <AuthShell>
      <AuthShellAside>
        <AuthShellAsideBody>
          {/* The edition's logo plays the brand's role here: with both, the
              seal showed up repeated at different sizes. It leads to the site,
              as the brand used to. */}
          <Link to="/" aria-label={m.auth_back_to_site()}>
            <Picture
              src={logo512}
              alt={m.auth_logo_alt()}
              width={256}
              height={256}
              className="size-64"
              placement="lcp"
            />
          </Link>
          {/* The full name, and the same constant that the root `head`
              announces: the brand draws the acronym, and this is where it is spoken
              in full. */}
          <AuthShellTagline>{m.common_site_description()}</AuthShellTagline>
        </AuthShellAsideBody>
      </AuthShellAside>

      <AuthShellContent className="max-w-md">
        {/* `method="post"`: a click on "Entrar" before hydration becomes a native
            submit, and with GET the password would end up in the URL and the history. */}
        <form method="post" onSubmit={onSubmit} className="flex flex-col gap-6">
          <AuthShellHeader title={m.auth_sign_in_title()}>
            {m.auth_sign_in_description()}
          </AuthShellHeader>

          <FieldGroup>
            <AppField
              control={form.control}
              name="email"
              id="form-email"
              label={m.common_email()}
            >
              {({ field, control }) => (
                <Input
                  {...field}
                  {...control}
                  placeholder={m.auth_email_placeholder()}
                  type="email"
                  autoComplete="email"
                  className="bg-primary/5"
                />
              )}
            </AppField>

            <AppField
              control={form.control}
              name="password"
              id="form-password"
              label={m.common_password()}
            >
              {({ field, control }) => (
                <InputPassword
                  {...field}
                  {...control}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              )}
            </AppField>

            <AppFormRootError form={form} />

            <Field>
              <SubmitButton
                id="form-submit"
                className="w-full"
                isPending={mutation.isPending}
              >
                {m.auth_submit()}
              </SubmitButton>
            </Field>
          </FieldGroup>
        </form>
        {/*
          No "cadastre-se" footer: there is no public sign-up in this
          product. The account is born in `/administrator/users`, created by someone who is already
          inside, and the first administrator comes from the backend's `db:seed`.
        */}
      </AuthShellContent>
    </AuthShell>
  )
}
