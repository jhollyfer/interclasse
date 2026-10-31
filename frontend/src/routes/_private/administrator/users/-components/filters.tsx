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
 * The screen's two filters, as `UserPaginateValidator`
 * accepts them: `?role=` separates who administers from who edits, `?status=` separates who
 * gets in from who was deactivated without being archived.
 *
 * `page: undefined` along with them: whoever was on page 3 of everything and filters by "Conselheiro"
 * almost never has a page 3 of the new subset, and the screen would open empty over a
 * result that exists.
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
        // No dot: a role is not a state, it is an assignment, and there is no `*_DOTS`
        // pair for it - the column `Badge`'s color already says what needs
        // to be said.
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
