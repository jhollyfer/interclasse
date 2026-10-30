import { type I18n } from '@adonisjs/i18n'
import type { AdministratorPhotoShowResponse, Paginated } from '@interclasse/shared'

import type { PhotoRead, PhotoRepository } from '#repositories/photo/photo.repository'
import type { StorageContract } from '#services/storage/storage.contract'

/**
 * A leitura da foto do painel, a mesma para o administrador e o conselheiro. O
 * repository devolve a foto sem a `url` do arquivo (`_standards/architecture.md`
 * §2); aqui ela é assinada, num ponto só, pelo contrato do bucket (template method,
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
