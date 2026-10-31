import type { StoragesFileShowResponse } from '@interclasse/shared'
import { useMutation } from '@tanstack/react-query'

import type { MutationProps } from '#/hooks/tanstack-query/_mutation-props'
import { useMultipartUpload } from '#/hooks/use-multipart-upload'

import type { HTTPError } from '../http'
import { send } from '../http'

/** The file and the signal that cancels the upload: the screen knows when to cancel. */
export type StorageCreateVariables = {
  readonly file: File
  readonly signal: AbortSignal
}

/**
 * Uploads a file and returns the record with the derived `url`.
 *
 * The whole upload belongs to `useMultipartUpload`: the binary does not go through the API, and
 * what happens in here is three calls - open, upload straight to the bucket,
 * confirm. This mutation exists on top of it to give `isPending` and the
 * callbacks to whoever only wants "uploaded or not", which is the single image field's
 * case. Whoever needs the progress bar and cancellation uses the hook
 * directly, because `useMutation` has no way to deliver progress.
 *
 * The `AbortSignal` comes from the caller (`useAbortOnUnmount`): the mutation hook is
 * thin (`frontend.md` §2.3) and holds no controller. Leaving the screen mid-upload
 * aborts the parts instead of letting them upload to the end.
 *
 * The error is `Error` and not `HTTPError`: the hook locally refuses the file type
 * before spending a request, and that refusal has no HTTP status.
 *
 * The file is born **without an owner**: whoever attaches it keeps the reference, passing
 * the `id` returned here in `avatarId`, `coverId` or the equivalent of the entity that
 * receives the attachment. That is why the mutation invalidates nothing - there is no
 * attachment listing to update.
 */
export function useStorageCreateMutation(
  options?: MutationProps<
    StoragesFileShowResponse,
    StorageCreateVariables,
    Error
  >,
) {
  const { upload } = useMultipartUpload()

  return useMutation<StoragesFileShowResponse, Error, StorageCreateVariables>({
    ...options,
    mutationFn: function ({ file, signal }) {
      return upload(file, () => undefined, signal)
    },
  })
}

/**
 * Deletes an orphan file: the binary and the row in `storages`.
 *
 * It is the pair of `useStorageCreateMutation`, and closes the hole it opens: the upload
 * happens when the file is chosen, **before** the form is saved, so every
 * attachment replaced or removed on screen stayed on disk forever.
 *
 * The backend refuses with `409 STORAGE_IN_USE` a file that someone references,
 * so calling this mutation on an already saved attachment is safe: the response is an
 * error, not a broken image in another record.
 */
export function useStorageDeleteMutation(
  options?: MutationProps<void, string>,
) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/storages/'.concat(id), { method: 'DELETE' })
    },
  })
}
