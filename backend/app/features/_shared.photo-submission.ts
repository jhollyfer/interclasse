import { randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import { left, right, type AdministratorPhotoShowResponse, type Either } from '@interclasse/shared'

import { PhotoRefusal } from '#features/administrator/photos/_shared.photo-refusal'
import { Photo, type PhotoSender } from '#domain/photo/photo.entity'
import { PhotoRepository } from '#repositories/photo/photo.repository'
import HTTPException from '#exceptions/http.exception'

type Submission = {
  readonly storageId: string
  readonly caption?: string | null
  readonly author: { readonly id: string }
  readonly sender: PhotoSender
}

/**
 * O envio de foto, o mesmo para o conselheiro e para o painel: só muda quem
 * envia, e com isso o estado em que a foto nasce (a entidade decide). Fica aqui
 * e não em cada use-case para a regra do arquivo não existir em dois lugares
 * (`_standards/architecture.md` §3, `_shared`).
 *
 * Erro de infraestrutura sobe: quem trata é o try/catch do use-case.
 */
@inject()
export class PhotoSubmission {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly i18n: I18n,
  ) {}

  async submit(input: Submission): Promise<Either<HTTPException, AdministratorPhotoShowResponse>> {
    const storage = await this.photos.findUploadedStorage(input.storageId)
    if (!storage) return left(PhotoRefusal.storageNotFound(this.i18n))

    const created = Photo.create({
      id: randomUUID(),
      storage,
      caption: input.caption,
      author: input.author,
      sender: input.sender,
      now: new Date(),
    })
    if (created.isLeft()) return left(PhotoRefusal.http(created.value, this.i18n))

    await this.photos.save(created.value)
    const shown = await this.photos.show(created.value.id)
    if (!shown) throw new Error('foto gravada e não encontrada')

    return right(shown)
  }
}
