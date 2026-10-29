import type { AdministratorEnrollmentRemovalShowResponse, Paginated } from '@interclasse/shared'

import type { EnrollmentRemoval } from '#domain/enrollment-removal/enrollment-removal.entity'

export type EnrollmentRemovalListCriteria = {
  readonly page: number
  readonly perPage: number
  /** `true` só os pendentes, `false` só os lidos, ausente os dois. */
  readonly pending?: boolean
  readonly classroomId?: string
}

/**
 * A persistência do aviso de remoção, por intenção (`_standards/domain.md` §5.1).
 * O escritor único da tabela `enrollment_removals`.
 */
export abstract class EnrollmentRemovalRepository {
  abstract findById(id: string): Promise<EnrollmentRemoval | null>
  abstract save(removal: EnrollmentRemoval): Promise<void>
  /** Os avisos de uma troca de lista, numa escrita só. */
  abstract saveAll(removals: EnrollmentRemoval[]): Promise<void>
  /** Leitura leve: o aviso com a turma, a modalidade e quem tirou, direto da query. */
  abstract findDetail(id: string): Promise<AdministratorEnrollmentRemovalShowResponse | null>
  /** Do mais novo ao mais antigo, pendentes primeiro. */
  abstract paginate(
    criteria: EnrollmentRemovalListCriteria,
  ): Promise<Paginated<AdministratorEnrollmentRemovalShowResponse>>
}
