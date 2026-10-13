import factory from '@adonisjs/lucid/factories'

import Sport from '#models/sport'
import { normalizeSlug } from '#features/_shared.slug'

/** Modalidade. Nome único por sufixo aleatório; o slug sai da normalização do projeto. */
export const SportFactory = factory
  .define(Sport, ({ faker }) => {
    const name = `Modalidade ${faker.string.alphanumeric(8)}`

    return { name, slug: normalizeSlug(name), minAthletes: 1, maxAthletes: 10 }
  })
  .build()
