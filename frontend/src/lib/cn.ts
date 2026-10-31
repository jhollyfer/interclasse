import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * `twMerge` with the house scale (`frontend.md` §6, "Tokens e tema"): without
 * it, `z-modal` and `text-error-code` would not be recognized as members of the
 * `z-index` and `font-size` groups, and `cn('z-modal', 'z-tooltip')` would keep
 * both. The names are those in `styles.css`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      z: [
        { z: ['sticky', 'overlay', 'modal', 'dropdown', 'toast', 'tooltip'] },
      ],
      'font-size': [{ text: ['error-code', 'error-code-lg'] }],
      leading: [{ leading: ['display'] }],
    },
  },
})

export function cn(...inputs: ReadonlyArray<ClassValue>): string {
  return twMerge(clsx(inputs))
}
