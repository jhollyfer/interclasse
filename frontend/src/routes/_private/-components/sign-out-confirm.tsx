import type * as React from 'react'
import { SignOutIcon } from '@phosphor-icons/react'

import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogDescription,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
  ConfirmDialogMedia,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { useSignOut } from '#/hooks/use-sign-out'

type SignOutConfirmProps = Readonly<{
  /**
   * O "Sair" visível - o botão do pé da barra lateral ou o item do menu da
   * conta. Vai na posição de `render` da primitiva, e é por isso que o item de
   * menu precisa de `closeOnClick={false}`: sem ele o menu fecha e leva o
   * gatilho embora antes do alerta abrir.
   *
   * Segue prop e não parte, pelo mesmo motivo do `ConfirmDialog`: é o elemento
   * de **fora** do alerta.
   */
  trigger: React.ReactElement
  children: React.ReactNode
}>

/**
 * A confirmação antes de encerrar a sessão.
 *
 * Existe porque sair não tem desfazer pela tela: quem clica sem querer volta
 * para o login e refaz a autenticação. É `AlertDialog` (via `ConfirmDialog`), e
 * não `Dialog`, então nem `Esc` nem clique fora respondem por quem clicou - a
 * escolha é explícita.
 *
 * Sem `destructive`: sair não apaga nada, e o vermelho fica valendo o que vale
 * em arquivar e remover.
 *
 * Composto, e não uma prop de texto para cada pedaço: o pé da barra lateral e o
 * menu da conta disparam a mesma saída, e as partes abaixo são o texto dela -
 * quem precisar acrescentar um aviso põe um `<Alert>` ao lado delas sem que
 * isso vire mais uma prop opcional aqui.
 */
export function SignOutConfirm({
  trigger,
  children,
}: SignOutConfirmProps): React.JSX.Element {
  // `mutate` e não `mutateAsync`: ninguém espera o resultado aqui, e a promise
  // de `mutateAsync` rejeitaria sem handler. Quem trata o fim é o `onSettled`
  // do hook, que limpa o cache e navega para fora do `_private`.
  const signOut = useSignOut()

  return (
    <ConfirmDialog trigger={trigger} onConfirm={() => signOut.mutate()}>
      {children}
    </ConfirmDialog>
  )
}

/** O ícone, o título e o que acontece ao confirmar. */
export function SignOutConfirmHeader(): React.JSX.Element {
  return (
    <ConfirmDialogHeader>
      <ConfirmDialogMedia>
        <SignOutIcon />
      </ConfirmDialogMedia>
      <ConfirmDialogTitle>Sair da conta?</ConfirmDialogTitle>
      <ConfirmDialogDescription>
        Você será desconectado e voltará para a tela de login.
      </ConfirmDialogDescription>
    </ConfirmDialogHeader>
  )
}

/** Cancelar e Sair, nessa ordem - a saída fica à direita, como em todo alerta. */
export function SignOutConfirmFooter(): React.JSX.Element {
  return (
    <ConfirmDialogFooter>
      <ConfirmDialogCancel />
      <ConfirmDialogConfirm>Sair</ConfirmDialogConfirm>
    </ConfirmDialogFooter>
  )
}
