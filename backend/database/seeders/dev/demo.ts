import app from '@adonisjs/core/services/app'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import { ACTIVE_STATUS, CATEGORY, MATCH_PHASE, USER_ROLE, type Category } from '@interclasse/shared'

import env from '#start/env'
import Announcement from '#models/announcement'
import Bracket from '#models/bracket'
import Classroom from '#models/classroom'
import Enrollment from '#models/enrollment'
import Match from '#models/match'
import Sport from '#models/sport'
import Student from '#models/student'
import User from '#models/user'
import TournamentSeeder from '#database/seeders/tournament.seed'
import AdministratorBracketCreateUseCase from '#features/administrator/brackets/create/create.use-case'
import AdministratorMatchScoreUseCase from '#features/administrator/matches/score/score.use-case'

/**
 * A demonstration championship, midway through: accounts of the three roles,
 * students with real-sounding names, enrollments, drawn brackets, scores entered and
 * a schedule set. It is what is shown to the school before the real games.
 *
 * Development only, and only runs by hand:
 *
 *   SEED_DEMO_PASSWORD=<password> pnpm db:seed:demo
 *
 * Lives in `dev/`, without the `.seed.ts` suffix, being a manual demonstration seed
 * (_standards/backend.md §3).
 *
 * A database that already has a drawn bracket is left alone: the seeder cannot tell a
 * demonstration from a real championship, and deleting the latter is irreversible.
 *
 * The draw and the score go through the real use cases, through the container, and
 * not through direct insert: the demonstration shows exactly what the system does.
 */
type Stage = 'final' | 'semi' | 'first' | 'drawn'

export default class extends BaseSeeder {
  static override environment = ['development']

  override async run() {
    const password = env.get('SEED_DEMO_PASSWORD')

    // Without a password the demonstration is skipped, not the whole `db:seed`: whoever only
    // wants the administrator and the classrooms does not need to decide a demo password.
    if (!password) {
      console.info('[demo] SEED_DEMO_PASSWORD missing; demonstration skipped.')
      return
    }

    if (await Bracket.query().first()) {
      console.info('[demo] a drawn bracket already exists; nothing to do.')
      return
    }

    // Through the container, not `new` (_standards/backend.md §2.1): the seeder's
    // constructor gains a dependency and the call still builds the whole object.
    const tournament = await app.container.make(TournamentSeeder, [this.client])
    await tournament.run()

    const advisors = await this.advisors(password)
    const classrooms = await Classroom.query().orderBy('grade').orderBy('name')

    for (const [index, classroom] of classrooms.entries()) {
      const representative = await this.representative(classroom, password)
      // One advisor per classroom (unique index): classrooms beyond the number of
      // teachers stay "No advisor", as the real school does
      // while the organization has not named them all.
      const advisor = advisors.at(index)
      classroom.merge({
        advisorId: advisor?.id ?? null,
        representativeId: representative.id,
      })
      await classroom.save()
    }

    await this.students(classrooms)
    await this.enrollments(classrooms)
    await this.announcements()
    await this.championship()
  }

  /** The teacher advisors, one for each of the first classrooms. */
  private async advisors(password: string): Promise<User[]> {
    const people = [
      ['Raimunda Tananta', 'raimunda.tananta'],
      ['Joelson Cruz', 'joelson.cruz'],
      ['Marilene Pinheiro', 'marilene.pinheiro'],
      ['Adalberto Sampaio', 'adalberto.sampaio'],
      ['Keila Fernandes', 'keila.fernandes'],
      ['Ronaldo Picanço', 'ronaldo.picanco'],
    ]

    const users: User[] = []

    for (const [name, login] of people) {
      users.push(
        await User.updateOrCreate(
          { email: `${login}@escola.demo` },
          {
            name,
            email: `${login}@escola.demo`,
            password,
            role: USER_ROLE.ADVISOR,
            status: ACTIVE_STATUS.ACTIVE,
          },
        ),
      )
    }

    return users
  }

