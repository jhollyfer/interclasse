import { SignOutIcon } from '@phosphor-icons/react'
import type * as React from 'react'

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
import type { ConfirmHandle } from '#/lib/dialog-handle'
import { m } from '#/paraglide/messages'

type SignOutConfirmProps = Readonly<{
  /**
   * The visible "Sair" - the button at the sidebar's foot. It goes in the primitive's
   * `render` position.
   *
   * It stays a prop and not a part, for the same reason as `ConfirmDialog`: it is the element
   * **outside** the alert. The account menu item is not a trigger: it opens the alert
   * through the `handle`, and the alert sits as a sibling of the menu.
   */
  render?: React.ReactElement
  /** The alert opened from outside, without a trigger (`createConfirmHandle`). */
  handle?: ConfirmHandle
  children: React.ReactNode
}>

/**
 * The confirmation before ending the session.
 *
 * It exists because signing out has no undo on screen: whoever clicks by accident goes back
 * to the login and redoes the authentication. It is an `AlertDialog` (via `ConfirmDialog`), and
 * not `Dialog`, so neither `Esc` nor an outside click answers for whoever clicked - the
 * choice is explicit.
 *
 * No `destructive`: signing out deletes nothing, and the red stays worth what it is worth
 * in archive and remove.
 *
 * Composite, and not a text prop for each piece: the sidebar foot and the
 * account menu trigger the same sign-out, and the parts below are its text -
 * whoever needs to add a notice puts an `<Alert>` beside them without that
 * becoming one more optional prop here.
 */
export function SignOutConfirm({
  render,
  handle,
  children,
}: SignOutConfirmProps): React.JSX.Element {
  // `mutate` and not `mutateAsync`: nobody waits for the result here, and `mutateAsync`'s
  // promise would reject without a handler. Whoever handles the end is the hook's
  // `onSettled`, which clears the cache and navigates out of `_private`.
  const signOut = useSignOut()

  return (
    <ConfirmDialog
      render={render}
      handle={handle}
      onConfirm={() => signOut.mutate()}
    >
      {children}
    </ConfirmDialog>
  )
}

/** The icon, the title and what happens on confirm. */
export function SignOutConfirmHeader(): React.JSX.Element {
  return (
    <ConfirmDialogHeader>
      <ConfirmDialogMedia>
        <SignOutIcon />
      </ConfirmDialogMedia>
      <ConfirmDialogTitle>{m.panel_sign_out_title()}</ConfirmDialogTitle>
      <ConfirmDialogDescription>
        {m.panel_sign_out_description()}
      </ConfirmDialogDescription>
    </ConfirmDialogHeader>
  )
}

/** Cancel and Sair, in that order - the exit sits on the right, as in every alert. */
export function SignOutConfirmFooter(): React.JSX.Element {
  return (
    <ConfirmDialogFooter>
      <ConfirmDialogCancel />
      <ConfirmDialogConfirm>{m.panel_sign_out()}</ConfirmDialogConfirm>
    </ConfirmDialogFooter>
  )
}
