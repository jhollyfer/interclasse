import { S3Client } from '@aws-sdk/client-s3'
import type { ApplicationService } from '@adonisjs/core/types'

import { clientConfig } from '#config/drive'
import Storage from '#models/storage'
import { MultipartContract } from '#services/multipart/multipart-contract.service'
import MultipartService from '#services/multipart/multipart.service'
import { StorageContract } from '#services/storage/storage-contract.service'
import StorageService from '#services/storage/storage.service'

/**
 * O composition root do storage: o cliente S3, os contratos de I/O externo
 * ligados aos concretos (_standards/solid.md §2) e a URL assinada de leitura.
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

  /**
   * A `url` de todo `Storage` lido - inclusive por `preload` - é assinada aqui,
   * e não num hook dentro do model: o model não faz I/O (_standards/backend.md
   * §4.7), e a assinatura passa pelo contrato, que um teste troca. É hook
   * porque `getSignedUrl` é assíncrono e `serialize()` do Lucid é síncrono.
   */
  async boot() {
    const storage = await this.app.container.make(StorageContract)

    Storage.after('find', async (row) => {
      row.$extras.url = await storage.signedUrl(row)
    })
    Storage.after('fetch', async (rows) => {
      await Promise.all(
        rows.map(async (row) => {
          row.$extras.url = await storage.signedUrl(row)
        }),
      )
    })
  }

  async shutdown() {
    const client = await this.app.container.make(S3Client)

    client.destroy()
  }
}
