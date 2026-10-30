import adonis from '@adonisjs/prettier-config'

/**
 * O `@adonisjs/prettier-config`, com a vírgula final em toda lista
 * (_standards/tooling.md §5): `semi: false` e `singleQuote` já vêm dele.
 */
export default {
  ...adonis,
  trailingComma: 'all',
}
