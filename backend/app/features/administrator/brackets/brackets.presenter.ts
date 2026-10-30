import type {
  AdministratorBracketCreateResponse,
  AdministratorSportShowResponse,
} from '@interclasse/shared'

import type { Bracket } from '#domain/bracket/bracket.entity'

/**
 * A chave na forma da resposta do `shared/` (`_standards/architecture.md` §10):
 * o presenter é tipado pelo mesmo schema que o OpenAPI e o frontend leem, então
 * campo que não está nele não chega à resposta.
 */
export class BracketPresenter {
  /** A chave com a modalidade: a forma da lista, do sorteio e do sorteio repetido. */
  static created(
    bracket: Bracket,
    sport: AdministratorSportShowResponse,
  ): AdministratorBracketCreateResponse {
    const { id, sportId, category, status, createdAt, updatedAt } = bracket.snapshot()

    return {
      id,
      sportId,
      category,
      status,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt?.toISOString() ?? null,
      sport,
    }
  }
}
