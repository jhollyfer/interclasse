import string from '@adonisjs/core/helpers/string'

/** O teto da coluna `slug` de `sports`. */
const MAX_LENGTH = 255

/**
 * Corta sem deixar hífen pendurado: `slice` cai no meio de um separador tanto
 * quanto no meio de uma palavra, e `festival-de-` não é slug.
 */
function cut(slug: string, max: number): string {
  if (slug.length <= max) return slug

  return slug.slice(0, max).replace(/-+$/, '')
}

/**
 * Os identificadores de URL do sistema.
 *
 * Um serviço para uma normalização só porque ela é **a mesma** nos dois
 * caminhos que geram slug: o derivado do título e o digitado no formulário.
 * Duas chamadas de `string.slug` com opções escritas à mão divergiriam, e a
 * divergência apareceria como URL quebrada na vitrine, nunca como erro.
 *
 * Sem deduplicação por sufixo: quem cadastra é a organização, e slug repetido é
 * conflito a resolver - `409` apontando o campo -, não empate a desempatar
 * sozinho.
 */
export default class SlugService {
  /**
   * A normalização única do projeto. O slug enviado num payload passa por aqui
   * também: aceitar o valor cru deixaria a URL pública quebrada.
   *
   * `strict` descarta o que não é letra, dígito ou separador. Sem ele
   * `string.slug` preserva pontuação, e "Chegou o verão!!" viraria
   * `chegou-o-verao!!`, com a exclamação indo parar na URL.
   *
   * O corte não é zelo: `string.slug` **traduz** caracteres em vez de
   * descartá-los (`%` vira `percent`, `&` vira `and`), então um título longo
   * gera um slug muito maior que ele e estoura a coluna. Limitar o campo de
   * origem no validator não fecha esse caminho, porque a razão do estouro é a
   * expansão e não o tamanho do que foi digitado.
   */
  normalize(value: string): string {
    return cut(string.slug(value, { lower: true, trim: true, strict: true }), MAX_LENGTH)
  }
}
