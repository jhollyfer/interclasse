import { vine } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

export const AdvisorStudentCreateValidator = vine.create({
  classroomId: vine.string().uuid(),
  name: vine.string().trim().minLength(1).maxLength(120),
})

export const AdvisorStudentUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
})

export type AdvisorStudentCreatePayload = Infer<
  typeof AdvisorStudentCreateValidator
>
export type AdvisorStudentUpdatePayload = Infer<
  typeof AdvisorStudentUpdateValidator
>
