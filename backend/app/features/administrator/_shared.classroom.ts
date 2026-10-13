import { CATEGORY, type Category } from '#core/entity'

/**
 * A categoria que o ano determina. Derivada, e nunca enviada pelo cliente: um
 * 9º ano gravado como `F1` jogaria contra crianças de 8 anos.
 */
export function categoryOf(grade: number): Category {
  if (grade <= 5) return CATEGORY.F1

  return CATEGORY.F2
}
