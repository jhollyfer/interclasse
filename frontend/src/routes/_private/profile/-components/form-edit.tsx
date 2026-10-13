import type * as React from 'react'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { vineResolver } from '@hookform/resolvers/vine'
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
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useAccountUpdate } from '#/integrations/tanstack-query/mutations'
import { accountQueryOptions } from '#/integrations/tanstack-query/queries'
import { applyMutationError } from '#/lib/form-errors'
import { initials } from '#/lib/labels'
import { ProfileUpdateValidator } from '#/validators/account/profile.validator'
import type { ProfileUpdatePayload } from '#/validators/account/profile.validator'

const FORM_ID = 'profile'

/**
 * Os campos que o backend pode acusar.
 *
 * `currentPassword` está na lista porque é dele que vem o
 * `422 CURRENT_PASSWORD_INVALID`: o use-case devolve
 * `errors: { currentPassword: 'Senha atual inválida' }`, e sem a chave aqui a
 * mensagem cairia no rodapé do formulário em vez de apontar o campo.
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
 * A edição da própria conta. Quem só quer conferir os dados fica na ficha, em
 * `-components/profile.tsx`.
 *
 * Escrita à mão, e não sobre o `useResourceForm`: o `onSuccess` daquele hook
 * sempre volta para `backTo`, e aqui o destino depende do que mudou - trocar
 * e-mail ou senha derruba **todas** as sessões no servidor, inclusive esta, e o
 * lugar certo depois disso é o login.
 */
export function ProfileFormEdit(): React.JSX.Element {
  const router = useRouter()
  const queryClient = useQueryClient()

  // O `loader` da rota já garantiu o dado; aqui é leitura de cache.
  const { data: account } = useSuspenseQuery(accountQueryOptions())

  const form = useForm<ProfileUpdatePayload>({
    resolver: vineResolver(ProfileUpdateValidator),
    mode: 'onTouched',
    // Sem isto os campos nascem `undefined`, e o input monta não controlado
    // para virar controlado na primeira tecla.
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      currentPassword: '',
      avatarId: null,
    },
    // `values`, e não `defaultValues`: a conta chega depois do primeiro render,
    // quando `defaultValues` já congelou.
    values: {
      name: account.name,
      email: account.email,
      password: '',
      passwordConfirmation: '',
      currentPassword: '',
      avatarId: account.avatarId,
    },
  })

  const mutation = useAccountUpdate({
    onError: (error, payload) =>
      applyMutationError({
        form,
        error,
        fields: FIELDS,
        // Edição sempre pode reenviar: o `PUT` escreve o mesmo estado final e
        // não cria nada.
        retry: {
          id: 'account-update-error',
          onClick: () => mutation.mutate(payload),
        },
      }),
    async onSuccess(updated, payload) {
      // Por prefixo: o guard do layout e o cabeçalho leem a mesma chave.
      await queryClient.invalidateQueries({ queryKey: queryKeys.account.all })

      // Trocar e-mail ou senha derruba **todas** as sessões, inclusive esta. O
      // redirecionamento para o login não é efeito colateral a evitar: é o que
      // já aconteceu do lado do servidor, e mandar a pessoa de volta ao painel
      // só a faria descobrir isso no próximo 401.
      if (payload.email !== account.email || payload.password) {
        toast.success('Acesso atualizado. Entre de novo.')
        router.navigate({ to: '/authentication' })
        return
      }

      // Volta para a ficha, e não para o painel: quem salvou veio de lá, e é lá
      // que o nome e o e-mail novos aparecem para conferência.
      toast.success(`${updated.name} salvo.`)
      router.navigate({ to: '/profile' })
    },
  })

  function onValid(values: ProfileUpdatePayload): void {
    // Sem isto, a mensagem da tentativa anterior fica na tela durante a nova.
    form.clearErrors('root')

    // As três chaves de senha **saem** do corpo quando não há troca, e é a
    // armadilha desta tela: o `requiredIfExists` do backend olha a **chave**,
    // não o valor. `password: ''` vira `null` e ainda conta como presente, e a
    // API passaria a exigir `currentPassword` de quem não quis trocar senha.
    const { password, passwordConfirmation, currentPassword, ...rest } = values

    const body: ProfileUpdatePayload = { ...rest }

    if (password) {
      body.password = password
      body.passwordConfirmation = passwordConfirmation
      body.currentPassword = currentPassword
    }

    mutation.mutate(body)
  }

  return (
    <FormShell
      formId={FORM_ID}
      backTo="/profile"
      isPending={mutation.isPending}
    >
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>Editar perfil</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={form.handleSubmit(onValid)}>
        <FormShellCard>
          <FieldSet>
            <FieldLegend>Identidade</FieldLegend>

            <Controller
              name="avatarId"
              control={form.control}
              render={({ field }) => (
                <ImageField
                  id="account-avatar"
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                  previewUrl={account.avatar?.url}
                >
                  <ImageFieldPreview alt={account.name}>
                    {initials(account.name)}
                  </ImageFieldPreview>
                  <ImageFieldContent>
                    <ImageFieldActions>
                      <ImageFieldUpload>Enviar foto</ImageFieldUpload>
                      <ImageFieldRemove />
                    </ImageFieldActions>
                    <ImageFieldDescription />
                  </ImageFieldContent>
                </ImageField>
              )}
            />

            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="account-name">Nome</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    id="account-name"
                    aria-invalid={fieldState.invalid}
                    autoComplete="name"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="account-email">E-mail</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    id="account-email"
                    aria-invalid={fieldState.invalid}
                    autoComplete="email"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldSet>

          <FieldSet>
            <FieldLegend>Senha</FieldLegend>

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="account-password">
                    Nova senha (deixe em branco para manter)
                  </FieldLabel>
                  <InputPassword
                    {...field}
                    value={field.value ?? ''}
                    id="account-password"
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="passwordConfirmation"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="account-password-confirmation">
                    Confirme a nova senha
                  </FieldLabel>
                  <InputPassword
                    {...field}
                    value={field.value ?? ''}
                    id="account-password-confirmation"
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="currentPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="account-current-password">
                    Senha atual
                  </FieldLabel>
                  <InputPassword
                    {...field}
                    value={field.value ?? ''}
                    id="account-current-password"
                    aria-invalid={fieldState.invalid}
                    autoComplete="current-password"
                  />
                  {/* A regra é do validator - `requiredIfExists('password')` -,
                      e o texto está aqui para quem lê antes de digitar. Sem
                      ele, a exigência só aparece como erro depois do envio. */}
                  <FieldDescription>
                    Exigida só para trocar a senha. É prova de identidade: quem
                    sequestra uma sessão tem o cookie, mas não sabe a senha.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <FieldDescription>
              Trocar o e-mail ou a senha encerra todas as sessões desta conta, e
              você precisará entrar de novo.
            </FieldDescription>
          </FieldSet>

          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}
        </FormShellCard>
      </FormShellContent>
    </FormShell>
  )
}
