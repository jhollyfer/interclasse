import * as React from 'react'

/**
 * The value after `delay` ms without changing. The combobox with server search
 * debounces here, on the value that enters the query key, and not inside the
 * `queryFn` (`frontend.md` §2.1).
 */
export function useDebouncedValue<TValue>(value: TValue, delay = 300): TValue {
  const [debounced, setDebounced] = React.useState(value)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)

    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}
