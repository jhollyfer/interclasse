import * as React from 'react'

/**
 * Por que a lista está vazia. São três e o texto não pode ser o mesmo: "nada
 * cadastrado" numa busca sem resultado manda a pessoa cadastrar o que já
 * existe, e na lixeira vazia sugere que o recurso inteiro sumiu.
 */
export type EmptyStateReason = 'empty' | 'filtered' | 'trash'

export type EmptyStateContextValue = {
  reason: EmptyStateReason
}

const EmptyStateContext = React.createContext<EmptyStateContextValue | null>(
  null,
)

export const EmptyStateProvider = EmptyStateContext.Provider

/**
 * O motivo, para quem está dentro de `EmptyState`.
 *
 * O `consumer` entra na mensagem para o erro dizer **qual** parte ficou fora do
 * provider.
 */
export function useEmptyStateContext(consumer: string): EmptyStateContextValue {
  const context = React.use(EmptyStateContext)

  if (!context) {
    throw new Error(`\`${consumer}\` precisa estar dentro de \`EmptyState\``)
  }

  return context
}
