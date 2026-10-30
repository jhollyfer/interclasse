import type {
  Paginated,
  SortDirection,
  StoragesFileShowResponse,
  UploadStatus,
} from '@interclasse/shared'

import type { Storage } from '#domain/storage/storage.entity'

/**
 * O registro do arquivo na forma da resposta, sem a `url`: assinar é do use-case, pelo
 * contrato do bucket (`_standards/architecture.md` §2, `StorageContract.withUrl`).
 */
export type StorageFileRead = Omit<StoragesFileShowResponse, 'url'>

export type StorageListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly status?: UploadStatus
  readonly mimetype?: string
  readonly sort: 'originalName' | 'mimetype' | 'size' | 'createdAt'
  readonly direction: SortDirection
}

/**
 * A persistência do arquivo, por intenção (`_standards/domain.md` §5.1). O
 * escritor único da tabela `storages`; lê as colunas que apontam para ela só
 * para dizer onde o arquivo está em uso.
 */
export abstract class StorageRepository {
  /** O arquivo vivo, em qualquer estado do upload. */
  abstract findById(id: string): Promise<Storage | null>
  /** Leitura leve: o registro na forma da resposta, sem a URL. */
  abstract detail(id: string): Promise<StorageFileRead | null>
  /** O mesmo registro de vários ids de uma vez; id sem arquivo vivo fica de fora. */
  abstract detailsOf(ids: ReadonlyArray<string>): Promise<StorageFileRead[]>
  /** Todos os ids são de arquivo vivo e já confirmado (`UPLOADED`): só esses anexam. */
  abstract areAttachable(ids: ReadonlyArray<string>): Promise<boolean>
  /** Onde o arquivo está em uso, em rótulos legíveis; vazio quer dizer órfão. */
  abstract usedBy(id: string): Promise<string[]>
  abstract save(storage: Storage): Promise<void>
  /** Apaga a linha de vez: `storages` não tem lixeira. */
  abstract delete(storage: Storage): Promise<void>
  abstract paginate(criteria: StorageListCriteria): Promise<Paginated<StorageFileRead>>
}
