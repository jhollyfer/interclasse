import type * as React from 'react'
import { AdministratorUserCreateValidator } from '@interclasse/shared'
import type {
  AdministratorUserCreatePayload,
  AdministratorUserShowResponse,
} from '@interclasse/shared'

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
import { useUserCreate } from '#/integrations/tanstack-query/mutations/administrator'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'
import { m } from '#/paraglide/messages'

import type { UserFormType } from './form-fields'
import { USER_FIELDS, USER_FORM_DEFAULTS, UserFormFields } from './form-fields'

const FORM_ID = 'user-create'

/**
 * O único caminho de criação de conta na API: não há cadastro público, e o
 * primeiro administrador vem do seeder. O módulo inteiro é de `ADMINISTRATOR`,
 * - quem não tem o papel leva `403` do backend, que é
 * onde a autorização de verdade mora.
 */
export function UserFormCreate(): React.JSX.Element {
  // Os três parâmetros explícitos, e não inferidos como no molde de
  // depoimento: `USER_FORM_DEFAULTS` é `DefaultValues<>`, que é um parcial
  // profundo, e o compilador não tem como voltar dele ao tipo do formulário.
  const { form, onSubmit, shell } = useResourceForm<
    UserFormType,
    AdministratorUserShowResponse,
    AdministratorUserCreatePayload
  >({
    formId: FORM_ID,
    validator: AdministratorUserCreateValidator,
    defaults: USER_FORM_DEFAULTS,
    fields: USER_FIELDS,
    mutation: useUserCreate,
    invalidate: queryKeys.administrator.users.all,
    backTo: '/administrator/users',
    success: (user) => m.admin_users_created_ok({ name: user.name }),
    // Com `retry`, ao contrário dos depoimentos: o `create.use-case.ts` recusa
    // e-mail de conta viva com `409 USER_ALREADY_EXISTS`, então reenviar depois
    // de um 5xx que possa ter gravado não cria uma segunda conta - esbarra no
    // 409 e diz isso.
    retry: 'user-create-error',
    // O resolver já validou; o `parse` devolve o tipo de criação, em que o
    // formulário (o da atualização, tudo opcional) não prova nome, e-mail e papel.
    payload: (values) => AdministratorUserCreateValidator.parse(values),
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>{m.admin_users_create()}</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={onSubmit}>
        <Card>
          <CardContent>
            <FieldSet>
              <FieldLegend>{m.admin_users_identity_legend()}</FieldLegend>
              <UserFormFields form={form} idPrefix="user" />
              <FieldDescription>{m.admin_users_create_note()}</FieldDescription>
            </FieldSet>
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
