import { TRASHED_MODE } from '@interclasse/shared'
import { ArchiveIcon } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import * as React from 'react'

import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { m } from '#/paraglide/messages'

import { useTableContext } from './table-context'
import { InputSearch } from './table-search-input'

/**
 * The strip of controls between the header and the table: search, the resource's filters,
 * trash and the columns menu.
 *
 * Just a `ButtonGroup` with spacing - the screen decides what goes in and in what
 * order, and a resource-specific filter becomes one more child here.
 */
export function TableToolbar({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.JSX.Element {
  const { isPlaceholderData } = useTableContext('TableToolbar')

  return (
    // `div` with `gap`, and not `ButtonGroup`: the bar mixes search, filter and
    // actions, and they are independent pieces - the group glues its direct children, which is
    // the design of a segmented control, not of a bar.
    <div
      data-slot="table-toolbar"
      className="flex shrink-0 flex-wrap items-center gap-2"
    >
      {children}
      {isPlaceholderData && <Spinner className="opacity-50" />}
    </div>
  )
}

/**
 * The listing's search box.
 *
 * The applied term lives in the URL, not here: closing the screen, reloading or
 * sharing the link must bring the same list back.
 */
export function TableSearch({
  placeholder,
  help = m.table_search_help(),
}: Readonly<{
  placeholder: string
  help?: string
}>): React.JSX.Element {
  const { to, search } = useTableContext('TableSearch')
  const navigate = useNavigate()

  return (
    <InputSearch
      value={search.search}
      placeholder={placeholder}
      help={help}
      onSearch={(term) =>
        // `page` goes away too: page 3 of the previous filter almost never exists in the
        // new one, and the screen would open empty without saying why.
        void navigate({
          to,
          search: { ...search, search: term, page: undefined },
        })
      }
    />
  )
}

/** The button that toggles between the list and the trash. */
export function TableTrashToggle(): React.JSX.Element {
  const { to, search } = useTableContext('TableTrashToggle')
  const navigate = useNavigate()

  const isTrash = search.trashed === TRASHED_MODE.ONLY

  // No assignment ternary: the button turns on and off, and each state is a
  // line readable from top to bottom.
  let variant: 'default' | 'outline' = 'outline'
  if (isTrash) variant = 'default'

  let nextTrashed: typeof search.trashed = TRASHED_MODE.ONLY
  if (isTrash) nextTrashed = undefined

  return (
    <Button
      data-slot="table-trash-toggle"
      variant={variant}
      onClick={() =>
        void navigate({
          to,
          search: { ...search, trashed: nextTrashed, page: undefined },
        })
      }
    >
      <ArchiveIcon />
      {m.table_archived()}
    </Button>
  )
}
