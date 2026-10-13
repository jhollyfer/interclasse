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

function apiUrl(value: string | undefined): string {
  if (!value) return DEV_API_URL

  if (!URL.canParse(value)) {
    throw new Error(`VITE_API_URL não é uma URL: "${value}".`)
  }

  // `request()` faz `BASE_URL.concat(path)` com o caminho começando em `/`: uma
  // barra no fim viraria `//storefront` na requisição.
  if (value.endsWith('/')) {
    throw new Error(`VITE_API_URL não pode terminar em "/": "${value}".`)
  }

  return value
}

export const env = {
  VITE_API_URL: apiUrl(import.meta.env.VITE_API_URL),
} as const
