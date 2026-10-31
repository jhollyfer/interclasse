import type { z } from '../../validator.js'
import { AdministratorPhotoShowResponse } from '../administrator/photos.response.js'

/** The advisor's photo: the same shape as the panel, with the organization's decision. */
export const AdvisorPhotoShowResponse = AdministratorPhotoShowResponse

export type AdvisorPhotoShowResponse = z.infer<typeof AdvisorPhotoShowResponse>
