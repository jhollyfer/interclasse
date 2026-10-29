import { randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorClassroomShowResponse,
  type Either,
} from '@interclasse/shared'

import { ClassroomRefusal } from '../_shared.classroom-refusal.ts'

import { Classroom } from '#domain/classroom/classroom.entity'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import HTTPException from '#exceptions/http.exception'
import { isUniqueViolation } from '#features/_shared.database'
import type { AdministratorClassroomCreatePayload } from '#validators/administrator/classrooms.validator'

type Payload = AdministratorClassroomCreatePayload
type Response = Either<HTTPException, AdministratorClassroomShowResponse>

/**
 * Cadastra a turma: a entidade deriva a categoria e confere os vínculos pelos
 * fatos que o repository traz, e o nome repetido é 409.
 */
@inject()
export default class AdministratorClassroomCreateUseCase {
  constructor(
    private readonly classrooms: ClassroomRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      if (await this.classrooms.existsByName(payload.name))
        return left(ClassroomRefusal.alreadyExists(this.i18n))

      const facts = await this.classrooms.peopleFacts(payload)
      const created = Classroom.create({ id: randomUUID(), ...payload, now: new Date() }, facts)
      if (created.isLeft()) return left(ClassroomRefusal.http(created.value, this.i18n))

      await this.classrooms.save(created.value)

      const detail = await this.classrooms.findDetail(created.value.id)
      if (!detail)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.not_found'), 'CLASSROOM_NOT_FOUND'),
        )

      return right(detail)
    } catch (error) {
      // A checagem acima não fecha a corrida: o segundo de dois pedidos
      // simultâneos esbarra no `unique` do banco.
      if (isUniqueViolation(error)) return left(ClassroomRefusal.race(error, this.i18n))

      logger.error({ err: error }, '[administrator/classrooms > create][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_CLASSROOM_CREATE_ERROR',
        ),
      )
    }
  }
}
