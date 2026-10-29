import { AdministratorMatchPaginateResponse } from '../administrator/matches.response.js'
import type { z } from '../../validator.js'

/** A tabela de jogos do site: a mesma forma do painel. */
export const StorefrontMatchPaginateResponse = AdministratorMatchPaginateResponse

export type StorefrontMatchPaginateResponse = z.infer<typeof StorefrontMatchPaginateResponse>
