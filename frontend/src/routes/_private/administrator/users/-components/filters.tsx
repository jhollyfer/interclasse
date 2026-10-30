import { ACTIVE_STATUSES, USER_ROLES } from '@interclasse/shared'
import { useNavigate } from '@tanstack/react-router'
import type * as React from 'react'

import { OptionCombobox, toOptions } from '#/components/common/option-combobox'
import {
  ACCOUNT_STATUS_LABELS,
  ACTIVE_STATUS_DOTS,
  USER_ROLE_LABELS,
} from '#/lib/labels'
import type { UserListSearch } from '#/lib/list-search'
import { m } from '#/paraglide/messages'

/**
 * Os dois recortes da tela, como o `UserPaginateValidator`
 * aceita: `?role=` separa quem administra de quem edita, `?status=` separa quem
 * entra de quem foi desativado sem ser arquivado.
 *
 * `page: undefined` junto: quem estava na página 3 de tudo e filtra por "Conselheiro"
 * quase nunca tem página 3 do recorte novo, e a tela abriria vazia sobre um
 * resultado que existe.
 */
export function UserFilters({
  search,
}: Readonly<{
  search: UserListSearch
}>): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <>
      <OptionCombobox
        aria-label={m.admin_common_role()}
        className="w-full sm:w-40"
        value={search.role ?? ''}
        clearable
        onValueChange={(value) =>
          void navigate({
            to: '/administrator/users',
            search: { ...search, role: value || undefined, page: undefined },
          })
        }
        // Sem bolinha: papel não é estado, é atribuição, e não há um par
        // `*_DOTS` para ele - a cor do `Badge` da coluna já diz o que precisa
        // ser dito.
        options={toOptions(['', ...USER_ROLES], {
          ...USER_ROLE_LABELS,
          '': m.admin_users_all_roles(),
        })}
      />

      <OptionCombobox
        aria-label={m.admin_common_status()}
        className="w-full sm:w-40"
        value={search.status ?? ''}
        clearable
        onValueChange={(value) =>
          void navigate({
            to: '/administrator/users',
            search: { ...search, status: value || undefined, page: undefined },
          })
        }
        options={toOptions(
          ['', ...ACTIVE_STATUSES],
          { ...ACCOUNT_STATUS_LABELS, '': m.admin_users_all_statuses() },
          ACTIVE_STATUS_DOTS,
        )}
      />
    </>
  )
}
