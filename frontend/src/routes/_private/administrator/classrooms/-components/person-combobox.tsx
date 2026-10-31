import type { UserRole } from '@interclasse/shared'
import { useQuery } from '@tanstack/react-query'
import * as React from 'react'

import { OptionCombobox } from '#/components/common/option-combobox'
import { useUsersReadPaginatedInfinite } from '#/hooks/use-users-read-paginated-infinite'
import { userQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { m } from '#/paraglide/messages'

type PersonComboboxProps = Readonly<{
  /** The role of the accounts offered. */
  role: UserRole
  id: string
  'aria-invalid': boolean
  value: string | null | undefined
  onChange: (value: string | null) => void
  onBlur: () => void
}>

/**
 * The accounts of a role as options, with server search (`frontend.md`
 * §2.1): 20 per page, "Carregar mais" at the end and the typed term filtering on
 * the API. The already chosen account enters the list even outside the loaded page, read
 * through the detail, so the field does not empty when searching for another.
 */
export function PersonCombobox({
  role,
  value,
  onChange,
  onBlur,
  ...control
}: PersonComboboxProps): React.JSX.Element {
  const [search, setSearch] = React.useState('')
  const { users, hasNextPage, fetchNextPage } = useUsersReadPaginatedInfinite({
    role,
    search,
  })

  const selectedMissing =
    Boolean(value) && !users.some((user) => user.id === value)
  const { data: selected } = useQuery({
    ...userQueryOptions(value ?? ''),
    enabled: selectedMissing,
  })

  const options = [
    { value: '', label: m.admin_common_none() },
    ...users.map((user) => ({ value: user.id, label: user.name })),
  ]
  if (selectedMissing && selected)
    options.splice(1, 0, { value: selected.id, label: selected.name })

  return (
    <OptionCombobox
      {...control}
      value={value ?? ''}
      onValueChange={(next) => onChange(next || null)}
      onBlur={onBlur}
      options={options}
      onSearch={setSearch}
      hasMore={hasNextPage}
      onLoadMore={() => void fetchNextPage()}
    />
  )
}
