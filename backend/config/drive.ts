import { defineConfig, services } from '@adonisjs/drive'
import type { InferDriveDisks } from '@adonisjs/drive/types'
import type { S3ClientConfig } from '@aws-sdk/client-s3'

import env from '#start/env'

/**
 * File storage: one S3-compatible bucket, the same in every environment.
 * MinIO in dev and tests, and in production whatever the environment points to.
 *
 * Only one destination because the upload is presigned multipart, and multipart is S3 API
 * - the `fs` driver does not have it. A local disk in dev would exercise a code path
 * that production does not use, which is exactly what a single destination avoids.
 *
 * The credentials come from `STORAGE_*`, not from a per-vendor prefix: what
 * the code depends on is the protocol. R2, S3, Spaces, Linode and MinIO swap
 * places by changing `STORAGE_ENDPOINT`.
 */
export const bucket = env.get('STORAGE_BUCKET')

/**
 * The bucket connection, exported because it has **two** consumers: the
 * FlyDrive below, and the `MultipartService`, which talks to the AWS SDK
 * directly - FlyDrive does not expose multipart (`CreateMultipartUpload` and company).
 *
 * One constant and not two `env` reads: two places reading the same
 * variables is where one of them gets forgotten the day the connection changes.
 */
export const clientConfig: S3ClientConfig = {
  credentials: {
    accessKeyId: env.get('STORAGE_KEY'),
    secretAccessKey: env.get('STORAGE_SECRET'),
  },
  region: 'auto',
  endpoint: env.get('STORAGE_ENDPOINT'),
  forcePathStyle: env.get('STORAGE_FORCE_PATH_STYLE') ?? false,

  // The SDK default is `WHEN_SUPPORTED`, and it breaks signed URLs: in presign
  // there is no body, so the checksum that goes into the query is the one of **zero bytes**
  // (`x-amz-checksum-crc32=AAAAAA==`). The browser sends the real file,
  // the bucket checks it against that value and refuses the `PUT`. With `WHEN_REQUIRED`
  // the checksum only enters where the operation requires it, and none of ours does.
  requestChecksumCalculation: 'WHEN_REQUIRED',
}

/**
 * How long a read URL is valid.
 *
 * The disk is private, so there is no permanent address for an object: every
 * read comes out signed. Fifteen minutes covers the life of an open page without
 * leaving an address in circulation - a copied link expires before serving whoever
 * should not see it.
 *
 * The cost is the cache: the URL changes on every read, and the CDN does not reuse it. On a
 * page with many images that weighs, and the way out, if it does, is to round the
 * signing date to the hour slice - the URL stays stable inside the window and
 * becomes cacheable again, without changing the security model.
 *
 * **This value has a counterpart in the frontend, and nothing links the two.** The signed
 * `url` travels inside the response, so the client cache stores it along: a query
 * with `staleTime` above this period serves an avatar with an expired URL, and the failure
 * shows up as a broken image, with no error anywhere. Today the client ceiling
 * is five minutes (`accountQueryOptions`), with the global at one. Lowering this
 * TTL, or raising that one, requires touching both - which is why the number is
 * written in both places instead of only here.
 */
export const URL_TTL = '15 mins'

const driveConfig = defineConfig({
  default: 'r2',

  services: {
    // `private`, and therefore there is no `cdnUrl`: with the private disk FlyDrive's
    // `getUrl` no longer works, and every read is signed. Without this,
    // every object in the bucket is readable by whoever knows the address - including the
    // not yet confirmed upload and the file no row references.
    r2: services.s3({ ...clientConfig, bucket, visibility: 'private' }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
