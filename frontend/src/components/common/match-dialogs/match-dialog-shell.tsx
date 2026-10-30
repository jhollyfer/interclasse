import * as React from 'react'

import { Dialog, DialogContent } from '#/components/ui/dialog'
import type { DialogHandle } from '#/lib/dialog-handle'

/** O mínimo de uma partida que os diálogos precisam. */
export type MatchRef = Readonly<{
  id: string
  phase: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeName: string | null
  awayName: string | null
  homeScore: number | null
  awayScore: number | null
  winnerTeamId: string | null
  scheduledAt: string | null
  location: string | null
}>

type MatchDialogShellProps = Readonly<{
  /** Um handle por diálogo; a tabela abre com `handle.openWithPayload(partida)`. */
  handle: DialogHandle<MatchRef>
  className?: string
  /** O conteúdo, montado só aberto e com a partida do clique. */
  children: (match: MatchRef) => React.ReactNode
}>

/**
 * O casco dos diálogos de partida: uncontrolled, aberto por `handle` com a
 * partida como payload (`frontend.md` §6.2). O conteúdo só monta aberto, então
 * o formulário nasce com a partida do clique e some ao fechar - sem `key`, sem
 * estado de "qual partida" na tela.
 * _doc-lib/base-ui.md#react/components/dialog.
 */
export function MatchDialogShell({
  handle,
  className,
  children,
}: MatchDialogShellProps): React.JSX.Element {
  return (
    <Dialog handle={handle}>
      {({ payload }) => (
        <React.Fragment>
          {payload !== undefined && (
            <DialogContent className={className}>
              {children(payload)}
            </DialogContent>
          )}
        </React.Fragment>
      )}
    </Dialog>
  )
}
