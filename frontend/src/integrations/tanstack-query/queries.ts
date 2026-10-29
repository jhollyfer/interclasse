import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import type {
  Merge,
  IBracketDetail,
  IDrawPreview,
  IEnrollmentBoard,
  IEnrollmentRemoval,
  IMatchAthletes,
  IMatchCard,
  IPaginated,
  IAnnouncement,
  IBracket,
  IClassroom,
  IMatch,
  ISport,
  IStudent,
  IUser,
  IPhoto,
  ISiteSetting,
  IStorefrontPhoto,
  IStorefrontSite,
} from '#/lib/interfaces'
import type { ListSearch, StorefrontSearch } from '#/lib/list-search'

import { request } from './http'

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
    classroomId?: string
    sportId?: string
    category?: string
    phase?: string
    status?: string
  }
>

export type PhotoListSearch = Merge<ListSearch, { status?: string }>

export type StudentListSearch = Merge<ListSearch, { classroomId?: string }>

export type CardListSearch = Merge<
  ListSearch,
  { matchId?: string; classroomId?: string; studentId?: string }
>

export type RemovalListSearch = Merge<ListSearch, { pending?: boolean }>

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
    queryKey: queryKeys.account.profile.all,
    // O `signal` vem da própria biblioteca e é repassado ao `fetch`: sem ele,
    // query que desmonta antes de resolver não cancela nada, e a resposta
    // atrasada de uma sessão anterior chega depois da atual.
    queryFn: ({ signal }) => request<IUser>('/account', { signal }),
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
    queryKey: queryKeys.administrator.users.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IUser>>(
        '/administrator/users'.concat(search(params)),
        {
          signal,
        },
      ),
    placeholderData: keepPreviousData,
  })

/** O corpo vem nu, sem envelope - é o que o controller devolve. */
export const userQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.users.detail(id),
    queryFn: ({ signal }) =>
      request<IUser>('/administrator/users/'.concat(id), { signal }),
  })

export const classroomsQueryOptions = (params: ClassroomListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.classrooms.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IClassroom>>(
        '/administrator/classrooms'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const classroomQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.classrooms.detail(id),
    queryFn: ({ signal }) =>
      request<IClassroom>('/administrator/classrooms/'.concat(id), { signal }),
  })

export const sportsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.sports.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<ISport>>(
        '/administrator/sports'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const sportQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.sports.detail(id),
    queryFn: ({ signal }) =>
      request<ISport>('/administrator/sports/'.concat(id), { signal }),
  })

export const announcementsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.announcements.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IAnnouncement>>(
        '/administrator/announcements'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const announcementQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.announcements.detail(id),
    queryFn: ({ signal }) =>
      request<IAnnouncement>('/administrator/announcements/'.concat(id), {
        signal,
      }),
  })

export const bracketsQueryOptions = (params: BracketListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.brackets.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IBracket>>(
        '/administrator/brackets'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** A chave inteira, com a classificação calculada do placar. */
export const bracketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.brackets.detail(id),
    queryFn: ({ signal }) =>
      request<IBracketDetail>('/administrator/brackets/'.concat(id), {
        signal,
      }),
  })

export const matchesQueryOptions = (params: MatchListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.matches.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IMatch>>(
        '/administrator/matches'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** Quem entraria no sorteio agora. Só consulta: o sorteio é o `POST`. */
export const bracketPreviewQueryOptions = (sportId: string, category: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.brackets.preview(sportId, category),
    queryFn: ({ signal }) =>
      request<IDrawPreview>(
        '/administrator/brackets/preview'.concat(search({ sportId, category })),
        { signal },
      ),
    // A prévia muda a cada lista salva pelas turmas: o diálogo sempre relê.
    staleTime: 0,
  })

export const matchAthletesQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.matches.athletes(id),
    queryFn: ({ signal }) =>
      request<IMatchAthletes>(
        '/administrator/matches/'.concat(id, '/athletes'),
        { signal },
      ),
  })

