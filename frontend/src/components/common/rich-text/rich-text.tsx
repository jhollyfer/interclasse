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
      /** O JSON que o editor gravou (`editor.getJSON()`). */
      json?: JSONContent
      /**
       * Markdown que vem de fora (resposta de IA, importação, conteúdo legado).
       * Converte **sem editor**, com a mesma lista de extensões, e segue pelo
       * mesmo renderizador.
       *
       * A conversão depende do `DOMParser`: no SSR o `@tiptap/markdown@3.32`
       * devolve HTML embutido como texto literal. Por isso a conversão roda num
       * lado só (no backend, ao gravar, ou só no cliente) e a tela recebe JSON;
       * converter no SSR e de novo no cliente quebra a hidratação.
       */
      markdown?: string
    }
  >
>

/** O conversor de Markdown em JSON, sem editor: um para todas as telas. */
const MARKDOWN = new MarkdownManager({ extensions: RICH_TEXT_EXTENSIONS })

/** O documento vazio: o que se lê quando a tela não passa conteúdo nenhum. */
const EMPTY_DOCUMENT: JSONContent = { type: 'doc', content: [] }

/**
 * Leitura de conteúdo rico: JSON do editor ou Markdown de fora, por
 * `renderToReactElement` do `@tiptap/static-renderer`. Devolve elemento React,
 * sem editor e sem `innerHTML`: a injeção de HTML deixa de ser possível por
 * construção. _doc-lib/tiptap.md#api/utilities/static-renderer.
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
