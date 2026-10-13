import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { defineDocs } from '#core/openapi/types'
import AdministratorUserDeleteUseCase from './delete.use-case.ts'
import { IdentifierValidator } from '#core/validator'

@inject()
export default class AdministratorUserDeleteController {
  static docs = defineDocs({
    summary: 'Apagar usuário',
    description:
      '**Irreversível**: apaga a linha do banco, e com ela os tokens da conta em ' +
      '`auth_access_tokens` por `CASCADE` - token é credencial viva, e deixá-lo para trás ' +
      'manteria uma sessão que ninguém mais consegue revogar. O avatar em `storages` fica.\n\n' +
      'Só aceita usuário já arquivado: sem isso um clique perderia a conta sem escala ' +
      'intermediária.\n\n' +
      'A **própria** conta responde `403`, antes da exigência de arquivamento.',
  })

  constructor(private readonly useCase: AdministratorUserDeleteUseCase) {}

  async handle(context: HttpContext) {
    const payload = await IdentifierValidator.validate(context.params)
    // O ator vem da sessão, e não do payload.
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
