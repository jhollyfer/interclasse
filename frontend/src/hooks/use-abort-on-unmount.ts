import * as React from 'react'

/**
 * A new `AbortSignal` per call, all aborted when the component leaves the
 * stage.
 *
 * One per upload because an aborted controller does not become valid again:
 * reusing it would make the next upload start cancelled. Leaving the screen
 * mid-upload used to leave the parts uploading to the end, spending bandwidth
 * on a file nobody cared about any more.
 */
export function useAbortOnUnmount(): () => AbortSignal {
  const controllers = React.useRef(new Set<AbortController>())

  React.useEffect(() => {
    const open = controllers.current

    return () => {
      for (const controller of open) controller.abort()
      open.clear()
    }
  }, [])

  return (): AbortSignal => {
    const controller = new AbortController()
    controllers.current.add(controller)

    return controller.signal
  }
}
