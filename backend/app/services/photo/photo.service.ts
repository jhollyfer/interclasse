import Photo from '#models/photo'
import Storage from '#models/storage'
import type User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { UPLOAD_STATUS, type PhotoStatus } from '#core/entity'

type Upload = { readonly storageId: string; readonly caption?: string | null }

/**
 * O envio de foto, o mesmo para o conselheiro e para o administrador: só muda
 * o estado em que ela nasce.
 *
 * Service porque consulta o banco, e um só para os dois use-cases de envio.
 */
export default class PhotoService {
  async create(
    upload: Upload,
    author: User,
    status: PhotoStatus,
  ): Promise<Either<HTTPException, Photo>> {
    const storage = await Storage.query()
      .where('id', upload.storageId)
      .where('status', UPLOAD_STATUS.UPLOADED)
      .withScopes((scopes) => scopes.notDeleted())
      .first()

    if (!storage)
      return left(
        HTTPException.UnprocessableEntity('Arquivo não encontrado', 'STORAGE_NOT_FOUND', {
          storageId: 'Arquivo não encontrado',
        }),
      )

    // O carrossel é de fotos: PDF ou áudio no lugar viraria imagem quebrada.
    if (!storage.mimetype.startsWith('image/'))
      return left(
        HTTPException.UnprocessableEntity('A foto precisa ser uma imagem', 'PHOTO_NOT_IMAGE', {
          storageId: 'Envie uma imagem (JPG, PNG, WebP ou GIF)',
        }),
      )

    const photo = await Photo.create({
      storageId: storage.id,
      caption: upload.caption ?? null,
      status,
      authorId: author.id,
    })
    await photo.refresh()
    await photo.load('storage')

    return right(photo)
  }
}
