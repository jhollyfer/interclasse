import Sport from '#models/sport'
import SlugService from '#services/slug.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import { isUniqueViolation } from '#features/_shared.database'
import logger from '@adonisjs/core/services/logger'
import type { AdministratorSportCreatePayload } from '#features/administrator/sports/sports.validator'

type Payload = AdministratorSportCreatePayload
type Response = Either<HTTPException, Sport>

@inject()
export default class AdministratorSportCreateUseCase {
  constructor(private readonly slug: SlugService) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      if (payload.minAthletes > payload.maxAthletes)
        return left(
          HTTPException.UnprocessableEntity(
            'Limites de atletas inválidos',
            'SPORT_INVALID_LIMITS',
            {
              minAthletes: 'O mínimo não pode passar do máximo',
            }
          )
        )

      const slug = this.slug.normalize(payload.name)
      const existing = await Sport.query().where('name', payload.name).orWhere('slug', slug).first()

      if (existing)
        return left(
          HTTPException.Conflict('Modalidade já existe', 'SPORT_ALREADY_EXISTS', {
            name: 'Já existe uma modalidade com este nome',
          })
        )

      const sport = await Sport.create({ ...payload, slug })

      return right(sport)
    } catch (error) {
      // A checagem acima não fecha a corrida: o segundo de dois pedidos
      // simultâneos esbarra no `unique` do banco.
      if (isUniqueViolation(error))
        return left(
          HTTPException.Conflict('Modalidade já existe', 'SPORT_ALREADY_EXISTS', {
            name: 'Já existe uma modalidade com este nome',
          })
        )

      logger.error({ err: error }, '[sports > create][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'SPORT_CREATE_ERROR')
      )
    }
  }
}
