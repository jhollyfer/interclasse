import type { z } from '../../validator.js'
import {
  AdministratorBracketPaginateResponse,
  AdministratorBracketShowResponse,
} from '../administrator/brackets.response.js'

/**
 * The bracket on the site: the same shape as the panel. Classroom name, score and
 * phase are public by nature.
 */
export const StorefrontBracketPaginateResponse =
  AdministratorBracketPaginateResponse

export const StorefrontBracketShowResponse = AdministratorBracketShowResponse

export type StorefrontBracketPaginateResponse = z.infer<
  typeof StorefrontBracketPaginateResponse
>

export type StorefrontBracketShowResponse = z.infer<
  typeof StorefrontBracketShowResponse
>
