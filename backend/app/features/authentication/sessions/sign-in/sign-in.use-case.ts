import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { UserRepository } from '#repositories/user/user.repository'
import { SessionContract, type SessionTokens } from '#services/session/session.contract'
import type { AuthenticationSessionSignInPayload } from '#validators/authentication/sessions.validator'

type Payload = AuthenticationSessionSignInPayload
type Response = Either<HTTPException, SessionTokens>

/**
 * Abre a sessão. Conta inexistente, senha errada, conta arquivada e conta
 * inativa recebem o mesmo `401`: a resposta não confirma que a conta existiu
 * nem por que foi recusada.
 *
 * Nada do payload é registrado em log aqui: `backend-old` imprimia a senha
 * recebida no `console.log` do caso de uso de sign-in.
 */
@inject()
export default class AuthenticationSessionSignInUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionContract,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // Viva ou arquivada: quem decide se entra é a conta, depois de a senha
      // ser conferida.
      const user = await this.users.findByEmail(payload.email)

      // Conta inexistente também gasta o tempo de uma cifra, para a resposta
      // não revelar pelo relógio que o e-mail não está cadastrado.
      if (!user) {
        await hash.make(payload.password)

        return left(this.invalidCredentials())
      }

      const passwordMatches = await hash.verify(user.snapshot().password, payload.password)

      if (!passwordMatches || !user.canSignIn()) return left(this.invalidCredentials())

      return right(await this.sessions.issue(user.id))
    } catch (error) {
      // Só credencial errada vira 401. Qualquer outra falha (banco fora, por
      // exemplo) continua sendo erro de servidor - não vale mentir 401.
      logger.error({ err: error }, '[sessions > sign-in][error]')

      return left(
        HTTPException.InternalServerError(this.i18n.t('errors.internal'), 'SESSION_SIGN_IN_ERROR'),
      )
    }
  }

  private invalidCredentials(): HTTPException {
    return HTTPException.Unauthorized(
      this.i18n.t('sessions.invalid_credentials'),
      'INVALID_CREDENTIALS',
      { root: this.i18n.t('sessions.invalid_credentials_field') },
    )
  }
}
