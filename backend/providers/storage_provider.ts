import { clientConfig } from '#config/drive'
import { S3Client } from '@aws-sdk/client-s3'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Registra o cliente S3 no container.
 *
 * Aqui e não dentro do `MultipartService` porque um serviço que constrói a
 * própria dependência não tem como recebê-la de outro lugar: um teste que
 * quisesse apontar para outro bucket, contar chamadas ou simular uma falha do
 * storage teria de mexer em variável de ambiente do processo inteiro. Com o
 * bind, é uma linha de `container.swap(S3Client, …)`.
 *
 * `singleton` e não `bind`: o cliente carrega o pool de conexões HTTP, e um por
 * requisição jogaria fora o keep-alive a cada upload.
 */
export default class StorageProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(S3Client, () => new S3Client(clientConfig))
  }

  async shutdown() {
    const client = await this.app.container.make(S3Client)

    client.destroy()
  }
}
