import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type { AdministratorCardPaginateResponse, Paginated } from '@interclasse/shared'

import {
  MatchCardRepository,
  type CardListCriteria,
  type CardStudent,
} from './match-card.repository.ts'

import MatchCardModel from '#models/match-card'
import StudentModel from '#models/student'
import { MatchCard, type MatchCardProps } from '#domain/match-card/match-card.entity'
import { BracketRepository } from '#repositories/bracket/bracket.repository'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

@inject()
export class MatchCardLucidRepository extends MatchCardRepository {
  constructor(
    private readonly transaction: TransactionContext,
    private readonly brackets: BracketRepository,
  ) {
    super()
  }

  async findById(id: string): Promise<MatchCard | null> {
    const row = await MatchCardModel.query({ client: this.transaction.client() })
      .where('id', id)
      .first()
    if (!row) return null

    return MatchCard.restore(this.toProps(row))
  }

  async findStudentClassroom(studentId: string): Promise<string | null> {
    const student = await StudentModel.query({ client: this.transaction.client() })
      .where('id', studentId)
      .first()

    return student?.classroomId ?? null
  }

  async save(card: MatchCard): Promise<void> {
    const { id, createdAt, updatedAt, ...columns } = card.snapshot()

    await MatchCardModel.updateOrCreate(
      { id },
      {
        ...columns,
        createdAt: DateTime.fromJSDate(createdAt),
        updatedAt: this.dateOrNull(updatedAt),
      },
      { client: this.transaction.client() },
    )
  }

  async delete(card: MatchCard): Promise<void> {
    await MatchCardModel.query({ client: this.transaction.client() }).where('id', card.id).delete()
  }

  async paginate(
    criteria: CardListCriteria,
  ): Promise<Paginated<AdministratorCardPaginateResponse>> {
    const query = MatchCardModel.query({ client: this.transaction.client() }).preload('student')

    if (criteria.matchId) query.where('matchId', criteria.matchId)
    if (criteria.studentId) query.where('studentId', criteria.studentId)
    if (criteria.classroomId) {
      const classroomId = criteria.classroomId
      query.whereHas('team', (team) => {
        team.where('classroomId', classroomId)
      })
    }

    const page = await query.orderBy('createdAt', 'desc').paginate(criteria.page, criteria.perPage)
    const matches = await this.brackets.findMatchResponses([
      ...new Set(page.all().map((row) => row.matchId)),
    ])

    return {
      meta: page.getMeta(),
      data: page.all().flatMap((row) => {
        const match = matches.get(row.matchId)
        if (!match) return []

        return this.assemble(this.toProps(row), this.toStudent(row.student), match) ?? []
      }),
    }
  }

  async findResponse(id: string): Promise<AdministratorCardPaginateResponse | null> {
    const row = await MatchCardModel.query({ client: this.transaction.client() })
      .where('id', id)
      .preload('student')
      .first()
    if (!row) return null

    const match = await this.brackets.findMatchResponse(row.matchId)
    if (!match) return null

    return this.assemble(this.toProps(row), this.toStudent(row.student), match)
  }

  private toProps(row: MatchCardModel): MatchCardProps {
    return {
      id: row.id,
      matchId: row.matchId,
      teamId: row.teamId,
      studentId: row.studentId,
      color: row.color,
      note: row.note,
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt?.toJSDate() ?? null,
    }
  }

  private toStudent(row: StudentModel): CardStudent {
    return {
      id: row.id,
      name: row.name,
      classroomId: row.classroomId,
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt?.toJSDate() ?? null,
    }
  }

  private dateOrNull(date: Date | null): DateTime | null {
    if (!date) return null

    return DateTime.fromJSDate(date)
  }
}
