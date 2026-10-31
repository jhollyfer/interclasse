import type { AdministratorSportShowResponse } from '@interclasse/shared'

import type { Sport } from '#domain/sport/sport.entity'

/**
 * The sport in the shape of the `shared/` response (`_standards/architecture.md`
 * §10): the presenter is typed by the same schema that OpenAPI and the frontend read,
 * so a field that is not in it does not reach the response.
 */
export class SportPresenter {
  static show(sport: Sport): AdministratorSportShowResponse {
    const { id, name, slug, minAthletes, maxAthletes, createdAt, updatedAt } = sport.snapshot()

    return {
      id,
      name,
      slug,
      minAthletes,
      maxAthletes,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt?.toISOString() ?? null,
    }
  }
}
