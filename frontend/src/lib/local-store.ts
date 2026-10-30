import type { z } from '@interclasse/shared'

/**
 * A casa única do `localStorage` (`frontend.md` §2): nenhum componente nem
 * módulo toca nele direto.
 *
 * - **Chave versionada** `<app>:<tema>:v1`. Subir a versão descarta o que está
 *   gravado, que é o único jeito de corrigir um formato durável que já nasceu
 *   errado.
 * - **Leitura em `try/catch`**: o storage não existe no SSR e lança com a cota
 *   cheia ou em modo restrito. Perder a preferência é aceitável; derrubar a
 *   tela por causa dela, não.
 * - **Valor `unknown` convertido pelo schema** de `@interclasse/shared`
 *   (`typescript.md` §2), com o default quando o parse falha: o que está
 *   gravado sobrevive a deploy, e a forma de ontem não é garantia da de hoje.
 */

const APP = 'interclasse'
const VERSION = 'v1'

/** A chave completa de um tema: `interclasse:<tema>:v1`. */
export function localStoreKey(theme: string): string {
  return `${APP}:${theme}:${VERSION}`
}

type ReadLocalInput<TSchema extends z.ZodType> = Readonly<{
  theme: string
  schema: TSchema
  /** O que volta quando não há nada gravado ou o que há não bate com o schema. */
  fallback: z.infer<TSchema>
}>

/** Lê e valida um tema; o `fallback` cobre ausência, JSON torto e forma antiga. */
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

/** Grava um tema. Sem cota ou sem storage, a preferência não persiste e a tela segue. */
export function writeLocal(theme: string, value: unknown): void {
  try {
    globalThis.localStorage.setItem(localStoreKey(theme), JSON.stringify(value))
  } catch {
    // Cota estourada, modo privativo ou SSR.
  }
}

export function removeLocal(theme: string): void {
  try {
    globalThis.localStorage.removeItem(localStoreKey(theme))
  } catch {
    // Idem.
  }
}

/** Os temas gravados que começam com `themePrefix`, para varredura de vencidos. */
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
    // Sem storage não há o que varrer.
  }

  return themes
}
