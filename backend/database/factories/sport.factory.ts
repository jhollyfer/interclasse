import factory from '@adonisjs/lucid/factories'
import { Slug } from '@interclasse/shared'

import Sport from '#models/sport'

/** Modalidade. Nome único por sufixo aleatório; o slug sai da normalização do projeto. */
export const SportFactory = factory
  .define(Sport, ({ faker }) => {
    const name = `Modalidade ${faker.string.alphanumeric(8)}`

    return { name, slug: Slug.from(name).value, minAthletes: 1, maxAthletes: 10 }
  })
  .build()
