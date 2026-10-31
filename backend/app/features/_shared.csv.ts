import type { HttpContext } from '@adonisjs/core/http'

/**
 * The response for a CSV download: the headers live in one place.
 *
 * `Cache-Control: no-store` because the response is authenticated and carries the
 * requester's data - no shared or browser cache may keep it
 * (_standards/backend.md §4.10, "Authenticated response is not cacheable").
 * `Content-Disposition: attachment` makes the browser save the file instead of
 * rendering it.
 */
export function csvDownload(response: HttpContext['response'], filename: string, content: string) {
  response.header('Content-Type', 'text/csv; charset=utf-8')
  response.header('Content-Disposition', `attachment; filename="${filename}"`)
  response.header('Cache-Control', 'no-store')

  return response.ok(content)
}
