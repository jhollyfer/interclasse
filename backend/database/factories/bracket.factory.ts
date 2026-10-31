import factory from '@adonisjs/lucid/factories'
import { BRACKET_STATUS, CATEGORY } from '@interclasse/shared'

import Bracket from '#models/bracket'
import { SportFactory } from '#database/factories/sport.factory'

/**
 * Bracket of a sport in a category, already in progress. Only the row: teams and
 * matches belong to the draw, and the spec that needs them draws through the route.
 */
export const BracketFactory = factory
  .define(Bracket, () => ({ category: CATEGORY.F1, status: BRACKET_STATUS.KNOCKOUT }))
  .relation('sport', () => SportFactory)
  .build()
