/**
 * As variáveis de build do frontend, lidas uma vez e checadas aqui.
 *
 * Só `VITE_*`: o Vite as substitui no bundle em tempo de build, então tudo que
 * passa por este arquivo é público. A checagem é síncrona e à mão, sem schema
 * que resolva promessa - o módulo roda antes de o router montar, e um valor
 * torto tem de parar o boot com a mensagem certa em vez de virar requisição
 * para um endereço quebrado.
 *
 * O que é de runtime do servidor (`SERVER_API_URL`) não entra: é lido por
 * requisição dentro do `.server()` de `integrations/tanstack-query/http.ts`.
 */

/** Sem `VITE_API_URL`, o `localhost:3333` que o `pnpm dev` do backend sobe. */
const DEV_API_URL = 'http://localhost:3333'

/** Sem `VITE_SITE_URL`, o `localhost:3001` que o `pnpm dev` do frontend sobe. */
const DEV_SITE_URL = 'http://localhost:3001'

/**
 * Uma URL pública de build: ausente vale o fallback de desenvolvimento, e
 * valor torto para o boot com a mensagem certa.
 *
 * Sem barra no fim: `request()` faz `BASE_URL.concat(path)` com o caminho
 * começando em `/` (uma barra viraria `//storefront`), e o `canonical` e o
 * `hreflang` somam o caminho ao endereço do site.
 */
function publicUrl(
  name: string,
  value: string | undefined,
  fallback: string,
): string {
  if (!value) return fallback

  if (!URL.canParse(value)) {
    throw new Error(`${name} não é uma URL: "${value}".`)
  }

  if (value.endsWith('/')) {
    throw new Error(`${name} não pode terminar em "/": "${value}".`)
  }

  return value
}

export const env = {
  VITE_API_URL: publicUrl(
    'VITE_API_URL',
    import.meta.env.VITE_API_URL,
    DEV_API_URL,
  ),
  /**
   * O endereço público do site: a base do `canonical`, dos `hreflang` e do
   * sitemap, que precisam de URL absoluta que o SSR não tem como descobrir.
   */
  VITE_SITE_URL: publicUrl(
    'VITE_SITE_URL',
    import.meta.env.VITE_SITE_URL,
    DEV_SITE_URL,
  ),
} as const
