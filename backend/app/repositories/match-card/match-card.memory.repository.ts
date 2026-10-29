import type { AdministratorCardPaginateResponse, Paginated } from '@interclasse/shared'

import {
  MatchCardRepository,
  type CardListCriteria,
  type CardStudent,
} from './match-card.repository.ts'

import { MatchCard, type MatchCardProps } from '#domain/match-card/match-card.entity'
import { MemoryPagination } from '#repositories/memory-pagination'
import type { BracketRepository } from '#repositories/bracket/bracket.repository'

/**
 * A segunda implementação de verdade, para o teste unitário do use-case
 * (`_standards/domain.md` §5.3). Guarda cópias: o teste não altera o "banco"
 * por referência. A partida e o time vêm do repositório da chave que o teste
 * passa; os alunos que o cartão só lê são arranjados pelo teste.
 */
export class MatchCardMemoryRepository extends MatchCardRepository {
  private readonly rows = new Map<string, MatchCardProps>()
  private readonly students = new Map<string, CardStudent>()

  constructor(private readonly brackets: BracketRepository) {
    super()
  }

  /** Arranjo do teste: um aluno existente. */
  withStudent(student: CardStudent): this {
    this.students.set(student.id, student)
    return this
  }

  async findById(id: string): Promise<MatchCard | null> {
    const props = this.rows.get(id)
    if (!props) return null

    return MatchCard.restore(structuredClone(props))
  }

  async findStudentClassroom(studentId: string): Promise<string | null> {
    return this.students.get(studentId)?.classroomId ?? null
  }

  async save(card: MatchCard): Promise<void> {
    this.rows.set(card.id, structuredClone(card.snapshot()))
  }

  async delete(card: MatchCard): Promise<void> {
    this.rows.delete(card.id)
  }

  async paginate(
    criteria: CardListCriteria,
  ): Promise<Paginated<AdministratorCardPaginateResponse>> {
    const matching: MatchCardProps[] = []
    for (const card of this.rows.values()) {
      if (criteria.matchId && card.matchId !== criteria.matchId) continue
      if (criteria.studentId && card.studentId !== criteria.studentId) continue
      if (criteria.classroomId && !(await this.playsFor(card, criteria.classroomId))) continue

      matching.push(card)
    }

    const responses: AdministratorCardPaginateResponse[] = []
    for (const card of matching.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
      const response = await this.findResponse(card.id)
      if (response) responses.push(response)
    }

    return MemoryPagination.slice(responses, criteria.page, criteria.perPage)
  }

  async findResponse(id: string): Promise<AdministratorCardPaginateResponse | null> {
    const card = this.rows.get(id)
    const student = card && this.students.get(card.studentId)
    if (!card || !student) return null

    const match = await this.brackets.findMatchResponse(card.matchId)
    if (!match) return null

    return this.assemble(card, student, match)
  }

  /** O time do cartão é da turma pedida. */
  private async playsFor(card: MatchCardProps, classroomId: string): Promise<boolean> {
    const bracket = await this.brackets.findByMatchId(card.matchId)
    const team = bracket?.snapshot().teams.find((candidate) => candidate.id === card.teamId)

    return team?.classroomId === classroomId
  }
}
