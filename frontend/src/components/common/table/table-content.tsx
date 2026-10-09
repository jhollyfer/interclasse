import type * as React from 'react'
import { ArrowClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react'

import { useTableContext } from './table-context'

import { Button } from '#/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { PageShellContent } from '#/components/common/page-shell'

/**
 * A área que rola: a tabela, o estado vazio e a barra de seleção.
 *
 * A barra fica aqui dentro de propósito - `sticky bottom-4` só acompanha a
 * lista se estiver no mesmo contêiner que rola.
 *
 * **Erro antes de vazio, e num lugar só.** Nenhuma listagem do painel anterior
 * tinha estado de erro: a consulta falhava, devolvia zero linha, e o
 * `TableEmpty` anunciava "nenhum registro ainda" - que é o convite a cadastrar
 * de novo o que já existe, para alguém cujo único problema era a rede. Ficar
 * aqui e não em cada tela é o que garante que a próxima listagem nasça
 * coberta.
 */
export function TableContent({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const { isError, onRetry } = useTableContext('TableContent')

  if (isError) {
    return (
      <PageShellContent>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WarningCircleIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Não foi possível carregar a lista</EmptyTitle>
            <EmptyDescription>
              A consulta falhou. Verifique a conexão e tente de novo.
            </EmptyDescription>
          </EmptyHeader>

          {/* Sem `onRetry` o botão não aparece: um "tentar de novo" que não
              refaz nada é pior que nenhum botão. */}
          {onRetry && (
            <EmptyContent>
              <Button variant="outline" onClick={onRetry}>
                <ArrowClockwiseIcon aria-hidden />
                Tentar de novo
              </Button>
            </EmptyContent>
          )}
        </Empty>
      </PageShellContent>
    )
  }

  return <PageShellContent>{children}</PageShellContent>
}
