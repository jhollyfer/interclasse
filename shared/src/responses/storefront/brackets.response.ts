import {
  AdministratorBracketPaginateResponse,
  AdministratorBracketShowResponse,
} from '../administrator/brackets.response.js'
import type { z } from '../../validator.js'

/**
 * A chave no site: a mesma forma do painel. Nome de turma, placar e fase são
 * públicos por natureza.
 */
export const StorefrontBracketPaginateResponse = AdministratorBracketPaginateResponse

export const StorefrontBracketShowResponse = AdministratorBracketShowResponse

export type StorefrontBracketPaginateResponse = z.infer<typeof StorefrontBracketPaginateResponse>

export type StorefrontBracketShowResponse = z.infer<typeof StorefrontBracketShowResponse>
