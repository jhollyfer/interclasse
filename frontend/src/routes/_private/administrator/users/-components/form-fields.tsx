import type * as React from 'react'
import { Controller } from 'react-hook-form'
import type { DefaultValues, UseFormReturn } from 'react-hook-form'

import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
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
import { ACTIVE_STATUSES, ActiveStatuses, USER_ROLES } from '#/lib/entity'
import {
  ACCOUNT_STATUS_LABELS,
  ACTIVE_STATUS_DOTS,
  USER_ROLE_LABELS,
  initials,
} from '#/lib/labels'
import type { UserCreatePayload } from '#/validators/administrator/users.validator'

export type UserFormType = UserCreatePayload

/**
 * O formulário vazio.
 *
 * `DefaultValues<>` e não o tipo inteiro porque **`role` não tem partida
 * honesta**: a coluna não tem `DEFAULT`, o papel é sempre explícito no
 * servidor, e escolher um aqui faria o formulário inventar uma partida que o
 * banco não daria ao mesmo payload sem o campo. O combobox nasce vazio e
 * mostra o `placeholder`; quem não escolher leva o 422 apontando o campo.
 *
 * `status` nasce `ACTIVE` porque é o `DEFAULT` da coluna - a conta nasce
 * podendo entrar, e desativar é edição.
 */
export const USER_FORM_DEFAULTS: DefaultValues<UserFormType> = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  status: ActiveStatuses.ACTIVE,
  avatarId: null,
}

/**
 * Os campos que a API sabe acusar. Fora desta lista, o erro vira `root`.
 *
 * `passwordConfirmation` está aqui porque é dele que vem o erro da regra
 * `confirmed()`: o VineJS reporta a divergência **na confirmação**, e sem a
 * chave a mensagem cairia no rodapé em vez de apontar o campo.
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

type UserFormFieldsProps = {
  form: UseFormReturn<UserFormType>
  /** Prefixo dos `id`, para o mesmo formulário poder aparecer duas vezes na página. */
  idPrefix: string
  /**
   * A URL da foto já gravada. Prop e não slot - é dado do registro, não
   * marcação, e só a edição tem o que passar aqui.
   */
  previewUrl?: string | null
  /**
   * O rótulo do campo de senha.
   *
   * Na criação a senha é obrigatória; na edição, em branco significa "não
   * trocar". É a única frase que difere entre as duas telas, e um slot inteiro
   * para ela seria mais peça do que texto.
   */
  passwordLabel?: string
}

/**
 * Os campos da conta, compartilhados pela criação e pela edição. Cada tela é
 * dona da própria mutation e do próprio `onSuccess` - o que se repete é a
 * marcação, e é só ela que mora aqui, um nível acima das duas.
 *
 * Campo a campo é `Controller`, nunca `register`: os componentes vêm do Base UI
 * e não expõem o `<input>` para receber `ref`.
 *
 * A senha atual não aparece: `currentPassword` é exigência de `PUT /account`,
 * onde quem troca é o dono da conta e precisa provar identidade. Aqui quem
 * troca é o administrador, sobre a conta de outra pessoa - a senha atual dela
 * ele não sabe, e exigi-la travaria a redefinição de quem perdeu o acesso.
 */
export function UserFormFields({
  form,
  idPrefix,
  previewUrl,
  passwordLabel = 'Senha',
}: UserFormFieldsProps): React.JSX.Element {
  // Desestruturado no corpo do render, e não dentro de callback: `formState` é
  // um Proxy, e ler dentro de um `onClick` não assina nada - o valor chega
  // velho e o componente não re-renderiza quando ele muda.
  const { errors } = form.formState
  const name = form.watch('name')

  return (
    <FieldGroup>
      {errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}

      <Controller
        name="avatarId"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-avatar`}>
              Foto (opcional)
            </FieldLabel>
            <ImageField
              id={`${idPrefix}-avatar`}
              value={field.value ?? null}
              onValueChange={field.onChange}
              previewUrl={previewUrl}
            >
              {/* Sem foto e sem nome, o espaço reservado fica vazio, e é o que
                  se quer: `initials('')` é `''` e o `AvatarFallback` sabe ficar
                  em branco. */}
              <ImageFieldPreview alt="Foto da conta">
                {initials(name)}
              </ImageFieldPreview>
              <ImageFieldContent>
                <ImageFieldActions>
                  <ImageFieldUpload>Enviar foto</ImageFieldUpload>
                  <ImageFieldRemove />
                </ImageFieldActions>
                <ImageFieldDescription />
              </ImageFieldContent>
            </ImageField>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-name`}>Nome</FieldLabel>
            <Input
              {...field}
              id={`${idPrefix}-name`}
              // `aria-invalid` vai à mão: `Field` e `FieldError` dão o
              // `aria-describedby` de graça, este não.
              aria-invalid={fieldState.invalid}
              autoComplete="name"
              placeholder="Nome de quem usa a conta"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="email"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-email`}>E-mail</FieldLabel>
            <Input
              {...field}
              id={`${idPrefix}-email`}
              aria-invalid={fieldState.invalid}
              autoComplete="email"
              placeholder="pessoa@exemplo.org"
            />
            {/* O e-mail é `UNIQUE` global, e o use-case responde `409` quando
                já existe uma conta viva com ele. */}
            <FieldDescription>
              É por ele que a pessoa entra no painel.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="password"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-password`}>
              {passwordLabel}
            </FieldLabel>
            {/* Sem `?? ''`: o tipo do formulário é o payload de **criação**, onde
                a senha e a confirmação são obrigatórias. Na edição as duas
                começam `''` e em branco significa "não trocar" - quem descarta
                as chaves antes de enviar é o `payload` de `form-edit.tsx`. */}
            <InputPassword
              {...field}
              id={`${idPrefix}-password`}
              aria-invalid={fieldState.invalid}
              autoComplete="new-password"
            />
            <FieldDescription>
              De 8 a 32 caracteres, com minúscula, maiúscula, número e um
              caractere especial.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="passwordConfirmation"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-password-confirmation`}>
              Confirme a senha
            </FieldLabel>
            <InputPassword
              {...field}
              id={`${idPrefix}-password-confirmation`}
              aria-invalid={fieldState.invalid}
              autoComplete="new-password"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="role"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-role`}>Papel</FieldLabel>
            <OptionCombobox
              // Sem `?? algum papel`: o campo não tem partida, e forçar uma
              // aqui gravaria em silêncio um papel que ninguém escolheu.
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              id={`${idPrefix}-role`}
              aria-invalid={fieldState.invalid}
              options={toOptions(USER_ROLES, USER_ROLE_LABELS)}
            />
            <FieldDescription>
              Administrador organiza os jogos. Conselheiro cuida dos alunos das
              próprias turmas. Representante monta a lista de atletas da turma.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="status"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-status`}>Situação</FieldLabel>
            <OptionCombobox
              value={field.value ?? ActiveStatuses.ACTIVE}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              id={`${idPrefix}-status`}
              aria-invalid={fieldState.invalid}
              options={toOptions(
                ACTIVE_STATUSES,
                ACCOUNT_STATUS_LABELS,
                ACTIVE_STATUS_DOTS,
              )}
            />
            {/* Inativa não é arquivada: a linha continua na listagem e o
                registro continua vivo, só o acesso é que fecha. */}
            <FieldDescription>
              Conta inativa não entra no painel, e continua na listagem.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  )
}
