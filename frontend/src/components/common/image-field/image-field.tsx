import type { StorageMimetype } from '@interclasse/shared'
import * as React from 'react'
import { toast } from 'sonner'

import { useRegisterUpload } from '#/components/common/uploading-context'
import { Field } from '#/components/ui/field'
import { useAbortOnUnmount } from '#/hooks/use-abort-on-unmount'
import {
  useStorageCreateMutation,
  useStorageDeleteMutation,
} from '#/integrations/tanstack-query/mutations/storages'
import { notifyError } from '#/lib/form-errors'
import { IMAGE_MIMETYPES, isStorageMimetype } from '#/lib/mimetype'
import { m } from '#/paraglide/messages'

import { ImageFieldProvider } from './image-field-context'

type ImageFieldProps = Readonly<{
  /** The current attachment's `id`, or `null`. It is what goes in the payload. */
  value: string | null
  onValueChange: (storageId: string | null) => void
  /** The already saved file, for the preview before any replacement. */
  previewUrl?: string | null
  /**
   * The types that **this** field accepts, from `STORAGE_MIMETYPES`. The default is
   * images; the episode's audio passes `AUDIO_MIMETYPES`.
   */
  accept?: ReadonlyArray<StorageMimetype>
  id?: string
  children: React.ReactNode
}>

/**
 * The field for **one** file: the user's avatar, the testimonial's photo and the
 * podcast episode's audio.
 *
 * The name is about images by inheritance - it was the only use when it was born -, but
 * of images only the `accept` default and `ImageFieldPreview` are left, which is an
 * optional part like any other. The audio field is this very one, with
 * `accept={AUDIO_MIMETYPES}` and without the preview; copying it into a twin
 * `file-field` would duplicate the upload, the orphan and the submit lock for a name.
 *
 * It stores the attachment's `id`, never the file: whoever attaches points to the record, and
 * never the other way round. Removing the image means pointing at `null`, and the binary already
 * saved stays - replacing an avatar does not delete the previous one on purpose, and whoever
 * sweeps what is left is the backend's `node ace storages:prune`.
 *
 * The upload happens **on choice**, and not on the form's submit: the
 * `POST /storages` is an operation of its own, and the form only comes to know the
 * `id` after the file exists. That is what avoids a payload that references a
 * file that failed to upload.
 *
 * Compound because label, fallback initials and description were markup travelling
 * as props - `label="Enviar avatar"`, `fallback="JR"`. A screen that wants an
 * `<Alert>` in the description or no description writes that; with props, each
 * such variation becomes one more optional prop in here.
 */
export function ImageField({
  value,
  onValueChange,
  previewUrl,
  accept = IMAGE_MIMETYPES,
  id,
  children,
}: ImageFieldProps): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [preview, setPreview] = React.useState<string | null>(null)

  /**
   * The file that **this field** uploaded and that has not yet been saved anywhere.
   *
   * Only it can be deleted. The `value` that arrived by prop is the attachment already
   * saved on the entity: deleting it when replacing the image would break the record before
   * the form is submitted, and the backend would refuse with
   * `409 STORAGE_IN_USE` anyway - asking to receive an error is worse
   * than not asking.
   */
  const [orphan, setOrphan] = React.useState<string | null>(null)

  const remove = useStorageDeleteMutation({
    // Silent on purpose: it is cleanup, not an action the person asked for.
    // Failing here leaves an orphan file, which is exactly the state from before.
    onError: () => undefined,
  })

  const nextSignal = useAbortOnUnmount()

  const upload = useStorageCreateMutation({
    onSuccess(storage) {
      // Replacing the image twice in a row must not leave the first one
      // behind: the one leaving here was never referenced by anyone.
      if (orphan) remove.mutate(orphan)

      setOrphan(storage.id)
      onValueChange(storage.id)
      setPreview(storage.url)
    },
    onError(error) {
      // Type and size are refused by the server **before** saving - the
      // cap is its `UPLOAD_MAX_SIZE` -, so the message that comes back is the one that says
      // the real limit; repeating the number here would guarantee that the two
      // diverge.
      notifyError(error, { id: 'storage-create-error' })
    },
  })

  function onSelect(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.item(0)
    if (!file) return

    // The input's `accept` is only a hint for the native picker: the system
    // dialog lets one switch the filter to "all files", and dragging goes
    // through no filter at all. Refusing here spares the `POST /storages` and says
    // *which* file does not fit - the server would only say the type is invalid.
    if (!isStorageMimetype(file.type) || !accept.includes(file.type)) {
      toast.error(m.common_file_type_not_accepted({ name: file.name }), {
        id: 'storage-create-error',
      })
      event.target.value = ''
      return
    }

    upload.mutate({ file, signal: nextSignal() })
    // Without this, choosing the same file twice in a row does not fire
    // `change` again, and the second attempt after an error does not happen.
    event.target.value = ''
  }

  function clear(): void {
    if (orphan) {
      remove.mutate(orphan)
      setOrphan(null)
    }

    onValueChange(null)
    setPreview(null)
  }

  function openPicker(): void {
    inputRef.current?.click()
  }

  // Locks the submit while the file uploads: without it the payload leaves without the attachment's
  // `id`, and the record is born without an image.
  useRegisterUpload(upload.isPending)

  const shown = preview ?? previewUrl
  const hasImage = Boolean(value ?? shown)

  // No `useMemo`: the React Compiler memoizes the object by what it reads.
  const context = {
    shown,
    hasImage,
    isPending: upload.isPending,
    openPicker,
    clear,
    controlId: id,
  }

  return (
    <Field data-slot="image-field" orientation="horizontal" className="gap-4">
      <ImageFieldProvider value={context}>{children}</ImageFieldProvider>

      {/* The native `<input type="file">` cannot be styled, and hiding it behind
          a visible button is the only way to have a picker that looks like the
          rest. Not to be confused with the "zero hidden button" rule of
          [[dialog-pattern]]: there the target is an overlay trigger holding a `ref`,
          and here what opens the picker is the button the user sees. shadcn has no
          file piece - `AttachmentTrigger` is a `<button>`, not an input -,
          so this native element stays.

          It stays in `ImageField` and not in a part of its own: it is plumbing, not
          markup, and no screen has a reason to omit or reposition it. */}
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        onChange={onSelect}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
    </Field>
  )
}
