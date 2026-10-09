import * as React from 'react'
import type { LinkProps } from '@tanstack/react-router'

import { FormShellProvider } from './form-shell-context'

import { PageShell } from '#/components/common/page-shell'

type FormShellProps = {
  formId: string
  backTo: LinkProps['to']
  backParams?: LinkProps['params']
  isPending?: boolean
  children: React.ReactNode
}

/**
 * A casca de todo formulário de criar/editar do painel.
 *
 * Todo formulário do painel abre com as mesmas ~55 linhas: `PageShell`,
 * cabeçalho fixo com voltar/título/descartar/salvar, e o `<form>` no conteúdo
 * que rola. Só o miolo muda. Repetido um por recurso, um ajuste de cabeçalho
 * vira uma edição por tela - e a próxima nasce com o cabeçalho da versão
 * anterior.
 *
 * Compound e não props `title`/`actions`: as telas divergem no miolo e no
 * cabeçalho. A de notícia põe três blocos de campos onde a de depoimento põe
 * um, e a que precisar de um terceiro botão ao lado do `Salvar` escreve o botão
 * dentro de `FormShellActions`. Com prop, cada divergência dessas vira mais uma
 * prop opcional aqui dentro.
 *
 * O `<Card>` também não vem embutido - ver `FormShellCard`.
 */
export function FormShell({
  formId,
  backTo,
  backParams,
  isPending = false,
  children,
}: FormShellProps): React.JSX.Element {
  // Sem `useMemo` o objeto é novo a cada tecla digitada no formulário, e o
  // cabeçalho inteiro re-renderiza junto com o campo.
  const value = React.useMemo(
    () => ({ formId, backTo, backParams, isPending }),
    [formId, backTo, backParams, isPending],
  )

  return (
    <PageShell data-slot="form-shell">
      <FormShellProvider value={value}>{children}</FormShellProvider>
    </PageShell>
  )
}
