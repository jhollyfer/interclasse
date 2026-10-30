import { AdministratorPhotoShowResponse } from '../administrator/photos.response.js'
import type { z } from '../../validator.js'

/** A foto do conselheiro: a mesma forma do painel, com a decisão da organização. */
export const AdvisorPhotoShowResponse = AdministratorPhotoShowResponse

export type AdvisorPhotoShowResponse = z.infer<typeof AdvisorPhotoShowResponse>