  /** One student representative per classroom, with a login derived from the classroom name. */
  private async representative(classroom: Classroom, password: string): Promise<User> {
    const login = `representante.${classroom.grade}${classroom.name.slice(-1).toLowerCase()}`

    return User.updateOrCreate(
      { email: `${login}@escola.demo` },
      {
        name: `Representante do ${classroom.name}`,
        email: `${login}@escola.demo`,
        password,
        role: USER_ROLE.REPRESENTATIVE,
        status: ACTIVE_STATUS.ACTIVE,
      },
    )
  }

  /** From 16 to 22 students per classroom, with first and last names common in the region. */
  private async students(classrooms: Classroom[]): Promise<void> {
    const first = [
      'Ana',
      'Bruno',
      'Clara',
      'Davi',
      'Emanuelly',
      'Felipe',
      'Gabriela',
      'Heitor',
      'Isabelly',
      'João',
      'Kauã',
      'Larissa',
      'Matheus',
      'Nicole',
      'Otávio',
      'Pietra',
      'Rafael',
      'Sophia',
      'Thiago',
      'Vitória',
      'Wesley',
      'Yasmin',
      'Arthur',
      'Beatriz',
      'Cauã',
      'Eduarda',
      'Gustavo',
      'Júlia',
      'Lucas',
      'Manuela',
      'Pedro',
      'Rebeca',
    ]
    const last = [
      'Tananta',
      'Ramos',
      'Pinheiro',
      'Cordeiro',
      'Lopes',
      'Batalha',
      'Nogueira',
      'Sampaio',
      'Coelho',
      'Barbosa',
      'Moraes',
      'Farias',
      'Mafra',
      'Lobato',
      'Ferreira',
      'Cruz',
      'Pereira',
      'Monteiro',
      'Rocha',
      'Vasconcelos',
    ]

    for (const [index, classroom] of classrooms.entries()) {
      if (await Student.findBy('classroomId', classroom.id)) continue

      const total = 16 + ((index * 5) % 7)
      const names = new Set<string>()

      for (let seat = 0; names.size < total; seat++) {
        names.add(
          `${first[(index * 7 + seat * 3) % first.length]} ${last[(index * 3 + seat * 5) % last.length]}`,
        )
      }

      await Student.createMany([...names].map((name) => ({ name, classroomId: classroom.id })))
    }
  }

  /**
   * Enrollments: almost every classroom enrolls the sport's maximum. Some
   * stay below the minimum on purpose, so the demonstration shows a classroom
   * left out of the draw.
   */
  private async enrollments(classrooms: Classroom[]): Promise<void> {
    const sports = await Sport.query().orderBy('name')

    for (const [index, classroom] of classrooms.entries()) {
      const students = await Student.query().where('classroomId', classroom.id).orderBy('name')

      for (const [offset, sport] of sports.entries()) {
        let size = sport.maxAthletes
        if ((index + offset) % 9 === 0) size = Math.max(0, sport.minAthletes - 1)

        const athletes = students
          .slice((offset * 3) % students.length)
          .concat(students)
          .slice(0, Math.min(size, students.length))

        for (const student of athletes) {
          await Enrollment.firstOrCreate({ studentId: student.id, sportId: sport.id })
        }
      }
    }
  }

  private async announcements(): Promise<void> {
    if (await Announcement.query().first()) return

    await Announcement.createMany([
      {
        title: 'Abertura dos jogos',
        body: 'Terça, 1º de dezembro, às 7h30 na quadra principal. Todas as turmas devem chegar uniformizadas e com a lista de atletas conferida.',
        pinned: true,
      },
      {
        title: 'Final do futsal mudou de horário',
        body: 'A final do futsal do 6º ao 9º passa para as 15h, no mesmo local. A semifinal da manhã continua às 9h.',
        pinned: false,
      },
      {
        title: 'Torcida organizada',
        body: 'Faixas e cartazes são bem-vindos. Nada de corneta ou apito na arquibancada: atrapalha a arbitragem.',
        pinned: false,
      },
      {
        title: 'Inscrições do tênis de mesa',
        body: 'As listas do tênis de mesa fecham sexta-feira. Depois do sorteio não há troca de atleta.',
        pinned: false,
      },
    ])
  }

