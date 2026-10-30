import type { Editor } from '@tiptap/react'
import * as React from 'react'

/**
 * O editor que a toolbar e a área de texto compartilham. Passá-lo por prop
 * obrigaria as duas a receber o que nenhuma decide
 * (_doc-lib/tiptap.md#guides/react-composable-api).
 */
export type RichEditorContextValue = {
  editor: Editor
}

const RichEditorContext = React.createContext<RichEditorContextValue | null>(
  null,
)

export const RichEditorProvider = RichEditorContext.Provider

/**
 * O editor, para quem está dentro de `RichEditor`.
 *
 * O `consumer` entra na mensagem para o erro dizer **qual** parte ficou fora do
 * provider.
 */
export function useRichEditorContext(consumer: string): RichEditorContextValue {
  const context = React.use(RichEditorContext)

  if (!context) {
    throw new Error(`\`${consumer}\` precisa estar dentro de \`RichEditor\``)
  }

  return context
}
