import { useEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/react'
import * as React from 'react'

import { RICH_TEXT_EXTENSIONS } from '#/components/common/rich-text'

import { RichEditorProvider } from './rich-editor-context'

type RichEditorProps = Readonly<{
  /** The saved JSON (`editor.getJSON()`), or `null` on a new record. */
  value: JSONContent | null
  /** Receives the JSON on every edit: it is what goes in the payload, never HTML. */
  onValueChange: (value: JSONContent) => void
  disabled?: boolean
  /** `RichEditorToolbar` e `RichEditorContent`. */
  children: React.ReactNode
}>

/**
 * The rich text editor, on top of Tiptap, which saves the document's JSON.
 *
 * Loaded on demand (`frontend.md` §9.4): whoever uses it imports this module through
 * `React.lazy`, so Tiptap does not enter the bundle of screens that only read
 * (`RichText`).
 *
 * `immediatelyRender: false`, which the docs ask for in any framework with SSR
 * (_doc-lib/tiptap.md#getting-started/install/react). The `content` enters only on
 * creation: after that the editor is the source of the text, and rewriting it on every
 * render would send the cursor back to the start.
 */
export function RichEditor({
  value,
  onValueChange,
  disabled = false,
  children,
}: RichEditorProps): React.JSX.Element | null {
  const editor = useEditor({
    extensions: RICH_TEXT_EXTENSIONS,
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: updated }) => onValueChange(updated.getJSON()),
  })

  React.useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])

  // Before the first frame on the client the editor does not exist yet: nothing to
  // share, and the parts do not render.
  if (!editor) return null

  const context = { editor }

  return (
    <RichEditorProvider value={context}>
      <div data-slot="rich-editor" className="rounded-md border">
        {children}
      </div>
    </RichEditorProvider>
  )
}
