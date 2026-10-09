import * as React from 'react'

/**
 * O que a confirmação inteira compartilha - e nada além.
 *
 * A ação e o peso dela ficam aqui porque quem os declara é a tela, no topo, e
 * quem os usa é o botão de confirmar, três níveis abaixo. Passá-los por prop
 * até lá seria repetir os dois em todo `ConfirmDialogConfirm` de toda tela.
 *
 * O texto **não** está aqui: ele é markup, e markup vai por slot.
 */
export type ConfirmDialogContextValue = {
  onConfirm: () => void
  /** Ação sem volta pinta o botão de vermelho. */
  destructive: boolean
}

const ConfirmDialogContext =
  React.createContext<ConfirmDialogContextValue | null>(null)

export const ConfirmDialogProvider = ConfirmDialogContext.Provider

/**
 * A ação confirmada, para quem está dentro de `ConfirmDialog`.
 *
 * O `consumer` entra na mensagem para o erro dizer **qual** parte ficou fora do
 * provider - sem isso o `throw` reporta "faltou provider" e deixa a busca por
 * conta de quem lê a stack.
 */
export function useConfirmDialogContext(
  consumer: string,
): ConfirmDialogContextValue {
  const context = React.use(ConfirmDialogContext)

  if (!context) {
    throw new Error(`\`${consumer}\` precisa estar dentro de \`ConfirmDialog\``)
  }

  return context
}
