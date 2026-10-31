import { defineConfig, stores } from '@adonisjs/limiter'
import type { InferLimiters } from '@adonisjs/limiter/types'

/**
 * The attempt limiter.
 *
 * It exists for the classic reason: `sign-in` and `sign-up` are the doors where trying
 * many times is the attack, and the upload hands out signed bucket URLs - without a ceiling,
 * a shell loop fills the bucket without going through any screen.
 *
 * Only the `database` store: this project has no Redis - neither the dependency, nor
 * `REDIS_URL`, nor a compose service. Declaring the `redis` store here would make the
 * container try to resolve a binding that does not exist and bring down the boot. When
 * the project gets Redis, it goes in here and becomes the default: counting attempts is a hot write and is not worth occupying the database connection.
 */
const limiterConfig = defineConfig({
  default: 'database',

  stores: {
    database: stores.database({
      tableName: 'rate_limits',
      // The counter row is not domain data: leaving it behind would fill
      // the table with keys that have already expired.
      clearExpiredByTimeout: true,
    }),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
