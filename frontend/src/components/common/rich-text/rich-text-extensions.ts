import Typography from '@tiptap/extension-typography'
import StarterKit from '@tiptap/starter-kit'

/**
 * Links only `https:`, `http:` and `mailto:` (`frontend.md` §8). React 19 blocks
 * `javascript:`, but not `data:`; the backend validator checks again when
 * saving the JSON.
 */
const ALLOWED_LINK = /^(https?:|mailto:)/i

/**
 * The rich content extension list, a single one for the editor, for the
 * `MarkdownManager` and for the static renderer: a node read on one side and
 * missing on the other simply vanishes.
 *
 * - Tiptap 3's `StarterKit` already includes `Link`; configure it through that, and not
 *   with a second registration (duplicate extension).
 * - `Typography` with `emDash: false`: the extension swaps `--` for an em dash in
 *   the writer's text, and the house does not accept em dashes in text (`i18n.md`
 *   §5). The other swaps (ellipsis, curly quotes) stay.
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
