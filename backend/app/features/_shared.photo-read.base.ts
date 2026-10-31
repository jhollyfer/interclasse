import { type I18n } from '@adonisjs/i18n'
import type { AdministratorPhotoShowResponse, Paginated } from '@interclasse/shared'

import type { PhotoRead, PhotoRepository } from '#repositories/photo/photo.repository'
import type { StorageContract } from '#services/storage/storage.contract'

/**
 * Reading the panel photo, the same for the administrator and the advisor. The
 * repository returns the photo without the file `url` (`_standards/architecture.md`
 * §2); here it is signed, in one place only, by the bucket contract (template method,
 * `_standards/backend.md` §4.2).
 */
export abstract class PhotoReadBase {
  protected constructor(
    protected readonly photos: PhotoRepository,
    protected readonly bucket: StorageContract,
    protected readonly i18n: I18n,
  ) {}

  protected async signed(photo: PhotoRead): Promise<AdministratorPhotoShowResponse> {
    return { ...photo, storage: await this.bucket.withUrl(photo.storage) }
  }

  protected async signedPage(
    page: Paginated<PhotoRead>,
  ): Promise<Paginated<AdministratorPhotoShowResponse>> {
    return {
      meta: page.meta,
      data: await Promise.all(page.data.map((photo) => this.signed(photo))),
    }
  }
}
