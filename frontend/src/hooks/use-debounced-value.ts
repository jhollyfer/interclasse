import * as React from 'react'

/**
 * O valor depois de `delay` ms sem mudar. O combobox com busca no servidor
 * debounça aqui, no valor que entra na chave da query, e não dentro da
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
