import { UploadResume } from '@interclasse/shared'

import {
  listLocalThemes,
  readLocal,
  removeLocal,
  writeLocal,
} from './local-store'

/**
 * What the upload needs to remember to survive a reload.
 *
 * Without this, resuming only covers a network drop: the `storageId` lives in
 * a component variable, and reloading the page loses it. The upload would keep
 * existing on the server, open and invisible, and the user would restart from zero a
 * file that is already 90% in the bucket.
 *
 * `localStorage` and not TanStack's query cache: what is wanted is precisely
 * what crosses the reload, and the cache does not.
 */

export type ResumeEntry = Omit<UploadResume, 'savedAt'>

const THEME_PREFIX = 'upload:'

/**
 * How long a resume keeps making sense, in ms.
 *
 * Twenty-four hours because it is the window of `node ace storages:prune`: after
 * that the server has already deleted the abandoned upload, and the entry points to a
 * `storageId` that no longer exists. Without the deadline it stayed forever - whoever
 * closes the tab mid-upload never comes back to clean it, and the only thing
 * that removed it was the `404` of a resume the user had to attempt.
 */
const TTL = 24 * 60 * 60 * 1000

/**
 * A local file's identity, to find its upload again.
 *
 * Name, size and modification date - what the File API gives without reading the content.
 * It is not a hash: computing a hash of a large file costs as much as
 * sending it, and what is wanted here is to recognize "it is the same file I was
 * sending a minute ago", not to prove identity against the world.
 *
 * The risk is recognizing as equal a swapped file that matches on all three
 * fields. The confirmation catches the case: the size declared on the server will not
 * match what went up, and the answer is `422`.
 */
export function resumeTheme(file: File): string {
  return `${THEME_PREFIX}${file.name}:${file.size}:${file.lastModified}`
}

export function readResume(file: File): ResumeEntry | null {
  const theme = resumeTheme(file)
  const entry = readLocal({
    theme,
    schema: UploadResume.nullable(),
    fallback: null,
  })

  if (!entry) return null

  if (expired(entry)) {
    removeLocal(theme)
    return null
  }

  // Without `savedAt`: it is this module's bookkeeping, not part of what the
  // upload needs to know to resume.
  return {
    storageId: entry.storageId,
    uploadId: entry.uploadId,
    partSize: entry.partSize,
  }
}

export function writeResume(file: File, entry: ResumeEntry): void {
  sweep()
  writeLocal(resumeTheme(file), { ...entry, savedAt: Date.now() })
}

export function clearResume(file: File): void {
  removeLocal(resumeTheme(file))
}

/**
 * Deletes the expired resumes of **all** files, and not only the one of the file
 * being sent now.
 *
 * `readResume` only reaches the entry of a file the user tried again,
 * and most are not tried again - that is exactly why they
 * pile up. The sweep goes together with the write because it is the only moment when
 * this module is called knowing it is going to touch the disk anyway.
 */
function sweep(): void {
  for (const theme of listLocalThemes(THEME_PREFIX)) {
    const entry = readLocal({
      theme,
      schema: UploadResume.nullable(),
      fallback: null,
    })

    // Unreadable counts as expired: there is no way to resume from it.
    if (!entry || expired(entry)) removeLocal(theme)
  }
}

function expired(entry: UploadResume): boolean {
  return Date.now() - entry.savedAt > TTL
}
