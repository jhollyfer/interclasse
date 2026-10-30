import type * as React from 'react'

import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages'

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
}: Readonly<{
  readonly onRetry: () => void
}>): React.JSX.Element {
  return (
    <NotFoundPage code="500">
      <NotFoundPageTitle>{m.common_server_error_title()}</NotFoundPageTitle>
      <NotFoundPageSubtitle>
        {m.common_server_error_subtitle()}
      </NotFoundPageSubtitle>
      <NotFoundPageDescription>
        {m.common_server_error_description()}
      </NotFoundPageDescription>
      <NotFoundPageActions>
        <Button
          data-slot="not-found-page-retry-button"
          className="w-fit rounded-md"
          onClick={onRetry}
        >
          {m.common_try_again()}
        </Button>
        <NotFoundPageHomeButton />
      </NotFoundPageActions>
    </NotFoundPage>
  )
}
