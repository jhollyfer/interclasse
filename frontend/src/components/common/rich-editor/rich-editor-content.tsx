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
 * The writing area. The field's `id` and `aria-*` (`AppField`) go to the
 * editable element, which is what the `<label>` and the screen reader reach.
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
