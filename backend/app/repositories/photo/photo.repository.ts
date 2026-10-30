import type {
  AdministratorPhotoShowResponse,
  Paginated,
  PhotoStatus,
  StorefrontPhotoShowResponse,
} from '@interclasse/shared'

import type { Photo } from '#domain/photo/photo.entity'

/**
 * A foto na forma da resposta do painel, com o arquivo sem a `url`: assinar é do
 * use-case, pelo contrato do bucket (`_standards/architecture.md` §2).
 */
export type PhotoRead = Omit<AdministratorPhotoShowResponse, 'storage'> & {
  readonly storage: Omit<AdministratorPhotoShowResponse['storage'], 'url'>
}

/** A foto aprovada do site: a resposta sem a `url`, com o `path` para o use-case assinar. */
export type ApprovedPhotoRead = Omit<StorefrontPhotoShowResponse, 'url'> & {
  readonly path: string
}

export type PhotoListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly status?: PhotoStatus
  /** Só as fotos enviadas por esta conta: a lista do conselheiro. */
  readonly authorId?: string
}

/** O arquivo, no que a foto precisa saber dele. */
export type PhotoStorage = {
  readonly id: string
  readonly mimetype: string
}

/**
 * A persistência da foto, por intenção (`_standards/domain.md` §5.1). O escritor
 * único da tabela `photos`; lê `storages` e `users` só para responder.
 */
export abstract class PhotoRepository {
  abstract findById(id: string): Promise<Photo | null>
  /** A foto de quem a enviou: a de outro volta `null`, igual à que não existe. */
  abstract findOwned(id: string, authorId: string): Promise<Photo | null>
  /** O arquivo já enviado por inteiro e não arquivado; `null` se não houver. */
  abstract findUploadedStorage(storageId: string): Promise<PhotoStorage | null>
  abstract save(photo: Photo): Promise<void>
  abstract delete(photo: Photo): Promise<void>
  /** Leitura leve: a foto com o arquivo e quem enviou, direto da query. */
  abstract show(id: string): Promise<PhotoRead | null>
  abstract paginate(criteria: PhotoListCriteria): Promise<Paginated<PhotoRead>>
  /** O carrossel do site: só as aprovadas, sem autor. */
  abstract paginateApproved(criteria: {
    readonly page: number
    readonly perPage: number
  }): Promise<Paginated<ApprovedPhotoRead>>
}
