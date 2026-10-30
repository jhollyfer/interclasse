import type { z } from '../../validator.js'
import { AdministratorCardPaginateResponse } from '../administrator/cards.response.js'

/** Os cartões da turma do conselheiro: a mesma forma do painel. */
export const AdvisorCardPaginateResponse = AdministratorCardPaginateResponse

export type AdvisorCardPaginateResponse = z.infer<
  typeof AdvisorCardPaginateResponse
>
