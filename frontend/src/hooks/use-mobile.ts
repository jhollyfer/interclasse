import * as React from 'react'

const MOBILE_BREAKPOINT = 768

/** Tailwind's `lg`: below it the sidebar starts collapsed. */
export const TABLET_BREAKPOINT = 1024

function subscribeResize(onChange: () => void): () => void {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

/**
 * Whether the window is narrower than `breakpoint` (px). On the server and on
 * the hydration's first render it answers `false` (desktop), the default
 * `useIsMobile` has always had.
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
