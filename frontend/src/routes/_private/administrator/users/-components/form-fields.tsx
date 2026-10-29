import type * as React from 'react'
import type { DefaultValues, UseFormReturn } from 'react-hook-form'
import type { AdministratorUserUpdatePayload } from '@interclasse/shared'

import { FieldDescription, FieldGroup } from '#/components/ui/field'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
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
import { blankToUndefined } from '#/lib/form-values'
import { ACTIVE_STATUSES, ACTIVE_STATUS, USER_ROLES } from '#/lib/entity'
import {
  ACCOUNT_STATUS_LABELS,
  ACTIVE_STATUS_DOTS,
  USER_ROLE_LABELS,
  initials,
} from '#/lib/labels'

export type UserFormType = AdministratorUserUpdatePayload

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
  status: ACTIVE_STATUS.ACTIVE,
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

type UserFormFieldsProps = Readonly<{
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
}>

/**
 * Os campos da conta, compartilhados pela criação e pela edição. Cada tela é
 * dona da própria mutation e do próprio `onSuccess` - o que se repete é a
 * marcação, e é só ela que mora aqui, um nível acima das duas.
 *
 * Campo a campo é `AppField` (um `Controller`), nunca `register`: os componentes vêm do Base UI
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
  const name = form.watch('name')

  return (
    <FieldGroup>
      <AppFormRootError form={form} />

      <AppField
        control={form.control}
        name="avatarId"
        id={`${idPrefix}-avatar`}
        label="Foto (opcional)"
      >
        {({ field, control }) => (
          <ImageField
            id={control.id}
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
        )}
      </AppField>

      <AppField
        control={form.control}
        name="name"
        id={`${idPrefix}-name`}
        label="Nome"
      >
        {({ field, control }) => (
          <Input
            {...field}
            {...control}
            autoComplete="name"
            placeholder="Nome de quem usa a conta"
          />
        )}
      </AppField>

      <AppField
        control={form.control}
        name="email"
        id={`${idPrefix}-email`}
        label="E-mail"
      >
        {({ field, control }) => (
          <>
            <Input
              {...field}
              {...control}
              autoComplete="email"
              placeholder="pessoa@exemplo.org"
            />
            {/* O e-mail é `UNIQUE` global, e o use-case responde `409` quando
                já existe uma conta viva com ele. */}
            <FieldDescription>
              É por ele que a pessoa entra no painel.
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
            {/* A senha e a confirmação em branco são **ausentes**, e não `''`:
                o schema do `shared/` recusaria `''` por tamanho. O tipo do
                formulário é o da atualização (tudo opcional); na criação é o
                validator de criação que cobra os dois campos. */}
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
              De 8 a 32 caracteres, com minúscula, maiúscula, número e um
              caractere especial.
            </FieldDescription>
          </>
        )}
      </AppField>

      <AppField
        control={form.control}
        name="passwordConfirmation"
        id={`${idPrefix}-password-confirmation`}
        label="Confirme a senha"
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
        label="Papel"
      >
        {({ field, control }) => (
          <>
            <OptionCombobox
              {...control}
              // Sem `?? algum papel`: o campo não tem partida, e forçar uma
              // aqui gravaria em silêncio um papel que ninguém escolheu.
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={toOptions(USER_ROLES, USER_ROLE_LABELS)}
            />
            <FieldDescription>
              Administrador organiza os jogos. Conselheiro cuida dos alunos das
              próprias turmas. Representante monta a lista de atletas da turma.
            </FieldDescription>
          </>
        )}
      </AppField>

      <AppField
        control={form.control}
        name="status"
        id={`${idPrefix}-status`}
        label="Situação"
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
            {/* Inativa não é arquivada: a linha continua na listagem e o
                registro continua vivo, só o acesso é que fecha. */}
            <FieldDescription>
              Conta inativa não entra no painel, e continua na listagem.
            </FieldDescription>
          </>
        )}
      </AppField>
    </FieldGroup>
  )
}
