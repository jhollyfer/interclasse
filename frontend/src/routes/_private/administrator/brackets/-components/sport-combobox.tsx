import { useQuery } from '@tanstack/react-query'
import * as React from 'react'

import { OptionCombobox } from '#/components/common/option-combobox'
import { useSportsReadPaginatedInfinite } from '#/hooks/use-sports-read-paginated-infinite'
import { sportQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

type SportComboboxProps = Readonly<{
  id: string
  'aria-invalid': boolean
  value: string | undefined
  onChange: (value: string) => void
  onBlur: () => void
}>

/**
 * The sports as options, with server search (`frontend.md` §2.1): 20
 * per page and "Carregar mais" at the end. The already chosen sport enters the
 * list even outside the loaded page, read through the detail.
 */
export function SportCombobox({
  value,
  onChange,
  onBlur,
  ...control
}: SportComboboxProps): React.JSX.Element {
  const [search, setSearch] = React.useState('')
  const { sports, hasNextPage, fetchNextPage } =
    useSportsReadPaginatedInfinite(search)

  const selectedMissing =
    Boolean(value) && !sports.some((sport) => sport.id === value)
  const { data: selected } = useQuery({
    ...sportQueryOptions(value ?? ''),
    enabled: selectedMissing,
  })

  const options = sports.map((sport) => ({
    value: sport.id,
    label: sport.name,
  }))
  if (selectedMissing && selected)
    options.unshift({ value: selected.id, label: selected.name })

  return (
    <OptionCombobox
      {...control}
      value={value}
      onValueChange={onChange}
      onBlur={onBlur}
      options={options}
      onSearch={setSearch}
      hasMore={hasNextPage}
      onLoadMore={() => void fetchNextPage()}
    />
  )
}
