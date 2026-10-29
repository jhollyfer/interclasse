import { pageFields, z } from '../../validator.js'

/**
 * A foto do conselheiro: o mesmo envio do painel, e a lista é só a dele, então
 * não filtra por status. Par do VineJS de
 * `backend/app/validators/advisor/photos.validator.ts`.
 */
export const AdvisorPhotoCreateValidator = z.object({
  storageId: z.uuid(),
  caption: z.string().trim().max(200).nullable().optional(),
})

export const AdvisorPhotoPaginateValidator = z.object({
  ...pageFields(),
})

export type AdvisorPhotoCreatePayload = z.infer<typeof AdvisorPhotoCreateValidator>

export type AdvisorPhotoPaginatePayload = z.infer<typeof AdvisorPhotoPaginateValidator>
