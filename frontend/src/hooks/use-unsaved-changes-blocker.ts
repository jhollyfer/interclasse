import { useBlocker } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'

/**
 * Asks before leaving a form with unsaved changes (`frontend.md`
 * §4): router navigation goes through `confirm`, and closing the tab or reloading
 * falls to the browser's `beforeunload`.
 * _doc-lib/tanstack-router.md#guide/navigation-blocking.
 */
export function useUnsavedChangesBlocker(isDirty: boolean): void {
  useBlocker({
    shouldBlockFn: () => {
      if (!isDirty) return false

      // `confirm` devolve "pode sair"; `shouldBlockFn` devolve "bloqueia".
      return !window.confirm(m.form_unsaved_changes_confirm())
    },
    enableBeforeUnload: isDirty,
  })
}
