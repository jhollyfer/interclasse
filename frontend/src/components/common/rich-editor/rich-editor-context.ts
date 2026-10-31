import type { Editor } from '@tiptap/react'
import * as React from 'react'

/**
 * The editor that the toolbar and the text area share. Passing it by prop
 * would force both to receive what neither decides
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
 * The editor, for whoever is inside `RichEditor`.
 *
 * The `consumer` goes into the message so the error says **which** part was left outside the
 * provider.
 */
export function useRichEditorContext(consumer: string): RichEditorContextValue {
  const context = React.use(RichEditorContext)

  if (!context) {
    throw new Error(`\`${consumer}\` must be used within \`RichEditor\``)
  }

  return context
}
