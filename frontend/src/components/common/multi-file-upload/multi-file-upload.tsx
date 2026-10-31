import type { StorageMimetype } from '@interclasse/shared'
import * as React from 'react'
import { toast } from 'sonner'

import { useRegisterUpload } from '#/components/common/uploading-context'
import { useAbortOnUnmount } from '#/hooks/use-abort-on-unmount'
import { useMultipartUpload } from '#/hooks/use-multipart-upload'
import { useStorageDeleteMutation } from '#/integrations/tanstack-query/mutations/storages'
import { notifyError } from '#/lib/form-errors'
import { IMAGE_MIMETYPES } from '#/lib/mimetype'
import { m } from '#/paraglide/messages'

import { MultiFileUploadProvider } from './multi-file-upload-context'
import type { UploadItem } from './multi-file-upload-context'

type MultiFileUploadProps = Readonly<{
  /** Receives the `id`s of the already uploaded attachments on every change: it is what goes in the payload. */
  onValueChange: (storageIds: ReadonlyArray<string>) => void
  accept?: ReadonlyArray<StorageMimetype>
  id?: string
  /** `MultiFileUploadTrigger` e `MultiFileUploadList`. */
  children: React.ReactNode
}>

/**
 * A field that uploads several files on choice, each with its own bar and
 * cancellable (`frontend.md` §8). It is `ImageField`'s counterpart for lists: the upload
 * belongs to `useMultipartUpload`, the field registers the flight in the `uploading-context` (the
 * submit waits) and a replaced or removed file, which never had an owner, is deleted.
 *
 * The uploads run in parallel, and each one's signal is aborted when the field
 * leaves the stage (`useAbortOnUnmount`).
 */
export function MultiFileUpload({
  onValueChange,
  accept = IMAGE_MIMETYPES,
  id,
  children,
}: MultiFileUploadProps): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null)
  // One controller per file: cancelling one upload must not abort the others.
  const controllers = React.useRef(new Map<string, AbortController>())
  const [items, setItems] = React.useState<ReadonlyArray<UploadItem>>([])
  const { upload } = useMultipartUpload()
  const nextSignal = useAbortOnUnmount()
  const discard = useStorageDeleteMutation({
    // Cleanup, not a requested action: failing leaves an orphan, as before.
    onError: () => undefined,
  })

  function change(key: string, patch: Partial<UploadItem>): void {
    setItems((previous) =>
      previous.map((item) => {
        if (item.key !== key) return item

        return { ...item, ...patch }
      }),
    )
  }

  async function start(file: File): Promise<void> {
    const key = crypto.randomUUID()
    const controller = new AbortController()
    controllers.current.set(key, controller)
    setItems((previous) => [
      ...previous,
      {
        key,
        name: file.name,
        percent: 0,
        status: 'uploading',
        storageId: null,
      },
    ])

    try {
      const storage = await upload(
        file,
        (percent) => change(key, { percent }),
        AbortSignal.any([nextSignal(), controller.signal]),
      )
      controllers.current.delete(key)
      change(key, { status: 'done', percent: 100, storageId: storage.id })
    } catch (error) {
      // Cancelled by the person: the item already left the queue, and there is no failure to count.
      if (controller.signal.aborted) return

      change(key, { status: 'failed' })
      if (error instanceof Error) {
        notifyError(error, { id: `multi-file-upload-${key}` })
        return
      }

      toast.error(m.multi_file_upload_failed({ name: file.name }))
    }
  }

  function onSelect(event: React.ChangeEvent<HTMLInputElement>): void {
    for (const file of event.target.files ?? []) void start(file)

    // Without this, choosing the same file twice in a row does not fire
    // `change` again.
    event.target.value = ''
  }

  function remove(key: string): void {
    controllers.current.get(key)?.abort()
    controllers.current.delete(key)

    const target = items.find((item) => item.key === key)

    if (target?.storageId) discard.mutate(target.storageId)

    setItems((previous) => previous.filter((item) => item.key !== key))
  }

  function openPicker(): void {
    inputRef.current?.click()
  }

  const isUploading = items.some((item) => item.status === 'uploading')

  // Locks the submit while any file uploads: without it the payload leaves without the
  // attachment's `id`.
  useRegisterUpload(isUploading)

  // The `id` list becomes a primitive for the effect's dependency, and the notice to the
  // parent stays out of the deps (`useEffectEvent`): swapping the callback does not resend.
  const doneIds = items.flatMap((item) => item.storageId ?? [])
  const doneKey = doneIds.join(',')
  const notify = React.useEffectEvent(() => onValueChange(doneIds))

  React.useEffect(() => {
    notify()
  }, [doneKey])

  const context = { items, openPicker, remove, isUploading, controlId: id }

  return (
    <div data-slot="multi-file-upload" className="flex flex-col gap-3">
      <MultiFileUploadProvider value={context}>
        {children}
      </MultiFileUploadProvider>

      {/* The native `<input type="file">` cannot be styled: it stays hidden behind
          the visible button (`MultiFileUploadTrigger`), as in `ImageField`. */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept.join(',')}
        onChange={onSelect}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
    </div>
  )
}
