import type {
  ActiveStatus,
  BracketStatus,
  CardColor,
  Category,
  MatchPhase,
  MatchStatus,
  UploadStatus,
  UserRole,
} from './entity'

/**
 * Combina dois tipos de objeto com **override**: a chave de `TOverride`
 * substitui a de `TBase`, em vez de intersectar com ela.
 *
 * `A & B` com a mesma chave nos dois lados dá a interseção dos dois tipos da
 * chave (`string & number` vira `never`, `ReactNode & string` vira `string`),
 * e é o defeito que este tipo existe para evitar. O mapeamento achata o
 * resultado num objeto só, que é o que o editor mostra no hover.
 *
 * Não serve para classe: mapear as chaves de uma classe achata os métodos e
 * perde o tipo nominal.
 */
export type Merge<TBase, TOverride> = {
  [K in keyof (Omit<TBase, keyof TOverride> & TOverride)]: (Omit<
    TBase,
    keyof TOverride
  > &
    TOverride)[K]
}

// ---------------------------------------------------------------------------
// Entidades - a forma que a API devolve
// ---------------------------------------------------------------------------

/**
 * Espelham os models do Lucid serializados (`backend/app/core/response.ts`).
 * São `type` e não validators: o que sai do backend já passou pelo VineJS de
 * lá. Validator no frontend é para o que o **usuário** digita, e mora em
 * `src/validators/`.
 *
 * Datas são `string` ISO 8601; `updatedAt` e `deletedAt` são anuláveis.
 */
type ITimestamps = {
  readonly createdAt: string
  readonly updatedAt: string | null
  readonly deletedAt: string | null
}

/**
 * Um arquivo. A `url` é derivada de `path` na leitura, nunca armazenada.
 * `partSize` e `uploadId` são do multipart em curso.
 */
export type IStorage = Merge<
  ITimestamps,
  {
    readonly id: string
    readonly filename: string
    readonly originalName: string
    readonly mimetype: string
    readonly size: number
    readonly path: string
    readonly status: UploadStatus
    readonly url: string
    readonly partSize: number | null
    readonly uploadId: string | null
  }
>

/** O usuário como sai de `toJSON()`. `password` nunca vem. */
export type IUser = Merge<
  ITimestamps,
  {
    readonly id: string
    readonly name: string
    readonly email: string
    readonly role: UserRole
    readonly status: ActiveStatus
    readonly avatarId: string | null
    readonly avatar?: IStorage | null
  }
>

/** Uma conta como vínculo de outra coisa: conselheiro ou representante. */
export type IPerson = Pick<IUser, 'id' | 'name' | 'email' | 'role' | 'status'>

/** A turma, com conselheiro e representante quando o painel os precarrega. */
export type IClassroom = {
  readonly id: string
  readonly name: string
  readonly grade: number
  readonly category: Category
  readonly advisorId: string | null
  readonly representativeId: string | null
  readonly advisor?: IPerson | null
  readonly representative?: IPerson | null
  /** Só na lista do administrador: os totais do cartão da turma. */
  readonly studentsCount?: number
  readonly athletesCount?: number
  readonly sportsCount?: number
  readonly createdAt: string
  readonly updatedAt: string | null
}

export type IStudent = {
  readonly id: string
  readonly name: string
  readonly classroomId: string
  readonly createdAt: string
  readonly updatedAt: string | null
}

export type ISport = {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly minAthletes: number
  readonly maxAthletes: number
  readonly createdAt: string
  readonly updatedAt: string | null
}

export type IAnnouncement = {
  readonly id: string
  readonly title: string
  readonly body: string
  readonly pinned: boolean
  readonly createdAt: string
  readonly updatedAt: string | null
}

/** A turma dentro de uma competição. O nome que sai no placar vem de `classroom`. */
export type ITeam = {
  readonly id: string
  readonly bracketId: string
  readonly classroomId: string
  readonly classroom: IClassroom
}

export type IBracket = {
  readonly id: string
  readonly sportId: string
  readonly category: Category
  readonly status: BracketStatus
  readonly sport?: ISport
  readonly createdAt: string
  readonly updatedAt: string | null
}

/** A partida como a tabela de jogos a lista: os dois times e a competição. */
export type IMatch = {
  readonly id: string
  readonly bracketId: string
  readonly phase: MatchPhase
  readonly round: number
  readonly position: number
  readonly homeTeamId: string | null
  readonly awayTeamId: string | null
  readonly homeScore: number | null
  readonly awayScore: number | null
  readonly winnerTeamId: string | null
  readonly status: MatchStatus
  readonly scheduledAt: string | null
  readonly location: string | null
  readonly homeTeam?: ITeam | null
  readonly awayTeam?: ITeam | null
  readonly bracket?: IBracket
  readonly createdAt: string
  readonly updatedAt: string | null
}

