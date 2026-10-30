import type { HttpContext } from '@adonisjs/core/http'

/**
 * A resposta de um CSV para baixar: os headers num lugar só.
 *
 * `Cache-Control: no-store` porque a resposta é autenticada e carrega dado de
 * quem pediu - nenhum cache compartilhado nem do navegador pode guardá-la
 * (_standards/backend.md §4.10, "Resposta autenticada não é cacheável"). O
 * `Content-Disposition: attachment` faz o navegador salvar o arquivo em vez de
 * renderizá-lo.
 */
export function csvDownload(response: HttpContext['response'], filename: string, content: string) {
  response.header('Content-Type', 'text/csv; charset=utf-8')
  response.header('Content-Disposition', `attachment; filename="${filename}"`)
  response.header('Cache-Control', 'no-store')

  return response.ok(content)
}