  /**
   * The brackets, each at a different stage: one with a champion, one waiting for
   * the final, one in the middle of the first phase and one just drawn.
   */
  private async championship(): Promise<void> {
    const draw = await app.container.make(AdministratorBracketCreateUseCase)
    const score = await app.container.make(AdministratorMatchScoreUseCase)

    const sport = async (slug: string) => Sport.findByOrFail('slug', slug)
    const plan: Array<{ slug: string; category: Category; stage: Stage }> = [
      { slug: 'futsal', category: CATEGORY.F2, stage: 'semi' },
      { slug: 'queimada', category: CATEGORY.F1, stage: 'final' },
      { slug: 'volei', category: CATEGORY.F2, stage: 'first' },
      { slug: 'futsal', category: CATEGORY.F1, stage: 'drawn' },
    ]

    let day = 0

    for (const item of plan) {
      const target = await sport(item.slug)
      const created = await draw.execute({ sportId: target.id, category: item.category })
      if (created.isLeft()) throw created.value
      // A bracket that already existed (seed run again): its match was already built.
      if (!created.value.created) continue

      const { bracket } = created.value
      day = await this.schedule(bracket.id, day)
      await this.play(bracket.id, item.stage, score)
    }
  }

  /** Plausible, varied score, with ties decided on penalties. */
  private result(index: number): { homeScore: number; awayScore: number } {
    const scores: ReadonlyArray<readonly [number, number]> = [
      [3, 1],
      [2, 2],
      [0, 1],
      [4, 2],
      [1, 0],
      [1, 1],
      [2, 3],
      [5, 1],
    ]
    const score = scores[index % scores.length]
    if (!score) throw new Error('[demo] empty score list')
    const [homeScore, awayScore] = score

    return { homeScore, awayScore }
  }

  /**
   * Plays the bracket phase by phase up to the requested stage: `first` stops in the middle of the
   * first phase, `semi` stops before the final, `final` goes to the champion.
   */
  private async play(
    bracketId: string,
    stage: Stage,
    score: AdministratorMatchScoreUseCase,
  ): Promise<void> {
    if (stage === 'drawn') return

    let first = true

    for (const phase of [
      MATCH_PHASE.ROUND_OF_16,
      MATCH_PHASE.QUARTER,
      MATCH_PHASE.SEMI,
      MATCH_PHASE.FINAL,
    ]) {
      if (phase === MATCH_PHASE.FINAL && stage === 'semi') return

      const matches = await Match.query()
        .where('bracketId', bracketId)
        .where('phase', phase)
        .whereNotNull('homeTeamId')
        .whereNotNull('awayTeamId')
        .orderBy('position')

      if (matches.length === 0) continue

      let played = matches
      if (first && stage === 'first') played = matches.slice(0, Math.ceil(matches.length / 2))

      for (const [index, match] of played.entries()) {
        // One in every three matches ties and goes to penalties.
        let payload: { homeScore: number; awayScore: number; winnerTeamId?: string } =
          this.result(index)
        if (payload.homeScore === payload.awayScore)
          payload = { ...payload, winnerTeamId: match.awayTeamId ?? undefined }

        const result = await score.execute({ id: match.id, ...payload })
        if (result.isLeft()) throw result.value
      }

      if (stage === 'first') return
      first = false
    }
  }

  /**
   * Schedules the matches without a time: three per morning, starting on December 1st,
   * in the school's three venues. Returns the next free day.
   */
  private async schedule(bracketId: string, startDay: number): Promise<number> {
    const places = ['Quadra principal', 'Ginásio', 'Quadra coberta']
    const hours = ['07:30', '08:30', '09:30', '10:30']
    const matches = await Match.query()
      .where('bracketId', bracketId)
      .whereNull('scheduledAt')
      .orderBy('round')
      .orderBy('position')

    let slot = 0
    let day = startDay

    for (const match of matches) {
      const [hour, minute] = (hours[slot % hours.length] ?? '00:00').split(':').map(Number)
      match.scheduledAt = DateTime.fromObject(
        { year: 2026, month: 12, day: 1 + (day % 12), hour, minute },
        { zone: 'America/Manaus' },
      )
      match.location = places[slot % places.length] ?? null
      await match.save()

      slot += 1
      if (slot % hours.length === 0) day += 1
    }

    return day + 1
  }
}
