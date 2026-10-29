import { pageFields, z } from '../../validator.js'

/**
 * Os avisos de atleta tirado da lista. `pending` recorta os que o administrador
 * ainda não leu: é o contador do menu. Par do VineJS de
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
