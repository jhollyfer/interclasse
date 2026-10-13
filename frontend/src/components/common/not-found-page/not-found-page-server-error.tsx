import type * as React from 'react'

import { Button } from '#/components/ui/button'

import {
  NotFoundPage,
  NotFoundPageActions,
  NotFoundPageDescription,
  NotFoundPageHomeButton,
  NotFoundPageSubtitle,
  NotFoundPageTitle,
} from './not-found-page'

/**
 * A falha que é nossa: o 500, num lugar só. A fronteira de erro do router e a
 * do painel (`QueryErrorResetBoundary`) desenham a mesma tela e só diferem no
 * que "Tentar de novo" refaz - o `reset` de uma, o `resetErrorBoundary` da
 * outra.
 */
export function NotFoundPageServerError({
  onRetry,
}: {
  readonly onRetry: () => void
}): React.JSX.Element {
  return (
    <NotFoundPage code="500">
      <NotFoundPageTitle>Algo quebrou aqui</NotFoundPageTitle>
      <NotFoundPageSubtitle>A falha é nossa, não sua</NotFoundPageSubtitle>
      <NotFoundPageDescription>
        Esta tela não conseguiu carregar. Tentar de novo costuma bastar; se
        insistir, volte ao início.
      </NotFoundPageDescription>
      <NotFoundPageActions>
        <Button
          data-slot="not-found-page-retry-button"
          className="w-fit rounded-md"
          onClick={onRetry}
        >
          Tentar de novo
        </Button>
        <NotFoundPageHomeButton />
      </NotFoundPageActions>
    </NotFoundPage>
  )
}
