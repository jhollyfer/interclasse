import { BaseSeeder } from '@adonisjs/lucid/seeders'
import string from '@adonisjs/core/helpers/string'

import Classroom from '#models/classroom'
import Sport from '#models/sport'
import { Classroom as ClassroomEntity } from '#domain/classroom/classroom.entity'

/**
 * The school's sports and classrooms, as they were on the previous site.
 *
 * Outside `test`: the suite creates what it needs, and a seeded sport with the
 * same name would collide with the test `unique`. Idempotent - running again does not
 * duplicate, it only reasserts.
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
        await Classroom.updateOrCreate(
          { name },
          { name, grade, category: ClassroomEntity.categoryOf(grade) },
        )
      }
    }
  }
}
