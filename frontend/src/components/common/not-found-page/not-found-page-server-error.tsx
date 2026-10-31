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
 * The failure that is ours: the 500, in one place. The router's error boundary and the
 * dashboard's (`QueryErrorResetBoundary`) draw the same screen and only differ in
 * what "Tentar de novo" redoes - the `reset` of one, the `resetErrorBoundary` of the
 * other.
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
