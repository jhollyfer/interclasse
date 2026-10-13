import { normalizeSlug } from '#features/_shared.slug'

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
  /** A normalização única do projeto; o slug enviado num payload passa por aqui também. */
  normalize(value: string): string {
    return normalizeSlug(value)
  }
}
