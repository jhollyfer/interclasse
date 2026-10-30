import type { LinkProps } from '@tanstack/react-router'
import * as React from 'react'

/**
 * O que o formulário inteiro compartilha - e nada além.
 *
 * Os três nascem no topo, no `FormShell`, e são usados três níveis abaixo: o
 * `formId` liga o `Salvar` do cabeçalho fixo ao `<form>` que rola no conteúdo,
 * e o destino de volta é o mesmo da seta e do `Descartar`. Passá-los por prop
 * até lá seria repetir os três em cada parte, em cada formulário do painel - e
 * três fontes de verdade para a mesma decisão.
 *
 * O título **não** está aqui: ele é markup, e markup vai por slot.
 */
export type FormShellContextValue = {
  /**
   * O id do `<form>`.
   *
   * O `Salvar` mora no cabeçalho fixo e o `<form>` no conteúdo que rola - são
   * ramos separados da árvore, então o botão só alcança o formulário pelo
   * atributo `form=`. Sem o id, o clique não submete nada.
   */
  formId: string
  /** Para onde voltam a seta e o `Descartar`. Os dois apontam para o mesmo lugar. */
  backTo: LinkProps['to']
  backParams: LinkProps['params']
  /** A mutation está em voo? Trava o `Salvar` e mostra o spinner. */
  isPending: boolean
}

const FormShellContext = React.createContext<FormShellContextValue | null>(null)

export const FormShellProvider = FormShellContext.Provider

/**
 * O contrato do formulário, para quem está dentro de `FormShell`.
 *
 * O `consumer` entra na mensagem para o erro dizer **qual** parte ficou fora do
 * provider - sem isso o `throw` reporta "faltou provider" e deixa a busca por
 * conta de quem lê a stack.
 */
export function useFormShellContext(consumer: string): FormShellContextValue {
  const context = React.use(FormShellContext)

  if (!context) {
    throw new Error(`\`${consumer}\` precisa estar dentro de \`FormShell\``)
  }

  return context
}
