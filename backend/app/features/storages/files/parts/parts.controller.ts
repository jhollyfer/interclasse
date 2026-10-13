import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StoragesFilePartsUseCase from './parts.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import { StorageUploadResponse } from '#core/response'
import { PART_SIZE, PRESIGNED_BATCH } from '#services/multipart/multipart.service'

@inject()
export default class StoragesFilePartsController {
  static docs = defineDocs({
    summary: 'Retomar upload de arquivo',
    responses: { 200: StorageUploadResponse },
    description:
      'De onde continuar: em `uploaded`, o que o bucket já recebeu; em `parts`, URL nova para ' +
      'o que falta.\n\n' +
      'Serve a dois casos que são o mesmo problema. **Retomada**: a conexão caiu no meio, e ' +
      'sem isto a única saída seria recomeçar do zero. **Próximo lote**: as URLs saem de ' +
      // Os dois números saem das constantes do serviço: escritos à mão, a
      // documentação passaria a mentir no dia em que um deles mudasse.
      `${PRESIGNED_BATCH} em ${PRESIGNED_BATCH}, porque assinar tudo de uma vez seria centenas ` +
      `de kilobytes de JSON antes de o primeiro byte subir. Cada parte tem ${PART_SIZE} bytes.` +
      '\n\n' +
      'Assinar de novo é o ponto, e não um efeito colateral: URL assinada expira, e um upload ' +
      'que durou mais que a validade encontra aqui um endereço novo para a mesma parte.\n\n' +
      'Arquivo já confirmado responde `200` com as duas listas vazias - quem pergunta é um ' +
      'cliente retomando, e ler o `status` e parar é o desfecho certo.',
  })

  constructor(private readonly useCase: StoragesFilePartsUseCase) {}

  async handle(context: HttpContext) {
    const payload = await IdentifierValidator.validate(context.params)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
