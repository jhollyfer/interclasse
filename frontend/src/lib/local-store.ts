import type { z } from '@interclasse/shared'

/**
 * The single home of `localStorage` (`frontend.md` §2): no component or
 * module touches it directly.
 *
 * - **Versioned key** `<app>:<theme>:v1`. Bumping the version discards what is
 *   stored, which is the only way to fix a durable format that was born
 *   wrong.
 * - **Read in `try/catch`**: the storage does not exist on SSR and throws with a full
 *   quota or in restricted mode. Losing the preference is acceptable; bringing the
 *   screen down because of it is not.
 * - **`unknown` value converted by the schema** from `@interclasse/shared`
 *   (`typescript.md` §2), with the default when the parse fails: what is stored
 *   survives a deploy, and yesterday's shape is no guarantee of today's.
 */

const APP = 'interclasse'
const VERSION = 'v1'

/** The full key of a theme: `interclasse:<theme>:v1`. */
export function localStoreKey(theme: string): string {
  return `${APP}:${theme}:${VERSION}`
}

type ReadLocalInput<TSchema extends z.ZodType> = Readonly<{
  theme: string
  schema: TSchema
  /** What comes back when nothing is stored or what is stored does not match the schema. */
  fallback: z.infer<TSchema>
}>

/** Reads and validates a theme; the `fallback` covers absence, crooked JSON and an old shape. */
export function readLocal<TSchema extends z.ZodType>({
  theme,
  schema,
  fallback,
}: ReadLocalInput<TSchema>): z.infer<TSchema> {
  try {
    const raw = globalThis.localStorage.getItem(localStoreKey(theme))
    if (raw === null) return fallback

    const parsed: unknown = JSON.parse(raw)
    const result = schema.safeParse(parsed)
    if (!result.success) return fallback

    return result.data
  } catch {
    return fallback
  }
}

/** Saves a theme. Without quota or without storage, the preference does not persist and the screen carries on. */
export function writeLocal(theme: string, value: unknown): void {
  try {
    globalThis.localStorage.setItem(localStoreKey(theme), JSON.stringify(value))
  } catch {
    // Quota exceeded, private mode or SSR.
  }
}

export function removeLocal(theme: string): void {
  try {
    globalThis.localStorage.removeItem(localStoreKey(theme))
  } catch {
    // Idem.
  }
}

/** The stored themes that start with `themePrefix`, for sweeping expired ones. */
export function listLocalThemes(themePrefix: string): Array<string> {
  const head = `${APP}:${themePrefix}`
  const tail = `:${VERSION}`
  const themes: Array<string> = []

  try {
    for (let index = 0; index < globalThis.localStorage.length; index += 1) {
      const key = globalThis.localStorage.key(index)

      if (!key?.startsWith(head) || !key.endsWith(tail)) continue

      themes.push(key.slice(APP.length + 1, key.length - tail.length))
    }
  } catch {
    // Without storage there is nothing to sweep.
  }

  return themes
}
