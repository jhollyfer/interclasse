import type * as React from 'react'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import {
  ListBulletsIcon,
  ListNumbersIcon,
  TextBIcon,
  TextHTwoIcon,
  TextItalicIcon,
} from '@phosphor-icons/react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { useRichEditorContext } from './rich-editor-context'

type ToolbarAction = {
  label: () => string
  icon: React.ReactElement
  /** O nome do nó ou marca que o Tiptap usa para dizer "está ativo aqui". */
  active: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

/**
 * As ações da barra, por nome. Lookup, e não um `if` por botão: acrescentar uma
 * ação é acrescentar uma entrada.
 */
const TOOLBAR_ACTIONS = {
  bold: {
    label: () => m.rich_editor_bold(),
    icon: <TextBIcon />,
    active: (editor) => editor.isActive('bold'),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  italic: {
    label: () => m.rich_editor_italic(),
    icon: <TextItalicIcon />,
    active: (editor) => editor.isActive('italic'),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  heading: {
    label: () => m.rich_editor_heading(),
    icon: <TextHTwoIcon />,
    active: (editor) => editor.isActive('heading', { level: 2 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  bulletList: {
    label: () => m.rich_editor_bullet_list(),
    icon: <ListBulletsIcon />,
    active: (editor) => editor.isActive('bulletList'),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  orderedList: {
    label: () => m.rich_editor_ordered_list(),
    icon: <ListNumbersIcon />,
    active: (editor) => editor.isActive('orderedList'),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
} satisfies Record<string, ToolbarAction>

type ToolbarActionName = keyof typeof TOOLBAR_ACTIONS

/** A ordem dos botões. */
const ACTION_NAMES = [
  'bold',
  'italic',
  'heading',
  'bulletList',
  'orderedList',
] as const satisfies ReadonlyArray<ToolbarActionName>

/** A barra de formatação. Cada botão diz o estado por `aria-pressed`. */
export function RichEditorToolbar({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  const { editor } = useRichEditorContext('RichEditorToolbar')

  // Sem isto a barra não acompanha o cursor: o Tiptap 3 não re-renderiza o
  // React a cada transação (_doc-lib/tiptap.md#guides/performance).
  const pressed = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      ACTION_NAMES.map((name) => TOOLBAR_ACTIONS[name].active(current)),
  })

  return (
    <div
      data-slot="rich-editor-toolbar"
      role="toolbar"
      aria-label={m.rich_editor_toolbar()}
      className={cn('flex flex-wrap gap-1 border-b p-1', className)}
      {...props}
    >
      {ACTION_NAMES.map((name, index) => {
        const action = TOOLBAR_ACTIONS[name]

        return (
          <Button
            key={name}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={action.label()}
            aria-pressed={pressed[index]}
            disabled={!editor.isEditable}
            onClick={() => action.run(editor)}
          >
            {action.icon}
          </Button>
        )
      })}
    </div>
  )
}
