import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'

import {
  HTTPError,
  HTTPErrorCode,
  HTTPStatus,
} from '#/integrations/tanstack-query/http'
import { m } from '#/paraglide/messages'

/**
 * Carries the API error to the form fields.
 *
 * The backend's 422 brings `errors` with **one** message per field - the handler
 * keeps the first, not the list -, and the 409 brings the conflicting field the same
 * way (`{ email: 'Usuário já existe' }`). Without this, the form accepts the
 * payload, the API refuses it and the screen does not show where - the error stays only in the
 * `error.message` of a toast that vanishes in 4 seconds.
 *
 * `root` is the backend's channel for "the message belongs to the form, not to a
 * field": it is what the sign-in 401 uses so as not to reveal whether the email or the
 * password failed.
 *
 * A key the form does not know - the backend gained a field, or the name
 * changed - does not vanish silently: it becomes a `root` message. It is the difference between
 * "the form no longer validates" and "nobody noticed for three weeks".
 *
 * Returns `true` when something was marked on screen. `false` means an error with no
 * assignable field (5xx, network), and then the decision is the caller's: usually a
 * toast with a retry action.
 */
export function applyHTTPErrorToForm<TValues extends FieldValues>({
  form,
  error,
  fields,
}: {
  form: UseFormReturn<TValues>
  error: HTTPError
  fields: ReadonlyArray<FieldPath<TValues>>
}): boolean {
  const { root, ...rest } = error.errors ?? {}

  const orphans: Array<string> = []

  for (const [field, message] of Object.entries(rest)) {
    // `find` and not `includes`: the key comes from the backend as a wide `string`, and the
    // predicate proves the narrowing instead of asserting it.
    const known = fields.find((candidate) => candidate === field)

    if (known) {
      form.setError(known, { message })
      continue
    }

    orphans.push(message)
  }

  const rootMessage = [root, ...orphans].filter(Boolean).join(' ')

  if (rootMessage) form.setError('root', { message: rootMessage })

  return Boolean(rootMessage) || Object.keys(rest).length > orphans.length
}

/**
 * A form's whole `onError`.
 *
 * It is what every dashboard `form-create.tsx` and `form-edit.tsx` would write by hand,
 * always in the same order: try to mark the fields, and whatever does not fit in any field
 * becomes a footer message.
 *
 * `retry` is the only real variation: a notice with "Tentar de novo" that resends the
 * same payload, because a server error is not the fault of whoever filled it in and
 * retyping a long form because of a 500 is punishment. When absent, the 5xx
 * falls to the footer like any other.
 *
 * **When to pass `retry`, and it is a rule, not a taste:**
 *
 * - **Editing always can.** The `PUT` carries the id and writes the same final state;
 *   resending creates nothing.
 * - **Creating only when the use-case refuses the duplicate with 409.** The 5xx may
 *   have come *after* the write, and then the resend saves the record again. The ones
 *   that check before inserting return `*_ALREADY_EXISTS` and are safe -
 *   news and events by `slug`, users by e-mail. Testimonial, podcast,
 *   video and album insert directly and are left **without** `retry` for that reason: two
 *   equal testimonials are a duplicated testimonial, not a conflict.
 */
export function applyMutationError<TValues extends FieldValues>({
  form,
  error,
  fields,
  retry,
}: {
  form: UseFormReturn<TValues>
  error: HTTPError
  fields: ReadonlyArray<FieldPath<TValues>>
  retry?: {
    /** The notice id, so sonner does not stack one per attempt. */
    id: string
    onClick: () => void
  }
}): void {
  if (applyHTTPErrorToForm({ form, error, fields })) return

  if (retry && isRetrySafe(error)) {
    notifyError(error, { id: retry.id, retry: retry.onClick })
    return
  }

  form.setError('root', { message: httpErrorMessage(error) })
}

/**
 * The text the screen shows for an API error, chosen by `code`.
 *
 * A 4xx's `message` is written by the backend for whoever reads the screen ("Turma
 * já existe") and passes through as it came. A 5xx's is from the server to the log: the screen
 * shows the text from here, with no implementation detail.
 */
const HTTP_ERROR_MESSAGES: Record<string, (() => string) | undefined> = {
  [HTTPErrorCode.NETWORK_ERROR]: () => m.common_error_network(),
  [HTTPErrorCode.UNKNOWN_ERROR]: () => m.common_error_unknown(),
}

export function httpErrorMessage(error: Error): string {
  // An error that did not come from `request` (the upload refusing the file type, for
  // example) already carries the screen's text.
  if (!(error instanceof HTTPError)) return error.message

  const known = HTTP_ERROR_MESSAGES[error.code]
  if (known) return known()
  if (error.isServerError) return m.common_error_server()

  return error.message
}

/**
 * Whether resending the same request can work: conflict (409), server or
 * network. A validation 422 or an authorization 403 come back the same, and the
 * "Tentar de novo" button would only confuse whoever clicks (`frontend.md` §4).
 */
export function isRetrySafe(error: Error): boolean {
  if (!(error instanceof HTTPError)) return false

  return error.status === HTTPStatus.CONFLICT || error.isServerError
}

/**
 * The error notice of an action outside a form, for every mutation `onError`
 * that does not land on a field (remove, archive, save
 * enrollments). A fixed `id` so consecutive attempts replace the notice instead of
 * stacking; `retry` becomes the "Tentar de novo" action only when the error is
 * retry-safe.
 */
export function notifyError(
  error: Error,
  { id, retry }: { readonly id: string; readonly retry?: () => void },
): void {
  let action: { label: string; onClick: () => void } | undefined
  if (retry && isRetrySafe(error))
    action = { label: m.common_retry(), onClick: retry }

  toast.error(httpErrorMessage(error), { id, action })
}
