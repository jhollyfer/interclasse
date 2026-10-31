import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * The notices of athletes removed from the list. `pending` keeps the ones the administrator
 * has not read yet - it is the menu counter.
 */
export const AdministratorEnrollmentRemovalPaginateValidator = vine.create({
  ...pageFields(),
  pending: vine.boolean().optional(),
  classroomId: vine.string().uuid().optional(),
})

export type AdministratorEnrollmentRemovalPaginatePayload = Infer<
  typeof AdministratorEnrollmentRemovalPaginateValidator
>
