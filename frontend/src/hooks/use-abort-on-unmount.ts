import * as React from 'react'

/**
 * Um `AbortSignal` novo por chamada, todos abortados quando o componente sai
 * de cena.
 *
 * Um por envio porque um controller abortado não volta a valer: reaproveitá-lo
 * faria o envio seguinte nascer cancelado. Sair da tela no meio de um upload
 * deixava as partes subindo até o fim, gastando banda por um arquivo que já não
 * interessava a ninguém.
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

  return React.useCallback((): AbortSignal => {
    const controller = new AbortController()
    controllers.current.add(controller)

    return controller.signal
  }, [])
}
