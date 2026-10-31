import { pageFields, z } from '../../validator.js'

/**
 * The notices of athletes removed from the list. `pending` keeps the ones the
 * administrator has not read yet: it is the menu counter. Mirror of the VineJS one in
 * `backend/app/validators/administrator/enrollment-removals.validator.ts`.
 */
export const AdministratorEnrollmentRemovalPaginateValidator = z.object({
  ...pageFields(),
  pending: z.stringbool().optional(),
  classroomId: z.uuid().optional(),
})

export type AdministratorEnrollmentRemovalPaginatePayload = z.infer<
  typeof AdministratorEnrollmentRemovalPaginateValidator
>
