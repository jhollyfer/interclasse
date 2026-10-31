import * as React from 'react'

type UploadingContextValue = {
  register: (key: string) => void
  unregister: (key: string) => void
  isUploading: boolean
}

const UploadingContext = React.createContext<UploadingContextValue | null>(null)

/**
 * Who is uploading a file, right now, anywhere in the tree.
 *
 * It exists because of the submit: the upload happens when the file is chosen and the
 * form only knows the `id` after the file exists. Without this, saving
 * while the bar is still running sends a payload without the attachment - and the record is born
 * without an image, with no error to give it away.
 *
 * A `Set` of keys and not a counter: two upload fields on the same screen
 * register and cancel in unpredictable orders, and a counter that goes down twice
 * for the same field reaches zero with the other still in flight.
 */
export function UploadingProvider({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.JSX.Element {
  const [uploads, setUploads] = React.useState<Set<string>>(new Set())

  function register(key: string): void {
    setUploads((previous) => {
      if (previous.has(key)) return previous

      const next = new Set(previous)
      next.add(key)
      return next
    })
  }

  function unregister(key: string): void {
    setUploads((previous) => {
      if (!previous.has(key)) return previous

      const next = new Set(previous)
      next.delete(key)
      return next
    })
  }

  const value = { register, unregister, isUploading: uploads.size > 0 }

  return <UploadingContext value={value}>{children}</UploadingContext>
}

/**
 * Registers this field as busy while `active` is true.
 *
 * Outside an `UploadingProvider` it does nothing - the upload field keeps
 * working, it is just that nobody is asking whether it finished.
 */
export function useRegisterUpload(active: boolean): void {
  const context = React.use(UploadingContext)
  const key = React.useId()

  // `useEffectEvent`: the effect reacts only to `active`. The context changes
  // identity on every provider render (register/unregister are new functions
  // without the manual memo), and having it in the dependencies would cancel and redo the
  // registration in a loop.
  const sync = React.useEffectEvent((on: boolean): void => {
    if (!context) return

    if (on) context.register(key)
    if (!on) context.unregister(key)
  })

  React.useEffect(() => {
    sync(active)

    // Unmounting with an upload in flight must release the lock, otherwise the save
    // button stays locked forever.
    return () => sync(false)
  }, [active])
}

/** Is an upload in progress? Use it to disable the save button. */
export function useIsUploading(): boolean {
  const context = React.use(UploadingContext)

  return context?.isUploading ?? false
}
