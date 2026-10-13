import Sport from '#models/sport'
import SlugService from '#services/slug/slug.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { isUniqueViolation } from '#features/_shared.database'
import logger from '@adonisjs/core/services/logger'
import type { Merge } from '#core/entity'
import type { AdministratorSportUpdatePayload } from '#features/administrator/sports/sports.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<AdministratorSportUpdatePayload, IdentifierPayload>
type Response = Either<HTTPException, Sport>

@inject()
export default class AdministratorSportUpdateUseCase {
  constructor(private readonly slug: SlugService) {}

  async execute({ id, ...payload }: Payload): Promise<Response> {
    try {
      const sport = await Sport.find(id)

      if (!sport)
        return left(HTTPException.NotFound('Modalidade não encontrada', 'SPORT_NOT_FOUND'))

      if ((payload.minAthletes ?? sport.minAthletes) > (payload.maxAthletes ?? sport.maxAthletes))
        return left(
          HTTPException.UnprocessableEntity(
            'Limites de atletas inválidos',
            'SPORT_INVALID_LIMITS',
            {
              minAthletes: 'O mínimo não pode passar do máximo',
            }
          )
        )

      // Baixar o teto abaixo de uma lista já inscrita deixava a turma acima do
      // limite sem conseguir salvar nada: toda gravação dela seria recusada.
      if (payload.maxAthletes !== undefined && payload.maxAthletes < sport.maxAthletes) {
        const largest: { total: string | number } | null = await db
          .from('enrollments')
          .join('students', 'students.id', 'enrollments.student_id')
          .where('enrollments.sport_id', sport.id)
          .groupBy('students.classroom_id')
          .count('* as total')
          .orderBy('total', 'desc')
          .first()

        if (largest && Number(largest.total) > payload.maxAthletes)
          return left(
            HTTPException.Conflict(
              'Há turma com mais atletas inscritos que o novo máximo',
              'SPORT_ROSTER_ABOVE_LIMIT',
              {
                maxAthletes: `Uma turma já tem ${Number(largest.total)} atletas inscritos; reduza a lista antes`,
              }
            )
          )
      }

      if (payload.name && payload.name !== sport.name) {
        const slug = this.slug.normalize(payload.name)
        const existing = await Sport.query()
          .whereNot('id', sport.id)
          .where((builder) => {
            builder.where('name', payload.name ?? '').orWhere('slug', slug)
          })
          .first()

        if (existing)
          return left(
            HTTPException.Conflict('Modalidade já existe', 'SPORT_ALREADY_EXISTS', {
              name: 'Já existe uma modalidade com este nome',
            })
          )

        sport.slug = slug
      }

      sport.merge(payload)
      await sport.save()

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

      logger.error({ err: error }, '[sports > update][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'SPORT_UPDATE_ERROR')
      )
    }
  }
}