/**
 * O aviso de um atleta tirado de uma modalidade, com o motivo. `studentName` é
 * cópia: o aluno pode ter saído da turma depois.
 */
export type IEnrollmentRemoval = {
  readonly id: string
  readonly classroomId: string
  readonly sportId: string
  readonly studentId: string | null
  readonly studentName: string
  readonly reason: string
  readonly actorId: string | null
  readonly acknowledgedAt: string | null
  readonly classroom: IClassroom
  readonly sport: ISport
  readonly actor: IPerson | null
  readonly createdAt: string
  readonly updatedAt: string | null
}

/** Um cartão: o atleta, o time por que jogava e a partida. */
export type IMatchCard = {
  readonly id: string
  readonly matchId: string
  readonly teamId: string
  readonly studentId: string
  readonly color: CardColor
  readonly note: string | null
  readonly student: IStudent
  readonly team: ITeam
  readonly match: IMatch
  readonly createdAt: string
  readonly updatedAt: string | null
}

/** Quem pode levar cartão na partida (`MatchAthletesResponse`). */
export type IMatchAthletes = {
  readonly teams: ReadonlyArray<{
    readonly teamId: string
    readonly classroomId: string
    readonly name: string
    readonly students: ReadonlyArray<{
      readonly id: string
      readonly name: string
      readonly enrolled: boolean
    }>
  }>
}

/** O que o sorteio faria agora (`DrawPreviewResponse`). */
export type IDrawPreview = {
  readonly minAthletes: number
  readonly maxTeams: number
  readonly drawn: boolean
  readonly classrooms: ReadonlyArray<{
    readonly id: string
    readonly name: string
    readonly athletes: number
    readonly eligible: boolean
  }>
}

/**
 * O plano de upload (`StorageUpload` de `backend/app/features/storages/`). A
 * mesma forma sai de `POST /storages` e de `GET /storages/:id/parts`: começar
 * e retomar são a mesma pergunta. `parts` pode ser menor que `totalParts`,
 * porque as URLs saem em lotes.
 */
export type IStorageUpload = {
  readonly storage: IStorage
  /** Nulo quando o arquivo cabe numa parte só e sobe por um `PUT` simples. */
  readonly uploadId: string | null
  readonly partSize: number
  readonly totalParts: number
  readonly parts: ReadonlyArray<{
    readonly partNumber: number
    readonly url: string
  }>
  readonly uploaded: ReadonlyArray<{
    readonly partNumber: number
    readonly size: number
    readonly etag: string
  }>
}

// ---------------------------------------------------------------------------
// Respostas - envelope e formas de `backend/app/core/response.ts`
// ---------------------------------------------------------------------------

/**
 * O envelope da listagem paginada (`PaginationMeta` do backend). As URLs de
 * anterior e próxima são nulas na primeira e na última página.
 */
export type IPaginationMeta = {
  readonly total: number
  readonly perPage: number
  readonly currentPage: number
  readonly lastPage: number
  readonly firstPage: number
  readonly firstPageUrl: string
  readonly lastPageUrl: string
  readonly nextPageUrl: string | null
  readonly previousPageUrl: string | null
}

export type IPaginated<TItem> = {
  readonly meta: IPaginationMeta
  readonly data: ReadonlyArray<TItem>
}

/** Uma partida como a chave a desenha: os nomes das turmas já resolvidos. */
export type IBracketMatch = {
  readonly id: string
  readonly phase: MatchPhase
  readonly round: number
  readonly position: number
  readonly status: MatchStatus
  readonly homeTeamId: string | null
  readonly awayTeamId: string | null
  readonly homeName: string | null
  readonly awayName: string | null
  readonly homeScore: number | null
  readonly awayScore: number | null
  readonly winnerTeamId: string | null
  readonly scheduledAt: string | null
  readonly location: string | null
}

/** A competição inteira (`BracketDetailResponse`): todas as partidas. */
export type IBracketDetail = {
  readonly id: string
  readonly category: Category
  readonly status: BracketStatus
  readonly sport: {
    readonly id: string
    readonly name: string
    readonly slug: string
  }
  readonly championTeamId: string | null
  readonly matches: ReadonlyArray<IBracketMatch>
}

/**
 * A matriz aluno x modalidade de uma turma (`EnrollmentBoardResponse`).
 * `drawn` diz que a modalidade já foi sorteada na categoria; `locked`, que a
 * lista não muda mais para quem lê - só o representante trava.
 */
export type IEnrollmentBoard = {
  readonly classroom: {
    readonly id: string
    readonly name: string
    readonly category: Category
  }
  readonly sports: ReadonlyArray<{
    readonly id: string
    readonly name: string
    readonly minAthletes: number
    readonly maxAthletes: number
    readonly drawn: boolean
    readonly locked: boolean
  }>
  readonly students: ReadonlyArray<{
    readonly id: string
    readonly name: string
    readonly sportIds: ReadonlyArray<string>
  }>
}
