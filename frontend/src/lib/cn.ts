import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * `twMerge` com a escala da casa (`frontend.md` §6, "Tokens e tema"): sem
 * ela, `z-modal` e `text-error-code` não seriam reconhecidos como membros do
 * grupo `z-index` e `font-size`, e `cn('z-modal', 'z-tooltip')` guardaria os
 * dois. Os nomes são os de `styles.css`.
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
