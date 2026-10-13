import { BaseSeeder } from '@adonisjs/lucid/seeders'
import string from '@adonisjs/core/helpers/string'

import Classroom from '#models/classroom'
import Sport from '#models/sport'
import { categoryOf } from '#features/administrator/_shared.classroom'

/**
 * As modalidades e as turmas da escola, como estavam no site anterior.
 *
 * Fora de `test`: a suíte cria o que precisa, e uma modalidade semeada com o
 * mesmo nome esbarraria no `unique` do teste. Idempotente - rodar de novo não
 * duplica, só reafirma.
 */
export default class TournamentSeeder extends BaseSeeder {
  static override environment = ['development', 'production']

  override async run() {
    const sports = [
      { name: 'Futsal', minAthletes: 5, maxAthletes: 12 },
      { name: 'Vôlei', minAthletes: 6, maxAthletes: 12 },
      { name: 'Tênis de mesa', minAthletes: 1, maxAthletes: 4 },
      { name: 'Queimada', minAthletes: 8, maxAthletes: 15 },
      { name: 'Jogos eletrônicos', minAthletes: 1, maxAthletes: 4 },
    ]

    for (const sport of sports) {
      const slug = string.slug(sport.name, { lower: true, trim: true, strict: true })
      await Sport.updateOrCreate({ slug }, { ...sport, slug })
    }

    const grades = [
      { grade: 3, letters: 'ABC' },
      { grade: 4, letters: 'ABCD' },
      { grade: 5, letters: 'ABCD' },
      { grade: 6, letters: 'ABC' },
      { grade: 7, letters: 'ABC' },
      { grade: 8, letters: 'ABCD' },
      { grade: 9, letters: 'ABC' },
    ]

    for (const { grade, letters } of grades) {
      for (const letter of letters) {
        const name = `${grade}º ${letter}`
        await Classroom.updateOrCreate({ name }, { name, grade, category: categoryOf(grade) })
      }
    }
  }
}
