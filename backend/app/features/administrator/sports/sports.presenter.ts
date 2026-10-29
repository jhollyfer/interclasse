import type { AdministratorSportShowResponse } from '@interclasse/shared'

import type { Sport } from '#domain/sport/sport.entity'

/**
 * A modalidade na forma da resposta do `shared/` (`_standards/architecture.md`
 * §10): o presenter é tipado pelo mesmo schema que o OpenAPI e o frontend leem,
 * então campo que não está nele não chega à resposta.
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
