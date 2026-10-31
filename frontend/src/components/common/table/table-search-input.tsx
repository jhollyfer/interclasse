import { MagnifyingGlassIcon, QuestionIcon, XIcon } from '@phosphor-icons/react'
import * as React from 'react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { m } from '#/paraglide/messages'

type InputSearchProps = Readonly<{
  /** The **applied** term, which lives in the URL. */
  value: string | undefined
  /** Called when the search is applied or cleared. `undefined` clears. */
  onSearch: (term: string | undefined) => void
  placeholder?: string
  /** The help balloon's text. When absent, the help button does not appear. */
  help?: string
}>

/**
 * The listings' search box.
 *
 * **Search by action, not by interval.** The field used to fire on its own 300ms
 * after the last key; now what applies it is Enter or the magnifier. The practical
 * difference is one request per search instead of one per typing pause, and
 * one history entry per search instead of one per pause - the browser's back button
 * goes back one search, not half a word.
 *
 * What is typed is field draft and lives here; what is applied lives
 * in the URL. The two meet again on render: when the URL's term changes
 * from outside - a "limpar filtros", the back button -, the box follows.
 *
 * The exception is emptying the field by hand, which clears at once. Without that the person
 * would erase the text, press nothing, and keep seeing the list filtered
 * by a term that is no longer written anywhere.
 *
 * Whoever navigates is the caller, and not this component: the routes are typed, and a
 * `useSearch({ strict: false })` with `@ts-ignore` would throw that away.
 */
export function InputSearch({
  value,
  onSearch,
  placeholder = m.table_search_placeholder(),
  help,
}: InputSearchProps): React.JSX.Element {
  const [term, setTerm] = React.useState(value ?? '')
  const [applied, setApplied] = React.useState(value)

  // The applied term seeds the field, and the adjustment happens **during render**
  // instead of in an effect. The effect ran one render after the navigation, and whatever
  // was typed in that interval was erased when it arrived.
  if (applied !== value) {
    setApplied(value)
    setTerm(value ?? '')
  }

  function change(next: string): void {
    setTerm(next)

    // Field emptied with an applied term: clears without waiting for an action.
    if (next.trim().length === 0 && value) onSearch(undefined)
  }

  function apply(): void {
    const trimmed = term.trim()

    if (trimmed.length === 0) return
    if (trimmed === value) return

    onSearch(trimmed)
  }

  function clear(): void {
    setTerm('')
    onSearch(undefined)
  }

  const hasTerm = term.length > 0

  return (
    <InputGroup data-slot="table-search-input" className="w-full sm:w-72">
      {help && (
        <InputGroupAddon>
          <Tooltip>
            <TooltipTrigger
              render={
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  aria-label={m.table_help()}
                >
                  <QuestionIcon />
                </InputGroupButton>
              }
            />
            <TooltipContent>{help}</TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      )}

      <InputGroupInput
        data-test-id="search-input"
        // The placeholder disappears on typing and does not name the field.
        aria-label={m.table_search_label()}
        value={term}
        placeholder={placeholder}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return

          event.preventDefault()
          apply()
        }}
      />

      <InputGroupAddon align="inline-end">
        {hasTerm && (
          <InputGroupButton
            data-test-id="search-clear"
            variant="ghost"
            size="icon-xs"
            aria-label={m.table_search_clear()}
            onClick={clear}
          >
            <XIcon />
          </InputGroupButton>
        )}

        {!hasTerm && (
          <InputGroupButton
            data-test-id="search-submit"
            variant="ghost"
            size="icon-xs"
            aria-label={m.table_search_submit()}
            onClick={apply}
          >
            <MagnifyingGlassIcon />
          </InputGroupButton>
        )}
      </InputGroupAddon>
    </InputGroup>
  )
}
