/**
 * O que a chave recusa, como fato (`_standards/domain.md` §2): sem status HTTP
 * nem texto de tela. O use-case traduz cada um.
 */
export type BracketError =
  | {
      readonly code: 'NOT_ENOUGH_TEAMS'
      readonly minTeams: number
      readonly minAthletes: number
    }
  | { readonly code: 'TOO_MANY_TEAMS'; readonly maxTeams: number }
  | { readonly code: 'BRACKET_HAS_RESULTS' }
  /** A modalidade já tem chave sorteada nesta categoria: a corrida de dois sorteios. */
  | { readonly code: 'BRACKET_ALREADY_EXISTS' }

/** O que a partida, filha da chave, recusa ao agendar, lançar ou desfazer o placar. */
export type MatchError =
  | { readonly code: 'MATCH_NOT_FOUND' }
  | { readonly code: 'MATCH_TEAMS_PENDING' }
  | { readonly code: 'MATCH_WINNER_REQUIRED' }
  | { readonly code: 'MATCH_NOT_PLAYED' }
  /** Corrigir o vencedor depois que ele já jogou a seguinte reescreveria o que houve em quadra. */
  | { readonly code: 'MATCH_NEXT_PLAYED_ON_SCORE' }
  /** Desfazer este placar deixaria na seguinte um time que não se sabe mais por que está lá. */
  | { readonly code: 'MATCH_NEXT_PLAYED_ON_UNSCORE' }
