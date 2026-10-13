import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

import AccountProfileUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { ProfileUpdateValidator } from '#features/account/profile/profile.validator'

@inject()
export default class AccountProfileUpdateController {
  static docs = defineDocs({
    summary: 'Atualizar a própria conta',
    description:
      'Todo campo é opcional: só o que vier no payload muda. Campo ausente significa ' +
      '"não mexer", não "apagar" - a exceção é `avatarId`, onde `null` é como se tira a foto ' +
      'sem trocá-la.\n\n' +
      'Trocar a senha exige `currentPassword`, a senha atual: a sessão prova posse do cookie, ' +
      'não identidade, e sem isso um cookie sequestrado trocaria a senha do dono da conta. A ' +
      'senha nova ainda precisa ser diferente da atual.\n\n' +
      'Trocar e-mail ou senha **revoga todas as sessões**, inclusive a que fez esta ' +
      'requisição.\n\n' +
      'O papel não entra: ele é definido na criação, pelo administrador, e ninguém muda o ' +
      'próprio.',
    // Declarado à mão porque nasce fora deste par: quem levanta o
    // `STORAGE_NOT_FOUND` é o `StorageService`, e a leitura de AST do gerador
    // só enxerga o `HTTPException` escrito no use-case irmão.
    errors: { 422: 'STORAGE_NOT_FOUND' },
  })

  constructor(private readonly useCase: AccountProfileUpdateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await ProfileUpdateValidator.validate(context.request.body())
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
