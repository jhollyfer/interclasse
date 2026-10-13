import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import Classroom from '#models/classroom'
import Team from '#models/team'
import ClassroomService from '#services/classroom/classroom.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { isUniqueViolation } from '#features/_shared.database'
import { categoryOf, type Merge } from '#core/entity'
import type { ClassroomUpdatePayload } from '#features/administrator/classrooms/classrooms.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<ClassroomUpdatePayload, IdentifierPayload>
type Response = Either<HTTPException, Classroom>

@inject()
export default class AdministratorClassroomUpdateUseCase {
  constructor(private readonly classrooms: ClassroomService) {}

  async execute({ id, ...payload }: Payload): Promise<Response> {
    try {
      const classroom = await Classroom.find(id)

      if (!classroom)
        return left(HTTPException.NotFound('Turma não encontrada', 'CLASSROOM_NOT_FOUND'))

      if (payload.name && payload.name !== classroom.name) {
        const existing = await Classroom.findBy('name', payload.name)

        if (existing)
          return left(
            HTTPException.Conflict('Turma já existe', 'CLASSROOM_ALREADY_EXISTS', {
              name: 'Já existe uma turma com este nome',
            }),
          )
      }

      const people = await this.classrooms.assertPeople(payload, classroom)
      if (people.isLeft()) return left(people.value)

      const category = categoryOf(payload.grade ?? classroom.grade)

      // Mudar de categoria com a turma numa chave a deixaria jogando contra a
      // categoria errada.
      if (category !== classroom.category) {
        const team = await Team.findBy('classroomId', classroom.id)

        if (team)
          return left(
            HTTPException.Conflict(
              'A turma já está numa chave sorteada',
              'CLASSROOM_IN_COMPETITION',
              { grade: 'Não é possível mudar a categoria de uma turma já sorteada' },
            ),
          )
      }

      classroom.merge({ ...payload, category })
      await classroom.save()

      await classroom.load('advisor')
      await classroom.load('representative')

      return right(classroom)
    } catch (error) {
      // A checagem acima não fecha a corrida: o segundo de dois pedidos
      // simultâneos esbarra no `unique` do banco.
      if (isUniqueViolation(error))
        return left(
          HTTPException.Conflict('Turma já existe', 'CLASSROOM_ALREADY_EXISTS', {
            name: 'Já existe uma turma com este nome',
          }),
        )

      logger.error({ err: error }, '[classrooms > update][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'CLASSROOM_UPDATE_ERROR'),
      )
    }
  }
}
