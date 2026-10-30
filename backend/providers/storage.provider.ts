import { S3Client } from '@aws-sdk/client-s3'
import type { ApplicationService } from '@adonisjs/core/types'

import { clientConfig } from '#config/drive'
import { MultipartContract } from '#services/multipart/multipart.contract'
import MultipartService from '#services/multipart/multipart.service'
import { StorageContract } from '#services/storage/storage.contract'
import StorageService from '#services/storage/storage.service'

/**
 * O composition root do storage: o cliente S3 e os contratos de I/O externo
 * ligados aos concretos (_standards/solid.md §2). A URL assinada de leitura não
 * nasce aqui: o repository a assina pelo `StorageContract` (_standards/backend.md §4.7).
 *
 * `singleton` para o cliente: ele carrega o pool de conexões HTTP, e um por
 * requisição jogaria fora o keep-alive a cada upload. Os services são `bind`:
 * sem estado, o container os monta por requisição.
 */
export default class StorageProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(S3Client, () => new S3Client(clientConfig))
    this.app.container.bind(StorageContract, () => this.app.container.make(StorageService))
    this.app.container.bind(MultipartContract, () => this.app.container.make(MultipartService))
  }

  async shutdown() {
    const client = await this.app.container.make(S3Client)

    client.destroy()
  }
}
