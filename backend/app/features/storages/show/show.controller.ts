import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import StorageShowUseCase from './show.use-case.ts'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class StorageShowController {
  static docs = defineDocs({
    summary: 'Ver um arquivo',
    description:
      'Devolve o registro nu, sem envelope: o rótulo original, o tipo, o tamanho, o estado do ' +
      'upload e a `url` derivada.\n\n' +
      'Vale também para o arquivo ainda `PENDING` - a tela de detalhe é onde se descobre que ' +
      'um upload ficou pela metade. Quem anexa é que exige `UPLOADED`.',
  })

  constructor(private readonly useCase: StorageShowUseCase) {}

  async handle(context: HttpContext) {
    const payload = await IdentifierValidator.validate(context.params)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
