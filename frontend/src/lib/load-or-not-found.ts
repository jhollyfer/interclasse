import { notFound } from '@tanstack/react-router'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'

/**
 * Runs a `loader`'s read and converts only the 404 into "not found"
 * (`frontend.md` §5). Whoever draws it is `router.tsx`'s
 * `defaultNotFoundComponent`.
 *
 * Network down, 403 and 500 bubble up as they are: an unavailable backend must not
 * look like a deleted record, and whoever lacks the permission did not get the address wrong,
 * they got the role wrong - saying "it does not exist" would hide that.
 * _doc-lib/tanstack-router.md#guide/not-found-errors.
 */
export async function loadOrNotFound<TData>(
  load: () => Promise<TData>,
): Promise<TData> {
  try {
    return await load()
  } catch (error) {
    if (error instanceof HTTPError && error.status === HTTPStatus.NOT_FOUND) {
      throw notFound()
    }

    throw error
  }
}
