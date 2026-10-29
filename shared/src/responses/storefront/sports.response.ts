import { AdministratorSportShowResponse } from '../administrator/sports.response.js'
import type { z } from '../../validator.js'

/**
 * A modalidade no site: a mesma forma do painel. Nada nela é privado - nome e
 * limites de atletas são públicos por natureza.
 */
export const StorefrontSportShowResponse = AdministratorSportShowResponse

export type StorefrontSportShowResponse = z.infer<typeof StorefrontSportShowResponse>
