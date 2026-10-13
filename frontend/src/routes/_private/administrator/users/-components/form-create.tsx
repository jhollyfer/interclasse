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
import type * as React from 'react'

import { Card, CardContent } from '#/components/ui/card'
import { FieldDescription, FieldLegend, FieldSet } from '#/components/ui/field'
import { USER_FIELDS, USER_FORM_DEFAULTS, UserFormFields } from './form-fields'
import type { UserFormType } from './form-fields'
import { AdministratorUserCreateValidator } from '#/validators/administrator/users.validator'
import type { User } from '#/lib/validator'
import type { AdministratorUserCreatePayload } from '#/validators/administrator/users.validator'
import { useUserCreate } from '#/integrations/tanstack-query/mutations'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'

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
  const { form, onValid, shell } = useResourceForm<
    UserFormType,
    User,
    AdministratorUserCreatePayload
  >({
    formId: FORM_ID,
    validator: AdministratorUserCreateValidator,
    defaults: USER_FORM_DEFAULTS,
    fields: USER_FIELDS,
    mutation: useUserCreate,
    invalidate: queryKeys.users.all,
    backTo: '/administrator/users',
    success: (user) => `Conta de ${user.name} criada.`,
    // Com `retry`, ao contrário dos depoimentos: o `create.use-case.ts` recusa
    // e-mail de conta viva com `409 USER_ALREADY_EXISTS`, então reenviar depois
    // de um 5xx que possa ter gravado não cria uma segunda conta - esbarra no
    // 409 e diz isso.
    retry: 'user-create-error',
    payload: (values) => values,
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>Adicionar usuário</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={form.handleSubmit(onValid)}>
        <Card>
          <CardContent>
            <FieldSet>
              <FieldLegend>Identidade e acesso</FieldLegend>
              <UserFormFields form={form} idPrefix="user" />
              <FieldDescription>
                O e-mail de uma conta arquivada reativa aquela linha com os
                dados novos, em vez de criar outra.
              </FieldDescription>
            </FieldSet>
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
