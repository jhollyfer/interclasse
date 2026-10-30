import { Link, getRouteApi, useRouter } from '@tanstack/react-router'
import type * as React from 'react'
import { AuthenticationSessionSignInValidator } from '@interclasse/shared'
import type { AuthenticationSessionSignInPayload } from '@interclasse/shared'

import { InputPassword } from '#/components/common/input-password'
import { SubmitButton } from '#/components/common/submit-button'
import { Field, FieldGroup } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useAuthenticationSignIn } from '#/integrations/tanstack-query/mutations/authentication'
import { SITE_DESCRIPTION } from '#/lib/constant'
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
 * Os campos que este formulário sabe destacar. Uma chave de `errors` fora
 * desta lista (o backend ganhou um campo, por exemplo) não some em silêncio:
 * vira mensagem do formulário.
 */
const FIELDS = ['email', 'password'] as const

export function SignInForm(): React.JSX.Element {
  const router = useRouter()
  // Validado no layout pai (`_authentication/layout.tsx`), que já recusou
  // qualquer destino que não seja um caminho deste app.
  const search = route.useSearch()

  const { form, mutation, onSubmit } = useMutationForm<
    AuthenticationSessionSignInPayload,
    void,
    AuthenticationSessionSignInPayload
  >({
    validator: AuthenticationSessionSignInValidator,
    // Sem isto os campos nascem `undefined`, e o input monta não controlado
    // para virar controlado na primeira tecla.
    defaults: { email: '', password: '' },
    // O 401 chega em `root` - o canal do backend para "a mensagem é do
    // formulário, não de um campo", e ele o usa porque não revela se falhou o
    // e-mail, a senha, a conta inativa ou a arquivada.
    fields: FIELDS,
    mutation: useAuthenticationSignIn,
    // O sign-in responde 204 e não diz quem entrou - quem sabe é o
    // `GET /account`. Sem invalidar, o cache ainda guarda a ausência de sessão
    // de um segundo atrás, e o guard do painel mandaria de volta ao login.
    invalidate: [queryKeys.account.profile.all],
    // Entrar não cria nada: 5xx e rede viram aviso com "Tentar de novo".
    retry: 'sign-in-error',
    payload: (values) => values,
    async onSuccess() {
      // `href` e não `to`: o destino veio da URL como string, e `to` é o campo
      // tipado contra a árvore de rotas. Tem prioridade sobre o painel: quem
      // foi barrado no meio volta para onde estava.
      if (search.redirect) {
        await router.navigate({ href: search.redirect })
        return
      }

      await router.navigate({ to: '/painel' })
    },
  })

  return (
    <AuthShell>
      <AuthShellAside>
        <AuthShellAsideBody>
          {/* A logo da edição faz o papel da marca aqui: com as duas, o
              selo aparecia repetido em tamanhos diferentes. Leva ao site,
              como a marca levava. */}
          <Link to="/" aria-label={m.auth_back_to_site()}>
            <img
              src="/logo-512.png"
              alt={m.auth_logo_alt()}
              width={256}
              height={256}
              className="size-64"
            />
          </Link>
          {/* O nome por extenso, e a mesma constante que o `head` da raiz
              anuncia: a marca desenha a sigla, e é aqui que ela é dita
              inteira. */}
          <AuthShellTagline>{SITE_DESCRIPTION()}</AuthShellTagline>
        </AuthShellAsideBody>
      </AuthShellAside>

      <AuthShellContent className="max-w-md">
        {/* `method="post"`: clique em "Entrar" antes da hidratação vira envio
            nativo, e com GET a senha iria parar na URL e no histórico. */}
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
          Sem rodapé de "cadastre-se": não existe cadastro público neste
          produto. A conta nasce em `/administrator/users`, criada por quem já
          está dentro, e o primeiro administrador vem do `db:seed` do backend.
        */}
      </AuthShellContent>
    </AuthShell>
  )
}
