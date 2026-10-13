import Classroom from '#models/classroom'
import ClassroomService from '#services/classroom/classroom.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import { isUniqueViolation } from '#features/_shared.database'
import logger from '@adonisjs/core/services/logger'
import { categoryOf } from '#core/entity'
import type { AdministratorClassroomCreatePayload } from '#features/administrator/classrooms/classrooms.validator'

type Payload = AdministratorClassroomCreatePayload
type Response = Either<HTTPException, Classroom>

@inject()
export default class AdministratorClassroomCreateUseCase {
  constructor(private readonly classrooms: ClassroomService) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const existing = await Classroom.findBy('name', payload.name)

      if (existing)
        return left(
          HTTPException.Conflict('Turma já existe', 'CLASSROOM_ALREADY_EXISTS', {
            name: 'Já existe uma turma com este nome',
          })
        )

      const people = await this.classrooms.assertPeople(payload)
      if (people.isLeft()) return left(people.value)

      const classroom = await Classroom.create({
        ...payload,
        category: categoryOf(payload.grade),
      })

      // O `INSERT` só devolve a chave primária: sem o refresh, os vínculos não
      // enviados ficam `undefined` e o `load` recusa.
      await classroom.refresh()
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
          })
        )

      logger.error({ err: error }, '[classrooms > create][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'CLASSROOM_CREATE_ERROR')
      )
    }
  }
}
