import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * Os avisos de atleta tirado da lista. `pending` recorta os que o administrador
 * ainda não leu - é o contador do menu.
 */
export const AdministratorEnrollmentRemovalPaginateValidator = vine.create({
  ...pageFields(),
  pending: vine.boolean().optional(),
  classroomId: vine.string().uuid().optional(),
})

export type AdministratorEnrollmentRemovalPaginatePayload = Infer<
  typeof AdministratorEnrollmentRemovalPaginateValidator
>
