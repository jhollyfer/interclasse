import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import StorageCreateUseCase from './create.use-case.ts'
import { StorageCreateValidator, STORAGE_MIMETYPES, UPLOAD_MAX_SIZE } from '#core/validator'
import { PART_SIZE } from '#services/multipart.service'
import { StorageUploadResponse } from '#core/response'

@inject()
export default class StorageCreateController {
  static docs = defineDocs({
    summary: 'Abrir upload de arquivo',
    // A resposta não é o arquivo, é o plano de upload - por isso declarada aqui
    // em vez de sair do recurso `Storage` padrão da feature.
    responses: { 201: StorageUploadResponse },
    description:
      'Abre um upload e devolve por onde subi-lo. **Não recebe bytes** - só os metadados do ' +
      'arquivo.\n\n' +
      'O binário vai do navegador direto ao bucket, por URL assinada, e nunca atravessa esta ' +
      'aplicação: um arquivo grande num corpo HTTP esbarra no limite do proxy, ocupa a ' +
      'aplicação pelo tempo do upload, e não tem como ser retomado quando a conexão cai.\n\n' +
      `Aceita ${STORAGE_MIMETYPES.join(', ')}, até ${UPLOAD_MAX_SIZE} bytes, recusados **antes** ` +
      'de qualquer assinatura: arquivo proibido não ganha URL, então não chega ao bucket. Que o ' +
      'tamanho declarado seja verdade é o que `POST /storages/:id/complete` confere, contra o ' +
      'objeto real.\n\n' +
      `O arquivo é fatiado em partes de ${PART_SIZE} bytes. Quando cabe numa parte só, ` +
      '`uploadId` vem nulo e a única URL aceita um `PUT` com o arquivo inteiro. Quando não ' +
      'cabe, cada URL aceita a sua parte, o cliente guarda o `ETag` que cada `PUT` devolve, e ' +
      '`parts` pode trazer só o primeiro lote - o resto sai em `GET /storages/:id/parts`, que ' +
      'é o mesmo endpoint da retomada.\n\n' +
      'A linha nasce `PENDING` e não pode ser anexada a nada até ser confirmada. O arquivo ' +
      'nasce sem dono: quem anexa guarda a referência, informando o `id` em `avatarId`, ' +
      '`coverId`, `audioId` ou `imageIds`.',
  })

  constructor(private readonly useCase: StorageCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(StorageCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
