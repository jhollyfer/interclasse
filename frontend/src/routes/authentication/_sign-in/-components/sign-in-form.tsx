import { getRouteApi, useRouter } from '@tanstack/react-router'
import type * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { vineResolver } from '@hookform/resolvers/vine'
import { toast } from 'sonner'

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { InputPassword } from '#/components/common/input-password'
import { SubmitButton } from '#/components/common/submit-button'
import { SITE_DESCRIPTION } from '#/lib/site'
import { useAuthenticationSignIn } from '#/integrations/tanstack-query/mutations'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { applyHTTPErrorToForm } from '#/lib/form-errors'
import { SessionSignInValidator } from '#/validators/authentication/sessions.validator'
import type { SessionSignInPayload } from '#/validators/authentication/sessions.validator'

import {
  AuthShell,
  AuthShellAside,
  AuthShellAsideBody,
  AuthShellBrand,
  AuthShellContent,
  AuthShellHeader,
  AuthShellTagline,
} from '../../-components/auth-shell'

const route = getRouteApi('/authentication/_sign-in/')

/**
 * Os campos que este formulário sabe destacar. Uma chave de `errors` fora
 * desta lista (o backend ganhou um campo, por exemplo) não some em silêncio:
 * vira mensagem do formulário.
 */
const FIELDS = ['email', 'password'] as const

export function SignInForm(): React.JSX.Element {
  const router = useRouter()
  const queryClient = useQueryClient()
  // Validado no layout pai (`authentication/layout.tsx`), que já recusou
  // qualquer destino que não seja um caminho deste app.
  const search = route.useSearch()

  const form = useForm<SessionSignInPayload>({
    resolver: vineResolver(SessionSignInValidator),
    // Sem isto os campos nascem `undefined`, e o input monta não controlado
    // para virar controlado na primeira tecla.
    defaultValues: {
      email: '',
      password: '',
    },
  })
  const mutation = useAuthenticationSignIn({
    onError(error, payload) {
      // O 401 chega em `root` - o canal do backend para "a mensagem é do
      // formulário, não de um campo", e ele o usa porque não revela se falhou
      // o e-mail, a senha, a conta inativa ou a arquivada. O 422 chega por
      // campo, vindo do VineJS pelo `toFieldErrors` do handler. O helper marca
      // os dois e devolve `false` quando não havia nada a marcar na tela.
      if (applyHTTPErrorToForm({ form, error, fields: FIELDS })) return

      // 5xx e rede: nada que o usuário possa corrigir no formulário. O toast
      // some em 4 segundos, então leva a ação junto - sem ela o usuário lê
      // "falhou" e fica sem o que fazer. `id` fixo para tentativas seguidas
      // substituírem o toast anterior em vez de empilharem.
      if (error.isServerError) {
        toast.error(error.message, {
          id: 'sign-in-error',
          action: {
            label: 'Tentar de novo',
            onClick: () => mutation.mutate(payload),
          },
        })
        return
      }

      // 4xx sem `errors`: `message` é o fallback para as rotas que ainda não
      // mandam `root`.
      form.setError('root', { message: error.message })
    },
    async onSuccess() {
      // O sign-in responde 204 e não diz quem entrou - quem sabe é o
      // `GET /account`. Sem invalidar, o cache desta mesma tela ainda guarda a
      // ausência de sessão de um segundo atrás, e o guard do painel a reusaria
      // para mandar de volta ao login.
      await queryClient.invalidateQueries({ queryKey: queryKeys.account.all })

      // `href` e não `to`: o destino veio da URL como string, e `to` é o campo
      // tipado contra a árvore de rotas - ele não aceita, e com razão. Tem
      // prioridade sobre o painel: quem foi barrado no meio volta para onde
      // estava, não para a tela inicial.
      if (search.redirect) {
        await router.navigate({ href: search.redirect })
        return
      }

      await router.navigate({ to: '/painel' })
    },
  })

  function onSubmit(payload: SessionSignInPayload): void {
    // Sem isto, a mensagem da tentativa anterior fica na tela durante a nova.
    form.clearErrors('root')
    mutation.mutate(payload)
  }

  return (
    <AuthShell>
      <AuthShellAside>
        <AuthShellAsideBody>
          <AuthShellBrand className="h-auto w-full max-w-[320px]" />
          {/* O nome por extenso, e a mesma constante que o `head` da raiz
              anuncia: a marca desenha a sigla, e é aqui que ela é dita
              inteira. Escrever a frase de novo criaria uma segunda versão do
              nome da associação para envelhecer sozinha. */}
          <AuthShellTagline>{SITE_DESCRIPTION}</AuthShellTagline>
        </AuthShellAsideBody>
      </AuthShellAside>

      <AuthShellContent className="max-w-md">
        {/* `method="post"`: clique em "Entrar" antes da hidratação vira envio
            nativo, e com GET a senha iria parar na URL e no histórico. */}
        <form
          method="post"
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-6"
        >
          <AuthShellHeader title="Entre na sua conta">
            Organização, professores conselheiros e representantes de turma.
          </AuthShellHeader>

          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-email">E-mail</FieldLabel>
                  <Input
                    {...field}
                    id="form-email"
                    aria-invalid={fieldState.invalid}
                    placeholder="voce@escola.com"
                    type="email"
                    autoComplete="email"
                    className="bg-primary/5"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-password">Senha</FieldLabel>
                  <InputPassword
                    {...field}
                    id="form-password"
                    aria-invalid={fieldState.invalid}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertDescription>
                  {form.formState.errors.root.message}
                </AlertDescription>
              </Alert>
            )}

            <Field>
              <SubmitButton
                id="form-submit"
                className="w-full"
                isPending={mutation.isPending}
              >
                Entrar
              </SubmitButton>
            </Field>
          </FieldGroup>
        </form>
        {/*
          Sem rodapé de "cadastre-se": não existe cadastro público neste
          produto. Conta de editor e de administrador nasce em
          `/administrator/users`, criada por quem já está dentro, e o primeiro
          administrador vem do `db:seed` do backend.
        */}
      </AuthShellContent>
    </AuthShell>
  )
}
