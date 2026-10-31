import type * as React from 'react'

import { Button } from '#/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '#/components/ui/combobox'
import { InputGroupAddon } from '#/components/ui/input-group'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

export type OptionComboboxItem = {
  value: string
  label: string
  /** The color class of the state dot, when the field has one. */
  dot?: string
}

type OptionComboboxProps = Readonly<{
  options: ReadonlyArray<OptionComboboxItem>
  /** The chosen value. `''` means "nothing chosen", as in the rest of the forms. */
  value: string | null | undefined
  onValueChange: (value: string) => void
  /** Goes on the search field: the forms here validate on `onTouched`. */
  onBlur?: () => void
  id?: string
  placeholder?: string
  disabled?: boolean
  /** Shows the clearing ×. On in the filter, off in the required field. */
  clearable?: boolean
  /** An icon before the value, in the same place as the state dot. */
  icon?: React.ReactNode
  'aria-invalid'?: boolean
  'aria-label'?: string
  className?: string
  /**
   * Turns on server search: what is typed goes up through here and the `options`
   * list already comes filtered, so the client filter is turned off.
   */
  onSearch?: (term: string) => void
  /** There are more pages on the server: shows "Carregar mais" at the end of the list. */
  hasMore?: boolean
  onLoadMore?: () => void
}>

/**
 * The field for choosing a value from a closed list.
 *
 * One piece for the two forms that exist on the dashboard - the enum with a label
 * map (status, category, role) and the already loaded entity list (album,
 * file) -, because both become the same `{ value, label }` and both
 * trip over the same two things:
 *
 * **`onBlur` does not go on the root.** React Hook Form's `{...field}` does not work
 * here: `onBlur` has to go on the search field, and `mode: 'onTouched'` depends on it
 * to mark the field as touched. Spreading `field` on the `Combobox` root would lose the
 * event silently, and the field's error would only show up on submit.
 *
 * **`null` is not `''`.** Base UI uses `null` for "nothing chosen"; the forms
 * and filters store `''`. The conversion at both ends lives here, and is not
 * repeated on every screen.
 *
 * The color dot is an `InputGroupAddon`, and not a `span` positioned on top:
 * that is how it was in the `NativeSelect` this piece replaced, and with it went
 * a `[&>select]:pl-6` to make room in the right place.
 */
export function OptionCombobox({
  options,
  value,
  onValueChange,
  onBlur,
  id,
  placeholder = m.common_select_placeholder(),
  disabled,
  clearable = false,
  icon,
  'aria-invalid': invalid,
  'aria-label': ariaLabel,
  className,
  onSearch,
  hasMore = false,
  onLoadMore,
}: OptionComboboxProps): React.JSX.Element {
  // No `useMemo`: the React Compiler is on (`vite.config.ts`), and a
  // `find` over an enum's option list is not the kind of cost that
  // justifies writing the dependency by hand.
  const selected = options.find((option) => option.value === value) ?? null

  let filter: null | undefined = undefined
  if (onSearch) filter = null

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(option: OptionComboboxItem | null) =>
        onValueChange(option?.value ?? '')
      }
      itemToStringLabel={(option: OptionComboboxItem) => option.label}
      // Server search: the list already arrives filtered, and filtering again on the
      // client would hide what the server found by another field.
      filter={filter}
      onInputValueChange={(term, details) => {
        // Only what the person types: choosing an item rewrites the field with its
        // label, and that is not a new search.
        if (onSearch && details.reason === 'input-change') onSearch(term)
      }}
      isItemEqualToValue={(
        option: OptionComboboxItem,
        current: OptionComboboxItem,
      ) => option.value === current.value}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid}
        aria-label={ariaLabel}
        showClear={clearable}
        className={cn('w-full', className)}
      >
        {(icon ?? selected?.dot) && (
          <InputGroupAddon align="inline-start">
            {icon}
            {!icon && selected?.dot && (
              <span
                aria-hidden="true"
                className={cn('size-2 rounded-full', selected.dot)}
              />
            )}
          </InputGroupAddon>
        )}
      </ComboboxInput>

      <ComboboxContent>
        <ComboboxEmpty>{m.common_no_options()}</ComboboxEmpty>
        <ComboboxList>
          {(option: OptionComboboxItem) => (
            <ComboboxItem key={option.value} value={option}>
              {option.dot && (
                <span
                  aria-hidden="true"
                  className={cn('size-2 shrink-0 rounded-full', option.dot)}
                />
              )}
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
        {hasMore && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onLoadMore}
          >
            {m.common_load_more()}
          </Button>
        )}
      </ComboboxContent>
    </Combobox>
  )
}

/**
 * The shortcut for the most common case: an enum and the label map that already exists in
 * `lib/labels`. Without it every screen would write the same three-line `map`.
 */
export function toOptions(
  values: ReadonlyArray<string>,
  labels: Record<string, string | undefined>,
  dots?: Record<string, string | undefined>,
): Array<OptionComboboxItem> {
  return values.map((value) => ({
    value,
    label: labels[value] ?? value,
    dot: dots?.[value],
  }))
}
