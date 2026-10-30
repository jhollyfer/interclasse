import type {
  AdministratorSportShowResponse,
  Either,
  Paginated,
  SortDirection,
} from '@interclasse/shared'

import type { Sport } from '#domain/sport/sport.entity'
import type { SportError } from '#domain/sport/sport.errors'

export type SportListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly sort: 'name' | 'createdAt'
  readonly direction: SortDirection
}

/**
 * A persistência da modalidade, por intenção (`_standards/domain.md` §5.1). O
 * escritor único da tabela `sports`; lê as inscrições e as chaves só para
 * responder o que a regra da modalidade pergunta.
 */
export abstract class SportRepository {
  abstract findById(id: string): Promise<Sport | null>
  /** Outra modalidade, que não `exceptId`, já usa o nome ou o slug. */
  abstract existsByNameOrSlug(name: string, slug: string, exceptId?: string): Promise<boolean>
  /** O maior número de atletas que uma turma tem inscritos nesta modalidade. */
  abstract largestRoster(sportId: string): Promise<number>
  /** Tem inscrição ou chave: apagar deixaria as duas sem modalidade. */
  abstract isInUse(sportId: string): Promise<boolean>
  /** Grava a modalidade; nome ou slug de outra (a corrida no `unique`) volta como `SPORT_ALREADY_EXISTS`. */
  abstract save(sport: Sport): Promise<Either<SportError, void>>
  abstract delete(sport: Sport): Promise<void>
  /** Leitura leve: a forma da resposta direto da query, sem hidratar entidade. */
  abstract paginate(criteria: SportListCriteria): Promise<Paginated<AdministratorSportShowResponse>>
}
