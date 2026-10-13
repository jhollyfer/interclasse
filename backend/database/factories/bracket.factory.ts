import factory from '@adonisjs/lucid/factories'

import Bracket from '#models/bracket'
import { BRACKET_STATUS, CATEGORY } from '#core/entity'
import { SportFactory } from '#database/factories/sport.factory'

/**
 * Chave de uma modalidade numa categoria, já em disputa. Só a linha: times e
 * partidas são do sorteio, e a spec que precisa deles sorteia pela rota.
 */
export const BracketFactory = factory
  .define(Bracket, () => ({ category: CATEGORY.F1, status: BRACKET_STATUS.KNOCKOUT }))
  .relation('sport', () => SportFactory)
  .build()
