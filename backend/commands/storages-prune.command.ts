import { BaseCommand, flags } from '@adonisjs/core/ace'
import { DateTime } from 'luxon'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/** How many hours a `PENDING` may stay up before it is considered abandoned. */
const DEFAULT_HOURS = 24

/**
 * Deletes the uploads that started and never finished.
 *
 * The upload has three steps and the binary does not pass through here:
 * `POST /storages` writes the `PENDING` row and signs the URLs, the client uploads the
 * parts straight to the bucket, and `POST /storages/:id/complete` confirms. Whoever
 * closes the tab midway never reaches the third step, and nothing else returns to that
 * row - `DELETE` is the explicit cancellation, and nobody calls it for an upload
 * already forgotten.
 *
 * What is left is not just a dead row. The parts already sent live under the
 * `uploadId`, do not show in the bucket's object listing, and keep being billed -
 * it is garbage only the multipart abort reaches. Without this sweep the state
 * machine never closes: `PENDING` is the only state one never leaves.
 *
 * Reuses `StoragesFileDeleteUseCase` instead of repeating the abort here: deleting a
 * `PENDING` is exactly what `DELETE` already does, and two implementations of the
 * same thing leaves one behind. The reference rule is no obstacle -
 * `assertExist` refuses to attach what is not `UPLOADED`, so a `PENDING`
 * cannot be in use.
 *
 * There is no scheduler inside the application: this is a command, and whoever
 * repeats it is the environment (host cron, Kubernetes `CronJob`). Running on two
 * replicas at the same time is harmless - the second finds the row already deleted
 * and counts it as absent.
 */
export default class StoragesPrune extends BaseCommand {
  static override commandName = 'storages:prune'
  static override description =
    'Deletes the abandoned PENDING uploads and aborts the multipart of each one'

  static override options: CommandOptions = { startApp: true }

  @flags.number({
    description: `Minimum age, in hours, to consider a PENDING abandoned (default: ${DEFAULT_HOURS})`,
  })
  declare hours: number

  @flags.boolean({
    description: 'Lists what would be deleted without deleting anything',
  })
  declare dryRun: boolean

  override async run() {
    const { default: Storage } = await import('#models/storage')
    const { default: StoragesFileDeleteUseCase } =
      await import('#features/storages/files/delete/delete.use-case')
    const { UPLOAD_STATUS } = await import('@interclasse/shared')

    const hours = this.hours ?? DEFAULT_HOURS
    const cutoff = DateTime.now().minus({ hours })

    // The column order is that of the index `storages_status_created_at_index`.
    const abandoned = await Storage.query()
      .where('status', UPLOAD_STATUS.PENDING)
      .where('createdAt', '<', cutoff.toSQL() ?? '')
      .orderBy('createdAt', 'asc')

    if (abandoned.length === 0) {
      this.logger.info(`No PENDING upload older than ${hours}h.`)
      return
    }

    if (this.dryRun) {
      for (const storage of abandoned) {
        this.logger.info(`${storage.id} ${storage.originalName} (${storage.createdAt?.toISO()})`)
      }

      this.logger.info(`${abandoned.length} upload(s) would be deleted. Nothing was touched.`)
      return
    }

    const useCase = await this.app.container.make(StoragesFileDeleteUseCase)

    let removed = 0
    let failed = 0

    for (const storage of abandoned) {
      // An error on one row does not bring down the batch: the bucket may refuse to abort
      // an `uploadId` it no longer knows, and the next sweep would never get past the
      // first row if that interrupted it.
      try {
        const result = await useCase.execute({ id: storage.id })

        if (result.isLeft()) {
          failed += 1
          this.logger.warning(`${storage.id}: ${result.value.message}`)
          continue
        }

        removed += 1
      } catch (error) {
        failed += 1
        this.logger.warning(`${storage.id}: ${this.messageOf(error)}`)
      }
    }

    this.logger.success(`${removed} upload(s) deleted, ${failed} failed.`)

    if (failed > 0) this.exitCode = 1
  }

  /**
   * The message of any error, for logging: `catch` hands over `unknown`, and
   * interpolating a non-`Error` straight into the template would come out `[object Object]`.
   */
  private messageOf(error: unknown): string {
    if (error instanceof Error) return error.message

    return String(error)
  }
}
