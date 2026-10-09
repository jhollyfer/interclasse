import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { request } from './http'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import type { Merge } from '#/lib/interfaces'
import type {
  BracketDetail,
  EnrollmentBoard,
  Paginated,
} from '#/integrations/response'
import type { ListSearch, StorefrontSearch } from '#/lib/list-search'
import type {
  Announcement,
  Bracket,
  Classroom,
  Match,
  Sport,
  Student,
  User,
} from '#/lib/validator'

/**
 * Os filtros próprios de cada listagem, por cima dos que toda listagem tem.
 *
 * Os valores são `string` e não o enum do domínio: quem sai da URL é texto, e
 * quem recusa valor fora da lista é a API, com 422 apontando o campo.
 */
export type UserListSearch = Merge<
  ListSearch,
  { role?: string; status?: string }
>

export type ClassroomListSearch = Merge<ListSearch, { category?: string }>

export type BracketListSearch = Merge<
  StorefrontSearch,
  { sportId?: string; category?: string; status?: string }
>

export type MatchListSearch = Merge<
  StorefrontSearch,
  {
    bracketId?: string
    sportId?: string
    category?: string
    phase?: string
    status?: string
  }
>

export type StudentListSearch = Merge<ListSearch, { classroomId?: string }>

/**
 * Monta a query string ignorando o que não foi preenchido.
 *
 * Descarta por falsidade e não por `!== undefined`: o valor pode chegar `null`
 * (o search param existe e está limpo) ou `''`, e `String(null)` viraria o texto
 * "null" no filtro. `page` e `perPage` são `min(1)` no validator, mas número é
 * testado por tipo e não por verdade - um filtro numérico que aceite `0` não
 * pode sumir por ser falso.
 *
 * Aceita toda forma de filtro do painel e a da vitrine. Tipar só como
 * `ListSearch` compilaria -
 * todo campo dela é opcional, então as demais passam por assinabilidade -, mas a
 * assinatura estaria mentindo sobre quem entra aqui.
 */
function search(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, value]) => typeof value === 'number' || Boolean(value),
  )

  if (entries.length === 0) return ''

  return '?'.concat(
    new URLSearchParams(
      entries.map(([key, value]) => [key, String(value)]),
    ).toString(),
  )
}

/**
 * A sessão. Não há store, contexto nem hook de auth neste repositório de
 * propósito: quem está logado é dado do servidor, e dado do servidor mora no
 * cache do TanStack Query.
 *
 * `queryOptions` e não um objeto solto para que o `beforeLoad` do layout e o
 * `useQuery` do cabeçalho usem literalmente a mesma chave - é o que faz o
 * segundo aproveitar o cache que o primeiro encheu, em vez de repetir a
 * requisição.
 */
export const accountQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.account.all,
    // O `signal` vem da própria biblioteca e é repassado ao `fetch`: sem ele,
    // query que desmonta antes de resolver não cancela nada, e a resposta
    // atrasada de uma sessão anterior chega depois da atual.
    queryFn: ({ signal }) => request<User>('/account', { signal }),
    // O 401 já foi tratado dentro de `request`, que tentou renovar a sessão e
    // não conseguiu. Repetir a chamada não muda a resposta, só atrasa o
    // redirecionamento para o login.
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

// ---------------------------------------------------------------------------
// /administrator
// ---------------------------------------------------------------------------

/**
 * `keepPreviousData` não é enfeite: sem ele, trocar de página passa por
 * `pending` e a tabela inteira esvazia no meio da navegação.
 */
export const usersQueryOptions = (params: UserListSearch) =>
  queryOptions({
    queryKey: queryKeys.users.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<User>>('/administrator/users'.concat(search(params)), {
        signal,
      }),
    placeholderData: keepPreviousData,
  })

/** O corpo vem nu, sem envelope - é o que o controller devolve. */
export const userQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.users.detail(id),
    queryFn: ({ signal }) =>
      request<User>('/administrator/users/'.concat(id), { signal }),
  })

