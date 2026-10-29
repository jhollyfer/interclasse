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
import { useAccountUpdate } from '#/integrations/tanstack-query/mutations/account'
import { accountQueryOptions } from '#/integrations/tanstack-query/queries/account'
import type { IUser } from '#/lib/interfaces'
import { initials } from '#/lib/labels'
import { ProfileUpdateValidator } from '#/validators/account/profile.validator'
import type { ProfileUpdatePayload } from '#/validators/account/profile.validator'

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
 * As três chaves de senha **saem** do corpo quando não há troca, e é a
 * armadilha desta tela: o `requiredIfExists` do backend olha a **chave**, não
 * o valor. `password: ''` vira `null` e ainda conta como presente, e a API
 * passaria a exigir `currentPassword` de quem não quis trocar senha.
 */
function toPayload(values: ProfileUpdatePayload): ProfileUpdatePayload {
  const { password, passwordConfirmation, currentPassword, ...rest } = values

  if (!password) return rest

  return { ...rest, password, passwordConfirmation, currentPassword }
}

/**
 * A edição da própria conta. Quem só quer conferir os dados fica na ficha, em
 * `-components/profile.tsx`.
 *
 * O `onSuccess` é próprio: trocar e-mail ou senha derruba **todas** as sessões
 * no servidor, inclusive esta, e o lugar certo depois disso é o login, não a
 * ficha.
 */
export function ProfileFormEdit(): React.JSX.Element {
  const router = useRouter()

  // O `loader` da rota já garantiu o dado; aqui é leitura de cache.
  const { data: account } = useSuspenseQuery(accountQueryOptions())

  const { form, onSubmit, shell } = useResourceForm<
    ProfileUpdatePayload,
    IUser,
    ProfileUpdatePayload
  >({
    formId: 'profile',
    validator: ProfileUpdateValidator,
    // Sem isto os campos nascem `undefined`, e o input monta não controlado
    // para virar controlado na primeira tecla.
    defaults: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      currentPassword: '',
      avatarId: null,
    },
    values: {
      name: account.name,
      email: account.email,
      password: '',
      passwordConfirmation: '',
      currentPassword: '',
      avatarId: account.avatarId,
    },
    fields: FIELDS,
    mutation: useAccountUpdate,
    // Por prefixo: o guard do layout e o cabeçalho leem a mesma chave.
    invalidate: queryKeys.account.profile.all,
    backTo: '/profile',
    // Edição sempre pode reenviar: o `PUT` escreve o mesmo estado final.
    retry: 'account-update-error',
    payload: toPayload,
    async onSuccess(updated, payload) {
      // O redirecionamento para o login não é efeito colateral a evitar: é o
      // que já aconteceu do lado do servidor.
      if (payload.email !== account.email || payload.password) {
        toast.success('Acesso atualizado. Entre de novo.')
        await router.navigate({ to: '/authentication' })
        return
      }

      // Volta para a ficha: é lá que o nome e o e-mail novos aparecem para
      // conferência.
      toast.success(`${updated.name} salvo.`)
      await router.navigate({ to: '/profile' })
    },
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>Editar perfil</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={onSubmit}>
        <FormShellCard>
          <FieldSet>
            <FieldLegend>Identidade</FieldLegend>

            <AppField
              control={form.control}
              name="avatarId"
              id="account-avatar"
              label="Foto"
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
                      <ImageFieldUpload>Enviar foto</ImageFieldUpload>
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
              label="Nome"
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
              label="E-mail"
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
            <FieldLegend>Senha</FieldLegend>

            <AppField
              control={form.control}
              name="password"
              id="account-password"
              label="Nova senha (deixe em branco para manter)"
            >
              {({ field, control }) => (
                <InputPassword
                  {...field}
                  {...control}
                  value={field.value ?? ''}
                  autoComplete="new-password"
                />
              )}
            </AppField>

            <AppField
              control={form.control}
              name="passwordConfirmation"
              id="account-password-confirmation"
              label="Confirme a nova senha"
            >
              {({ field, control }) => (
                <InputPassword
                  {...field}
                  {...control}
                  value={field.value ?? ''}
                  autoComplete="new-password"
                />
              )}
            </AppField>

            <AppField
              control={form.control}
              name="currentPassword"
              id="account-current-password"
              label="Senha atual"
            >
              {({ field, control }) => (
                <>
                  <InputPassword
                    {...field}
                    {...control}
                    value={field.value ?? ''}
                    autoComplete="current-password"
                  />
                  {/* A regra é do validator - `requiredIfExists('password')` -,
                      e o texto está aqui para quem lê antes de digitar. */}
                  <FieldDescription>
                    Exigida só para trocar a senha. É prova de identidade: quem
                    sequestra uma sessão tem o cookie, mas não sabe a senha.
                  </FieldDescription>
                </>
              )}
            </AppField>

            <FieldDescription>
              Trocar o e-mail ou a senha encerra todas as sessões desta conta, e
              você precisará entrar de novo.
            </FieldDescription>
          </FieldSet>

          <AppFormRootError form={form} />
        </FormShellCard>
      </FormShellContent>
    </FormShell>
  )
}
