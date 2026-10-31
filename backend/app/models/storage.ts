import { column, scope } from '@adonisjs/lucid/orm'
import { type UploadStatus } from '@interclasse/shared'

import { StorageSchema } from '#database/schema'

/**
 * Neutral file record: key name, original label, type, size and
 * where the binary lives (`path`). The `url` is derived on read - never a
 * column, so changing bucket or CDN does not
 * require rewriting row by row.
 */
export default class Storage extends StorageSchema {
  /**
   * Only what has not been archived.
   *
   * The filter is a security one, and so lives in a single place: written by hand in each
   * query, it depends on someone remembering, and the query that forgets returns
   * an archived record without warning. A query that needs to see the archived asks for
   * `trashed` on purpose, and the one that does not ask cannot forget.
   */
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })

  /**
   * Redeclared only to narrow the type: `database/schema.ts` is generated from the
   * columns and delivers every enum as `string`, so without this a typo
   * (`'UPLOADEED'`) would compile and only show up on the next read.
   */
  @column()
  declare status: UploadStatus

  /**
   * Redeclared because `size` is `bigint` in the database - the upload ceiling comes from the
   * environment and exceeds `int4` -, and the driver returns `int8` as a string or
   * `BigInt` depending on the path. `consume` normalizes on read, otherwise `size`
   * goes out as a string on the wire and the response validator, which declares it a number,
   * refuses its own response.
   *
   * `Number` fits: the safe range of a `double` is 2^53 bytes, nine petabytes.
   */
  @column({ consume: (value: bigint | number | string) => Number(value) })
  declare size: number
}
