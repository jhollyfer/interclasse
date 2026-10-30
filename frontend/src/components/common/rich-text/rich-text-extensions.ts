import Typography from '@tiptap/extension-typography'
import StarterKit from '@tiptap/starter-kit'

/**
 * Link só `https:`, `http:` e `mailto:` (`frontend.md` §8). O React 19 bloqueia
 * `javascript:`, mas não `data:`; o validator do backend confere de novo ao
 * gravar o JSON.
 */
const ALLOWED_LINK = /^(https?:|mailto:)/i

/**
 * A lista de extensões do conteúdo rico, uma só para o editor, para o
 * `MarkdownManager` e para o renderizador estático: um nó lido de um lado e
 * ausente do outro simplesmente some.
 *
 * - O `StarterKit` do Tiptap 3 já inclui o `Link`; configura-se por ele, e não
 *   com um segundo registro (extensão duplicada).
 * - `Typography` com `emDash: false`: a extensão troca `--` por travessão no
 *   texto de quem escreve, e a casa não aceita travessão em texto (`i18n.md`
 *   §5). As outras trocas (reticências, aspas curvas) ficam.
 *
 * _doc-lib/tiptap.md#extensions/functionality/starterkit;
 * https://tiptap.dev/docs/editor/extensions/functionality/typography.
 */
export const RICH_TEXT_EXTENSIONS = [
  StarterKit.configure({
    link: {
      openOnClick: false,
      isAllowedUri: (url) => ALLOWED_LINK.test(url),
    },
  }),
  Typography.configure({ emDash: false }),
]
