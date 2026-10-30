import { useBlocker } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'

/**
 * Pergunta antes de sair de um formulário com alteração não salva (`frontend.md`
 * §4): navegação do router passa pelo `confirm`, e fechar a aba ou recarregar
 * cai no `beforeunload` do navegador.
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
