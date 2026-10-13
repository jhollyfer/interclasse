import { vine } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

export const StudentCreateValidator = vine.create({
  classroomId: vine.string().uuid(),
  name: vine.string().trim().minLength(1).maxLength(120),
})

export const StudentUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
})

export type StudentCreatePayload = Readonly<
  Infer<typeof StudentCreateValidator>
>
export type StudentUpdatePayload = Readonly<
  Infer<typeof StudentUpdateValidator>
>
