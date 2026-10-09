import env from '#start/env'
import app from '@adonisjs/core/services/app'
import Announcement from '#models/announcement'
import Bracket from '#models/bracket'
import Classroom from '#models/classroom'
import Enrollment from '#models/enrollment'
import Match from '#models/match'
import Sport from '#models/sport'
import Student from '#models/student'
import User from '#models/user'
import JogosSeeder from '#database/seeders/jogos_seeder'
import AdministratorBracketCreateUseCase from '#features/administrator/brackets/create.use-case'
import AdministratorMatchScoreUseCase from '#features/administrator/matches/score.use-case'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import { ActiveStatuses, Categories, MatchPhases, UserRoles, type Category } from '#core/entity'

/**
 * Um campeonato de demonstração, no meio do caminho: contas dos três papéis,
 * alunos com nome de gente, inscrições, chaves sorteadas, placares lançados e
 * agenda marcada. É o que se mostra para a escola antes dos jogos de verdade.
 *
 * Só em desenvolvimento, e só roda à mão:
 *
 *   SEED_DEMO_PASSWORD=<senha> node ace db:seed --files database/seeders/demo_seeder.ts
 *
 * Banco que já tem chave sorteada é deixado em paz: o seeder não sabe distinguir
 * demonstração de campeonato real, e apagar o segundo não tem volta.
 *
 * O sorteio e o placar passam pelos casos de uso de verdade, pelo container, e
 * não por insert direto: a demonstração mostra exatamente o que o sistema faz.
 */
type Stage = 'final' | 'semi' | 'first' | 'drawn'

export default class extends BaseSeeder {
  static environment = ['development']

  async run() {
    const password = env.get('SEED_DEMO_PASSWORD')

    // Sem senha a demonstração é pulada, e não o `db:seed` inteiro: quem só
    // quer o administrador e as turmas não precisa decidir senha de demo.
    if (!password) {
      console.info('[demo] SEED_DEMO_PASSWORD ausente; demonstração pulada.')
      return
    }

    if (await Bracket.query().first()) {
      console.info('[demo] já existe chave sorteada; nada a fazer.')
      return
    }

    await new JogosSeeder(this.client).run()

    const advisors = await this.advisors(password)
    const classrooms = await Classroom.query().orderBy('grade').orderBy('name')

    for (const [index, classroom] of classrooms.entries()) {
      const representative = await this.representative(classroom, password)
      classroom.merge({
        advisorId: advisors[index % advisors.length].id,
        representativeId: representative.id,
      })
      await classroom.save()
    }

    await this.students(classrooms)
    await this.enrollments(classrooms)
    await this.announcements()
    await this.championship()
  }

  /** Os professores conselheiros: cada um fica com quatro turmas, em média. */
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
            role: UserRoles.ADVISOR,
            status: ActiveStatuses.ACTIVE,
          }
        )
      )
    }

    return users
  }

  /** Um aluno representante por turma, com login derivado do nome da turma. */
  private async representative(classroom: Classroom, password: string): Promise<User> {
    const login = `representante.${classroom.grade}${classroom.name.slice(-1).toLowerCase()}`

    return User.updateOrCreate(
      { email: `${login}@escola.demo` },
      {
        name: `Representante do ${classroom.name}`,
        email: `${login}@escola.demo`,
        password,
        role: UserRoles.REPRESENTATIVE,
        status: ActiveStatuses.ACTIVE,
      }
    )
  }

  /** De 16 a 22 alunos por turma, com nome e sobrenome comuns na região. */
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
          `${first[(index * 7 + seat * 3) % first.length]} ${last[(index * 3 + seat * 5) % last.length]}`
        )
      }

      await Student.createMany([...names].map((name) => ({ name, classroomId: classroom.id })))
    }
  }

  /**
   * Inscrições: quase toda turma inscreve o máximo da modalidade. Algumas
   * ficam abaixo do mínimo de propósito, para a demonstração mostrar turma
   * fora do sorteio.
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
   * As chaves, cada uma num estágio diferente: uma com campeão, uma esperando
   * a final, uma no meio da primeira fase e uma recém-sorteada.
   */
  private async championship(): Promise<void> {
    const draw = await app.container.make(AdministratorBracketCreateUseCase)
    const score = await app.container.make(AdministratorMatchScoreUseCase)

    const sport = async (slug: string) => Sport.findByOrFail('slug', slug)
    const plan: Array<{ slug: string; category: Category; stage: Stage }> = [
      { slug: 'futsal', category: Categories.F2, stage: 'semi' },
      { slug: 'queimada', category: Categories.F1, stage: 'final' },
      { slug: 'volei', category: Categories.F2, stage: 'first' },
      { slug: 'futsal', category: Categories.F1, stage: 'drawn' },
    ]

    let day = 0

    for (const item of plan) {
      const target = await sport(item.slug)
      const created = await draw.execute({ sportId: target.id, category: item.category })
      if (created.isLeft()) throw created.value

      day = await this.schedule(created.value.id, day)
      await this.play(created.value.id, item.stage, score)
    }
  }

  /** Placar plausível e variado, com empates decididos nos pênaltis. */
  private result(index: number): { homeScore: number; awayScore: number } {
    const scores = [
      [3, 1],
      [2, 2],
      [0, 1],
      [4, 2],
      [1, 0],
      [1, 1],
      [2, 3],
      [5, 1],
    ]
    const [homeScore, awayScore] = scores[index % scores.length]

    return { homeScore, awayScore }
  }

  /**
   * Joga a chave fase a fase até o estágio pedido: `first` para no meio da
   * primeira fase, `semi` para antes da final, `final` vai até o campeão.
   */
  private async play(
    bracketId: string,
    stage: Stage,
    score: AdministratorMatchScoreUseCase
  ): Promise<void> {
    if (stage === 'drawn') return

    let first = true

    for (const phase of [
      MatchPhases.ROUND_OF_16,
      MatchPhases.QUARTER,
      MatchPhases.SEMI,
      MatchPhases.FINAL,
    ]) {
      if (phase === MatchPhases.FINAL && stage === 'semi') return

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
        // Um a cada três jogos empata e vai para os pênaltis.
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
   * Marca as partidas sem horário: três por manhã, a partir de 1º de dezembro,
   * nos três locais da escola. Devolve o próximo dia livre.
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
      const [hour, minute] = hours[slot % hours.length].split(':').map(Number)
      match.scheduledAt = DateTime.fromObject(
        { year: 2026, month: 12, day: 1 + (day % 12), hour, minute },
        { zone: 'America/Manaus' }
      )
      match.location = places[slot % places.length]
      await match.save()

      slot += 1
      if (slot % hours.length === 0) day += 1
    }

    return day + 1
  }
}
