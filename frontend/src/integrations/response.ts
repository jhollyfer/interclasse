/**
 * Os corpos de resposta da API, espelhando `backend/app/core/response.ts`.
 *
 * São `type` e não validators: o que sai do backend já passou pelo VineJS de
 * lá, e validar de novo aqui criaria uma segunda fonte de verdade sobre o mesmo
 * dado, sem nada em troca. Validator no frontend é para o que o **usuário**
 * digita, e mora em `src/validators/<módulo>/<recurso>.validator.ts`.
 *
 * Aqui entra só **envelope e forma de resposta** - a paginação, os contadores
 * da chave e das inscrições. As entidades em si (`Storage`, `User`,
 * `Classroom`, ...) continuam em `lib/validator.ts`, que é o espelho do que o
 * formulário escreve: duplicá-las aqui daria dois tipos para o mesmo recurso, e
 * a divergência entre eles apareceria como erro ao passar um pelo outro.
 */

import type {
  BracketStatus,
  Category,
  MatchPhase,
  MatchStatus,
} from '#/lib/entity'

// ---------------------------------------------------------------------------
// Paginação
// ---------------------------------------------------------------------------

/**
 * O envelope da listagem paginada, espelhando `PaginationMeta` de
 * `backend/app/core/entity.ts`.
 *
 * Os quatro campos de URL vêm do paginator do Lucid, e os dois do meio são
 * anuláveis: na primeira página não há anterior, na última não há próxima.
 */
export type PaginationMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
  firstPageUrl: string
  lastPageUrl: string
  nextPageUrl: string | null
  previousPageUrl: string | null
}

export type Paginated<TItem> = {
  meta: PaginationMeta
  data: Array<TItem>
}

// ---------------------------------------------------------------------------
// Chave - `BracketDetailResponse`
// ---------------------------------------------------------------------------

/** Uma partida como a chave a desenha: os nomes das turmas já resolvidos. */
export type BracketMatch = {
  id: string
  phase: MatchPhase
  round: number
  position: number
  status: MatchStatus
  homeTeamId: string | null
  awayTeamId: string | null
  homeName: string | null
  awayName: string | null
  homeScore: number | null
  awayScore: number | null
  winnerTeamId: string | null
  scheduledAt: string | null
  location: string | null
}

/** A competição inteira: todas as partidas de cada fase. */
export type BracketDetail = {
  id: string
  category: Category
  status: BracketStatus
  sport: { id: string; name: string; slug: string }
  championTeamId: string | null
  matches: Array<BracketMatch>
}

// ---------------------------------------------------------------------------
// Inscrições - `EnrollmentBoardResponse`
// ---------------------------------------------------------------------------

/**
 * A matriz aluno x modalidade de uma turma. `locked` diz que a modalidade já foi
 * sorteada na categoria da turma: a lista não muda mais.
 */
export type EnrollmentBoard = {
  classroom: { id: string; name: string; category: Category }
  sports: Array<{
    id: string
    name: string
    minAthletes: number
    maxAthletes: number
    locked: boolean
  }>
  students: Array<{ id: string; name: string; sportIds: Array<string> }>
}
