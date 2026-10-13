import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'

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
import { UserUpdateValidator } from '#/validators/administrator/users.validator'
import type { IUser, Merge } from '#/lib/interfaces'
import type { UserUpdatePayload } from '#/validators/administrator/users.validator'
import { userQueryOptions } from '#/integrations/tanstack-query/queries'
import { useUserUpdate } from '#/integrations/tanstack-query/mutations'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'

import type { UserFormType } from './form-fields'
import { USER_FIELDS, UserFormFields } from './form-fields'

const route = getRouteApi('/_private/administrator/users/$id/edit')

const FORM_ID = 'user-update'

export function UserFormEdit(): React.JSX.Element {
  const { id } = route.useParams()

  // `useSuspenseQuery` e não `useQuery`: o `loader` da rota já garantiu o
  // registro com a mesma chave, e é ele quem trata o 404 e a falha.
  const { data: user } = useSuspenseQuery(userQueryOptions(id))

  // Os três parâmetros explícitos, como na criação. O payload é o da
  // **atualização** com o `id` no caminho, que é a forma que `useUserUpdate`
  // recebe.
  const { form, onSubmit, shell } = useResourceForm<
    UserFormType,
    IUser,
    Merge<UserUpdatePayload, { id: string }>
  >({
    formId: FORM_ID,
    /**
     * O validator de **atualização**, e é a exceção do painel - os outros seis
     * recursos validam a edição com o de criação, para o usuário não apagar um
     * campo obrigatório em silêncio.
     *
     * Aqui não dá: o campo de senha em branco significa "não trocar", e é o
     * `.optional()` que permite isso. Validar com o de criação exigiria uma
     * senha nova a cada troca de e-mail, e ninguém conseguiria editar uma conta
     * sem redefinir a senha dela. É o que a referência faz em
     * `administrators/-components/form-edit.tsx`, pelo mesmo motivo.
     */
    validator: UserUpdateValidator,
    // Sem `defaults`: o registro chega da query e `values` já é o objeto
    // completo. Não há estado inicial a declarar que `values` não sobrescreva
    // no render seguinte.
    //
    // `values`, e não um `useEffect` com `form.reset`: os dados da query chegam
    // depois do primeiro render, quando `defaultValues` já congelou.
    values: {
      name: user.name,
      email: user.email,
      password: '',
      passwordConfirmation: '',
      role: user.role,
      status: user.status,
      avatarId: user.avatarId,
    },
    fields: USER_FIELDS,
    mutation: useUserUpdate,
    invalidate: queryKeys.administrator.users.all,
    backTo: '/administrator/users/$id',
    backParams: { id },
    success: (updated) => `Conta de ${updated.name} salva.`,
    // Reenviar um `PUT` é seguro: ele escreve o mesmo registro, e não um novo.
    retry: 'user-update-error',
    /**
     * A senha em branco é **omitida** do corpo, e nunca enviada vazia.
     *
     * É a armadilha do recurso: o `requiredIfExists` e o `confirmed` do VineJS
     * olham a **chave**, não o valor. `password: ''` vira `null`, a chave
     * permanece, e a API passa a exigir a confirmação de quem não quis trocar
     * senha. A confirmação segue a senha - sozinha ela não tem o que confirmar.
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
        <FormShellTitle>Editar {user.name}</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={onSubmit}>
        <Card>
          <CardContent>
            <FieldSet>
              <FieldLegend>Identidade e acesso</FieldLegend>
              <UserFormFields
                form={form}
                idPrefix="edit-user"
                previewUrl={user.avatar?.url}
                passwordLabel="Nova senha (deixe em branco para manter)"
              />
              <FieldDescription>
                Trocar o e-mail ou a senha encerra as sessões abertas desta
                conta.
              </FieldDescription>
            </FieldSet>
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
