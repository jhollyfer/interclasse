import type {
  AdministratorBracketCreateResponse,
  AdministratorSportShowResponse,
} from '@interclasse/shared'

import type { Bracket } from '#domain/bracket/bracket.entity'

/**
 * The bracket in the shape of the `shared/` response (`_standards/architecture.md` §10):
 * the presenter is typed by the same schema that OpenAPI and the frontend read, so
 * a field that is not in it does not reach the response.
 */
export class BracketPresenter {
  /** The bracket with the sport: the shape of the list, the draw and the repeated draw. */
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
