import type { Merge } from '@interclasse/shared'
import { MarkdownManager } from '@tiptap/markdown'
import type { JSONContent } from '@tiptap/react'
import { renderToReactElement } from '@tiptap/static-renderer/pm/react'
import * as React from 'react'

import { cn } from '#/lib/cn'

import { RICH_TEXT_EXTENSIONS } from './rich-text-extensions'

type RichTextProps = Readonly<
  Merge<
    Omit<React.ComponentProps<'div'>, 'children'>,
    {
      /** The JSON the editor saved (`editor.getJSON()`). */
      json?: JSONContent
      /**
       * Markdown that comes from outside (AI response, import, legacy content).
       * Converts **without an editor**, with the same extension list, and goes through
       * the same renderer.
       *
       * The conversion depends on `DOMParser`: on SSR `@tiptap/markdown@3.32`
       * returns embedded HTML as literal text. That is why the conversion runs on one
       * side only (on the backend, when saving, or on the client only) and the screen receives JSON;
       * converting on SSR and again on the client breaks hydration.
       */
      markdown?: string
    }
  >
>

/** The Markdown to JSON converter, without an editor: one for all screens. */
const MARKDOWN = new MarkdownManager({ extensions: RICH_TEXT_EXTENSIONS })

/** The empty document: what is read when the screen passes no content at all. */
const EMPTY_DOCUMENT: JSONContent = { type: 'doc', content: [] }

/**
 * Rich content reading: editor JSON or outside Markdown, through
 * `renderToReactElement` from `@tiptap/static-renderer`. Returns a React element,
 * with no editor and no `innerHTML`: HTML injection is no longer possible by
 * construction. _doc-lib/tiptap.md#api/utilities/static-renderer.
 */
export function RichText({
  json,
  markdown,
  className,
  ...props
}: RichTextProps): React.JSX.Element {
  let content = EMPTY_DOCUMENT
  if (markdown) content = MARKDOWN.parse(markdown)
  if (json) content = json

  return (
    <div
      data-slot="rich-text"
      className={cn('flex flex-col gap-3', className)}
      {...props}
    >
      {renderToReactElement({ extensions: RICH_TEXT_EXTENSIONS, content })}
    </div>
  )
}
