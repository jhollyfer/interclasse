import { EditorContent } from '@tiptap/react'
import type * as React from 'react'

import { cn } from '#/lib/cn'

import { useRichEditorContext } from './rich-editor-context'

type RichEditorContentProps = Readonly<
  Pick<React.ComponentProps<'div'>, 'className' | 'id' | 'aria-invalid'> & {
    'aria-describedby'?: string
  }
>

/**
 * A área de escrita. O `id` e o `aria-*` do campo (`AppField`) vão para o
 * elemento editável, que é o que o `<label>` e a leitora de tela alcançam.
 */
export function RichEditorContent({
  className,
  id,
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
}: RichEditorContentProps): React.JSX.Element {
  const { editor } = useRichEditorContext('RichEditorContent')

  return (
    <EditorContent
      data-slot="rich-editor-content"
      editor={editor}
      className={cn('prose min-h-32 p-3', className)}
      id={id}
      aria-invalid={invalid}
      aria-describedby={describedBy}
    />
  )
}