export const classroomsQueryOptions = (params: ClassroomListSearch) =>
  queryOptions({
    queryKey: queryKeys.classrooms.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<Classroom>>(
        '/administrator/classrooms'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const classroomQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.classrooms.detail(id),
    queryFn: ({ signal }) =>
      request<Classroom>('/administrator/classrooms/'.concat(id), { signal }),
  })

export const sportsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.sports.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<Sport>>(
        '/administrator/sports'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const sportQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.sports.detail(id),
    queryFn: ({ signal }) =>
      request<Sport>('/administrator/sports/'.concat(id), { signal }),
  })

export const announcementsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.announcements.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<Announcement>>(
        '/administrator/announcements'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const announcementQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.announcements.detail(id),
    queryFn: ({ signal }) =>
      request<Announcement>('/administrator/announcements/'.concat(id), {
        signal,
      }),
  })

export const bracketsQueryOptions = (params: BracketListSearch) =>
  queryOptions({
    queryKey: queryKeys.brackets.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<Bracket>>(
        '/administrator/brackets'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** A chave inteira, com a classificação calculada do placar. */
export const bracketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.brackets.detail(id),
    queryFn: ({ signal }) =>
      request<BracketDetail>('/administrator/brackets/'.concat(id), {
        signal,
      }),
  })

export const matchesQueryOptions = (params: MatchListSearch) =>
  queryOptions({
    queryKey: queryKeys.matches.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<Match>>(
        '/administrator/matches'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

// ---------------------------------------------------------------------------
// /advisor e /representative
// ---------------------------------------------------------------------------

/** As turmas do conselheiro. O administrador recebe todas. */
export const advisorClassroomsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.advisorClassrooms.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<Classroom>>(
        '/advisor/classrooms'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const studentsQueryOptions = (params: StudentListSearch) =>
  queryOptions({
    queryKey: queryKeys.students.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<Student>>('/advisor/students'.concat(search(params)), {
        signal,
      }),
    placeholderData: keepPreviousData,
  })

/** A matriz aluno x modalidade de uma turma do conselheiro. */
export const advisorEnrollmentsQueryOptions = (classroomId: string) =>
  queryOptions({
    queryKey: queryKeys.enrollments.board(classroomId),
    queryFn: ({ signal }) =>
      request<EnrollmentBoard>(
        '/advisor/enrollments'.concat(search({ classroomId })),
        { signal },
      ),
  })

/** A matriz da turma do representante. A turma sai da sessão: chave `null`. */
export const representativeEnrollmentsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.enrollments.board(null),
    queryFn: ({ signal }) =>
      request<EnrollmentBoard>('/representative/enrollments', { signal }),
    retry: false,
  })

// ---------------------------------------------------------------------------
// /storefront
// ---------------------------------------------------------------------------

/**
 * O site público, sem sessão. O `request` continua o mesmo: manda o cookie
 * quando existe, e estas rotas simplesmente não o exigem.
 *
 * Jogos e chaves se atualizam sozinhos a cada minuto com a aba aberta: no dia
 * dos jogos o placar entra pelo painel, e quem acompanha pelo celular não
 * precisa recarregar a página para ver.
 */
const LIVE = 60 * 1000

export const storefrontSportsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.storefront.sports,
    queryFn: ({ signal }) =>
      request<Paginated<Sport>>('/storefront/sports?perPage=100', { signal }),
    staleTime: 5 * 60 * 1000,
  })

export const storefrontAnnouncementsQueryOptions = (params: StorefrontSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.announcements(params),
    queryFn: ({ signal }) =>
      request<Paginated<Announcement>>(
        '/storefront/announcements'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const storefrontMatchesQueryOptions = (params: MatchListSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.matches(params),
    queryFn: ({ signal }) =>
      request<Paginated<Match>>('/storefront/matches'.concat(search(params)), {
        signal,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: LIVE,
  })

export const storefrontBracketsQueryOptions = (params: BracketListSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.brackets(params),
    queryFn: ({ signal }) =>
      request<Paginated<Bracket>>(
        '/storefront/brackets'.concat(search(params)),
        { signal },
      ),
  })

export const storefrontBracketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.storefront.bracket(id),
    queryFn: ({ signal }) =>
      request<BracketDetail>('/storefront/brackets/'.concat(id), { signal }),
    refetchInterval: LIVE,
  })
