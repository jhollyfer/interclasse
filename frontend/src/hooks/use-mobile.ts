import * as React from 'react'

const MOBILE_BREAKPOINT = 768

/** O `lg` do Tailwind: abaixo dele a barra lateral começa recolhida. */
export const TABLET_BREAKPOINT = 1024

function subscribeResize(onChange: () => void): () => void {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

/**
 * Se a janela é mais estreita que `breakpoint` (px). No servidor e no primeiro
 * render da hidratação responde `false` (desktop), o default que o
 * `useIsMobile` sempre teve.
 */
export function useIsBelow(breakpoint: number): boolean {
  return React.useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth < breakpoint,
    () => false,
  )
}

export function useIsMobile(): boolean {
  return useIsBelow(MOBILE_BREAKPOINT)
}
