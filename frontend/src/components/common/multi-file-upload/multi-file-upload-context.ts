import * as React from 'react'

/** Where each file in the queue stands. */
export type UploadItemStatus = 'uploading' | 'done' | 'failed'

export type UploadItem = {
  key: string
  name: string
  /** 0 a 100. */
  percent: number
  status: UploadItemStatus
  /** The attachment's `id`, once uploaded. It is what goes in the payload. */
  storageId: string | null
}

/**
 * What the whole field shares: the queue and the two actions. The visible parts
 * only read the result; the texts are markup and stay outside (slot).
 */
export type MultiFileUploadContextValue = {
  items: ReadonlyArray<UploadItem>
  /** Opens the native picker, which is hidden inside `MultiFileUpload`. */
  openPicker: () => void
  /** Removes from the queue; a file already uploaded and unowned is deleted from storage. */
  remove: (key: string) => void
  /** Is any file uploading? Locks the add button. */
  isUploading: boolean
  /** Goes on the button that opens the picker, so the `<label>` points at something focusable. */
  controlId: string | undefined
}

const MultiFileUploadContext =
  React.createContext<MultiFileUploadContextValue | null>(null)

export const MultiFileUploadProvider = MultiFileUploadContext.Provider

/**
 * The field, for whoever is inside `MultiFileUpload`.
 *
 * The `consumer` goes into the message so the error says **which** part was left outside the
 * provider.
 */
export function useMultiFileUploadContext(
  consumer: string,
): MultiFileUploadContextValue {
  const context = React.use(MultiFileUploadContext)

  if (!context) {
    throw new Error(
      `\`${consumer}\` precisa estar dentro de \`MultiFileUpload\``,
    )
  }

  return context
}