export const cardsQueryOptions = (params: CardListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.cards.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IMatchCard>>(
        '/administrator/cards'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const enrollmentRemovalsQueryOptions = (params: RemovalListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.enrollmentRemovals.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IEnrollmentRemoval>>(
        '/administrator/enrollment-removals'.concat(search(params)),
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
    queryKey: queryKeys.advisor.classrooms.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IClassroom>>(
        '/advisor/classrooms'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const studentsQueryOptions = (params: StudentListSearch) =>
  queryOptions({
    queryKey: queryKeys.advisor.students.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IStudent>>(
        '/advisor/students'.concat(search(params)),
        {
          signal,
        },
      ),
    placeholderData: keepPreviousData,
  })

/** A matriz aluno x modalidade de uma turma do conselheiro. */
export const advisorCardsQueryOptions = (
  params: Merge<ListSearch, { classroomId: string }>,
) =>
  queryOptions({
    queryKey: queryKeys.advisor.cards.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IMatchCard>>('/advisor/cards'.concat(search(params)), {
        signal,
      }),
    placeholderData: keepPreviousData,
  })

export const advisorEnrollmentsQueryOptions = (classroomId: string) =>
  queryOptions({
    queryKey: queryKeys.advisor.enrollments.board(classroomId),
    queryFn: ({ signal }) =>
      request<IEnrollmentBoard>(
        '/advisor/enrollments'.concat(search({ classroomId })),
        { signal },
      ),
  })

/** A matriz da turma do representante. A turma sai da sessão: chave `null`. */
export const representativeEnrollmentsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.representative.enrollments.board,
    queryFn: ({ signal }) =>
      request<IEnrollmentBoard>('/representative/enrollments', { signal }),
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
    queryKey: queryKeys.storefront.sports.all,
    queryFn: ({ signal }) =>
      request<IPaginated<ISport>>('/storefront/sports?perPage=100', { signal }),
    staleTime: 5 * 60 * 1000,
  })

/** As fotos enviadas, para a revisão da organização. `?status` recorta a fila. */
export const photosQueryOptions = (params: PhotoListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.photos.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IPhoto>>(
        '/administrator/photos'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** As fotos que o conselheiro enviou, com a decisão de cada uma. */
export const advisorPhotosQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.advisor.photos.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IPhoto>>('/advisor/photos'.concat(search(params)), {
        signal,
      }),
    placeholderData: keepPreviousData,
  })

/**
 * O carrossel do site. As URLs são assinadas e vencem em minutos: `staleTime`
 * abaixo disso, para nenhuma foto virar imagem quebrada na tela aberta.
 */
export const storefrontPhotosQueryOptions = (params: StorefrontSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.photos.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IStorefrontPhoto>>(
        '/storefront/photos'.concat(search(params)),
        { signal },
      ),
    staleTime: 5 * 60 * 1000,
  })

/** A configuração do site no painel. */
export const siteQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.administrator.site,
    queryFn: ({ signal }) =>
      request<ISiteSetting>('/administrator/site', { signal }),
  })

/**
 * O "Sobre" e o regulamento no site. A URL do PDF é assinada e vence em
 * minutos: `staleTime` abaixo disso, para o botão nunca apontar para um link
 * vencido.
 */
export const storefrontSiteQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.storefront.site,
    queryFn: ({ signal }) =>
      request<IStorefrontSite>('/storefront/site', { signal }),
    staleTime: 5 * 60 * 1000,
  })

export const storefrontAnnouncementsQueryOptions = (params: StorefrontSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.announcements.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IAnnouncement>>(
        '/storefront/announcements'.concat(search(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const storefrontMatchesQueryOptions = (params: MatchListSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.matches.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IMatch>>(
        '/storefront/matches'.concat(search(params)),
        {
          signal,
        },
      ),
    placeholderData: keepPreviousData,
    refetchInterval: LIVE,
  })

export const storefrontBracketsQueryOptions = (params: BracketListSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.brackets.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IBracket>>(
        '/storefront/brackets'.concat(search(params)),
        { signal },
      ),
  })

export const storefrontBracketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.storefront.brackets.detail(id),
    queryFn: ({ signal }) =>
      request<IBracketDetail>('/storefront/brackets/'.concat(id), { signal }),
    refetchInterval: LIVE,
  })
