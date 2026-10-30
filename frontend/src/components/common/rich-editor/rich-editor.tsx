import * as React from 'react'
import { useEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/react'

import { RICH_TEXT_EXTENSIONS } from '#/components/common/rich-text'

import { RichEditorProvider } from './rich-editor-context'

type RichEditorProps = Readonly<{
  /** O JSON gravado (`editor.getJSON()`), ou `null` num cadastro novo. */
  value: JSONContent | null
  /** Recebe o JSON a cada edição: é o que vai no payload, nunca HTML. */
  onValueChange: (value: JSONContent) => void
  disabled?: boolean
  /** `RichEditorToolbar` e `RichEditorContent`. */
  children: React.ReactNode
}>

/**
 * O editor de texto rico, sobre o Tiptap, que grava o JSON do documento.
 *
 * Carregado sob demanda (`frontend.md` §9.4): quem usa importa este módulo por
 * `React.lazy`, para o Tiptap não entrar no bundle das telas que só leem
 * (`RichText`).
 *
 * `immediatelyRender: false`, que a doc pede em qualquer framework com SSR
 * (_doc-lib/tiptap.md#getting-started/install/react). O `content` entra só na
 * criação: depois dela o editor é a fonte do texto, e reescrevê-lo a cada
 * render devolveria o cursor ao início.
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

  // Antes do primeiro quadro no cliente o editor ainda não existe: nada a
  // compartilhar, e as partes não renderizam.
  const context = React.useMemo(() => {
    if (!editor) return null

    return { editor }
  }, [editor])

  if (!context) return null

  return (
    <RichEditorProvider value={context}>
      <div data-slot="rich-editor" className="rounded-md border">
        {children}
      </div>
    </RichEditorProvider>
  )
}
