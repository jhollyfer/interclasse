import { AdministratorCardPaginateResponse } from '../administrator/cards.response.js'
import type { z } from '../../validator.js'

/** Os cartões da turma do conselheiro: a mesma forma do painel. */
export const AdvisorCardPaginateResponse = AdministratorCardPaginateResponse

export type AdvisorCardPaginateResponse = z.infer<typeof AdvisorCardPaginateResponse>
