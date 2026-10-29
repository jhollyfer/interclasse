import string from '@adonisjs/core/helpers/string'

/** O teto da coluna `slug` de `sports`. */
const MAX_LENGTH = 255

/**
 * A normalização única de slug do projeto, função pura (_standards/backend.md
 * §4.9): o `SlugService` a expõe por injeção, e o que precisar dela fora de
 * um container (seeder, script) a lê daqui.
 *
 * `strict` descarta o que não é letra, dígito ou separador. Sem ele
 * `string.slug` preserva pontuação, e "Chegou o verão!!" viraria
 * `chegou-o-verao!!`, com a exclamação indo parar na URL.
 *
 * O corte não é zelo: `string.slug` **traduz** caracteres em vez de
 * descartá-los (`%` vira `percent`, `&` vira `and`), então um título longo
 * gera um slug muito maior que ele e estoura a coluna. O corte não deixa
 * hífen pendurado: `festival-de-` não é slug.
 */
export function normalizeSlug(value: string): string {
  const slug = string.slug(value, { lower: true, trim: true, strict: true })

  if (slug.length <= MAX_LENGTH) return slug

  return slug.slice(0, MAX_LENGTH).replace(/-+$/, '')
}
