/**
 * Cada hook guarda um `mutationFn`, e só. O que ele aceita é o contrato da
 * própria biblioteca menos esse campo.
 *
 * `Omit<UseMutationOptions<...>, 'mutationFn'>` e não um objeto escrito à mão
 * porque `onSuccess`, `onError` e `onSettled` são decisão de tela: o mesmo hook
 * é chamado de rotas e componentes diferentes, e cada um trata o resultado do
 * seu jeito. **Nada aqui executa callback** - o hook repassa o que recebeu, e
 * um callback novo não exige editar este arquivo.
 *
 * Indexar `MutationOptions['onError']` sem argumentos não serve: os generics
 * têm default (`TVariables = void`), e com `strictFunctionTypes` o parâmetro é
 * contravariante, então a função resultante não aceita o payload. Os generics
 * precisam vir preenchidos, e é o que os aliases abaixo fazem.
 *
 * O `TError` continua explícito por ser documentação no lugar certo, mas já é o
 * default do app: `register.d.ts` declara `Register.defaultError` como `HTTPError`.
 */

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import type { UseMutationOptions } from '@tanstack/react-query'

import { useMultipartUpload } from '#/hooks/use-multipart-upload'
import type {
  IAnnouncement,
  IBracket,
  IClassroom,
  IMatch,
  ISport,
  IStorage,
  IStudent,
  IUser,
  IEnrollmentBoard,
  IEnrollmentRemoval,
  IMatchCard,
  ISiteSetting,
  Merge,
} from '#/lib/interfaces'
import type { ProfileUpdatePayload } from '#/validators/account/profile.validator'
import type { SiteUpdatePayload } from '#/validators/administrator/site.validator'
import type {
  AnnouncementCreatePayload,
  AnnouncementUpdatePayload,
} from '#/validators/administrator/announcements.validator'
import type { BracketCreatePayload } from '#/validators/administrator/brackets.validator'
import type { CardCreatePayload } from '#/validators/administrator/cards.validator'
import type {
  ClassroomCreatePayload,
  ClassroomUpdatePayload,
} from '#/validators/administrator/classrooms.validator'
import type {
  MatchScorePayload,
  MatchUpdatePayload,
} from '#/validators/administrator/matches.validator'
import type {
  SportCreatePayload,
  SportUpdatePayload,
} from '#/validators/administrator/sports.validator'
import type {
  UserCreatePayload,
  UserUpdatePayload,
} from '#/validators/administrator/users.validator'
import type { EnrollmentUpdatePayload as AdvisorEnrollmentUpdatePayload } from '#/validators/advisor/enrollments.validator'
import type {
  StudentCreatePayload,
  StudentUpdatePayload,
} from '#/validators/advisor/students.validator'
import type { SessionSignInPayload } from '#/validators/authentication/sessions.validator'
import type { EnrollmentUpdatePayload as RepresentativeEnrollmentUpdatePayload } from '#/validators/representative/enrollments.validator'

import type { HTTPError } from './http'
import { request, send } from './http'
import { shouldRetryQuery } from './query-context'

// ---------------------------------------------------------------------------
// /account
// ---------------------------------------------------------------------------

/**
 * As opções que todo hook deste arquivo aceita: o contrato do TanStack Query
 * menos o `mutationFn`, que é o que o hook guarda.
 *
 * Vinte e seis tipos escreviam esta mesma forma por extenso, cada um só trocando
 * o par `<dado, payload>` — e nada garantia que continuassem iguais. Portado de
 * `lowcodejs`, que já tinha fatorado a forma.
 *
 * Os generics precisam vir preenchidos: eles têm default (`TVariables = void`) e,
 * com `strictFunctionTypes`, o parâmetro dos callbacks é contravariante — sem
 * preencher, a função resultante não aceita o payload.
 *
 * `TError` tem default `HTTPError` porque todo caminho de falha de `request()`
 * lança `HTTPError` — é o que `register.d.ts` declara em `Register.defaultError`. Quem
 * não passa por `request()` o informa: o upload multipart fala com o bucket
 * direto e pode lançar `Error` cru.
 */
type MutationProps<TData, TPayload, TError = HTTPError> = Omit<
  UseMutationOptions<TData, TError, TPayload>,
  'mutationFn'
>

/**
 * A própria conta. Sem `id` no payload nem no caminho: o usuário vem sempre da
 * sessão, e é a mesma razão pela qual não existe `status` nem `role` aqui -
 * ninguém se inativa nem se promove.
 *
 * Trocar a senha derruba a sessão em curso, inclusive a que fez esta
 * requisição. Quem chama decide o que fazer com isso.
 *
 * `currentPassword` só é exigido quando `password` **existe como chave** - o
 * `requiredIfExists` do backend olha a chave, não o valor. Um `password: ''`
 * vira `null` e ainda conta como presente, então o campo tem de ser **omitido**
 * do payload, e não enviado vazio.
 */
export function useAccountUpdate(
  options?: MutationProps<IUser, ProfileUpdatePayload>,
) {
  return useMutation<IUser, HTTPError, ProfileUpdatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IUser>('/account', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// /authentication
// ---------------------------------------------------------------------------

/**
 * Entra. Responde `204` e entrega os dois tokens em `Set-Cookie`, `httpOnly` -
 * não há nada a guardar na tela, e quem passa a saber quem está logado é o
 * `GET /account`.
 */
export function useAuthenticationSignIn(
  options?: MutationProps<void, SessionSignInPayload>,
) {
  // Os generics ficam explícitos: são eles que dão tipo contextual aos
  // callbacks do chamador. A regra "tipe a queryFn, não o hook" vale para
  // query, onde `select` e `data` dependem da inferência em cadeia.
  return useMutation<void, HTTPError, SessionSignInPayload>({
    ...options,
    mutationFn: async function (payload) {
      await send('/authentication/sign-in', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

/** Encerra a sessão no servidor, e não só na tela. */
export function useAuthenticationSignOut(options?: MutationProps<void, void>) {
  return useMutation<void, HTTPError, void>({
    ...options,
    mutationFn: async function () {
      await send('/authentication/sign-out', { method: 'POST' })
    },
  })
}

// ---------------------------------------------------------------------------
// /storages
// ---------------------------------------------------------------------------

/**
 * Envia um arquivo e devolve o registro com a `url` derivada.
 *
 * O envio inteiro é do `useMultipartUpload`: o binário não passa pela API, e o
 * que acontece aqui dentro são três chamadas - abrir, subir direto ao bucket,
 * confirmar. Esta mutation existe por cima dele para dar o `isPending` e os
 * callbacks a quem só quer "subiu ou não", que é o caso do campo de imagem
 * única. Quem precisa da barra de progresso e do cancelamento usa o hook
 * direto, porque `useMutation` não tem por onde entregar progresso.
 *
 * O erro é `Error` e não `HTTPError`: o hook recusa localmente o tipo de
 * arquivo antes de gastar requisição, e essa recusa não tem status HTTP.
 *
 * O arquivo nasce **sem dono**: quem anexa é que guarda a referência, passando
 * o `id` devolvido aqui em `avatarId`, `coverId` ou equivalente da entidade que
 * recebe o anexo. Por isso a mutation não invalida nada - não há listagem de
 * anexos para atualizar.
 *
 * O `AbortSignal` é de um controller que vive enquanto o componente vive, e é
 * abortado quando ele sai de cena. Antes o controller nascia e morria na mesma
 * linha da chamada, o que dava um sinal que ninguém podia disparar: sair da
 * tela no meio do envio deixava as partes subindo até o fim, gastando banda por
 * um arquivo que já não interessava a ninguém - e o registro `PENDING` que
 * sobrava só sumia na varredura do servidor.
 */
export function useStorageCreate(
  options?: MutationProps<IStorage, File, Error>,
) {
  const { upload } = useMultipartUpload()
  const controller = React.useRef<AbortController | null>(null)

  React.useEffect(() => {
    return () => controller.current?.abort()
  }, [])

  return useMutation<IStorage, Error, File>({
    ...options,
    mutationFn: function (file) {
      // Um por envio: um controller abortado não volta a valer, e reaproveitá-lo
      // faria o envio seguinte nascer cancelado.
      controller.current = new AbortController()

      return upload(file, () => undefined, controller.current.signal)
    },
  })
}

/**
 * Apaga um arquivo órfão: o binário e a linha em `storages`.
 *
 * É o par do `useStorageCreate`, e fecha o buraco que ele abre: o upload
 * acontece na hora da escolha, **antes** de o formulário ser salvo, então todo
 * anexo trocado ou removido da tela ficava em disco para sempre.
 *
 * O backend recusa com `409 STORAGE_IN_USE` o arquivo que alguém referencia,
 * então chamar esta mutation sobre um anexo já salvo é seguro: a resposta é um
 * erro, não uma imagem furada em outro cadastro.
 */
export function useStorageDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/storages/'.concat(id), { method: 'DELETE' })
    },
  })
}

// ---------------------------------------------------------------------------
// /administrator/users
// ---------------------------------------------------------------------------

/** O módulo inteiro exige `ADMINISTRATOR`. */

export function useUserCreate(
  options?: MutationProps<IUser, UserCreatePayload>,
) {
  return useMutation<IUser, HTTPError, UserCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IUser>('/administrator/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

/** O `id` viaja com o payload porque ele vai no caminho, não no corpo. */
export type UserUpdateVariables = Merge<
  UserUpdatePayload,
  { readonly id: string }
>

/**
 * Campo ausente significa "não mexer", e não "apagar". Só `avatarId` aceita
 * `null` explícito.
 *
 * `password` entra no payload só quando há senha nova: o `confirmed` do
 * validator olha o par, e mandar `password: ''` deixaria a chave no corpo com um
 * valor que o servidor recusa.
 */
export function useUserUpdate(
  options?: MutationProps<IUser, UserUpdateVariables>,
) {
  return useMutation<IUser, HTTPError, UserUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IUser>('/administrator/users/'.concat(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

/** Manda para a lixeira: preenche `deletedAt`, não apaga nada. */
export function useUserArchive(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/users/'.concat(id, '/archive'), {
        method: 'PATCH',
      })
    },
  })
}

/** Tira da lixeira. */
export function useUserUnarchive(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/users/'.concat(id, '/unarchive'), {
        method: 'PATCH',
      })
    },
  })
}

/**
 * Apaga de vez. O backend exige o registro arquivado, e recusa a própria conta
 * de quem está logado.
 */
export function useUserDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/users/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

// ---------------------------------------------------------------------------
// /administrator/classrooms, sports e announcements
// ---------------------------------------------------------------------------

/**
 * Sem lixeira: turma, modalidade e aviso apagam de vez. Quem protege o que já
 * entrou numa chave é o servidor, com `409`.
 */

export function useClassroomCreate(
  options?: MutationProps<IClassroom, ClassroomCreatePayload>,
) {
  return useMutation<IClassroom, HTTPError, ClassroomCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IClassroom>('/administrator/classrooms', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export type ClassroomUpdateVariables = Merge<
  ClassroomUpdatePayload,
  { readonly id: string }
>

export function useClassroomUpdate(
  options?: MutationProps<IClassroom, ClassroomUpdateVariables>,
) {
  return useMutation<IClassroom, HTTPError, ClassroomUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IClassroom>('/administrator/classrooms/'.concat(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

export function useClassroomDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/classrooms/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

export function useSportCreate(
  options?: MutationProps<ISport, SportCreatePayload>,
) {
  return useMutation<ISport, HTTPError, SportCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<ISport>('/administrator/sports', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export type SportUpdateVariables = Merge<
  SportUpdatePayload,
  { readonly id: string }
>

export function useSportUpdate(
  options?: MutationProps<ISport, SportUpdateVariables>,
) {
  return useMutation<ISport, HTTPError, SportUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<ISport>('/administrator/sports/'.concat(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

export function useSportDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/sports/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

export function useAnnouncementCreate(
  options?: MutationProps<IAnnouncement, AnnouncementCreatePayload>,
) {
  return useMutation<IAnnouncement, HTTPError, AnnouncementCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IAnnouncement>('/administrator/announcements', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export type AnnouncementUpdateVariables = Merge<
  AnnouncementUpdatePayload,
  { readonly id: string }
>

export function useAnnouncementUpdate(
  options?: MutationProps<IAnnouncement, AnnouncementUpdateVariables>,
) {
  return useMutation<IAnnouncement, HTTPError, AnnouncementUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IAnnouncement>(
        '/administrator/announcements/'.concat(id),
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
    },
  })
}

export function useAnnouncementDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/announcements/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

// ---------------------------------------------------------------------------
// /administrator/brackets e matches
// ---------------------------------------------------------------------------

/** O sorteio. Cria a chave e o mata-mata inteiro, da primeira fase à final. */
export function useBracketCreate(
  options?: MutationProps<IBracket, BracketCreatePayload>,
) {
  return useMutation<IBracket, HTTPError, BracketCreatePayload>({
    // Mutation não repete por padrão, porque repetir escrita duplica. O sorteio
    // pode: a API é idempotente por modalidade e categoria e devolve a chave
    // que já existe. Sem isto, a queda de rede depois do commit mostrava erro
    // com a chave criada (_doc-lib/tanstack-query.md#guides/mutations, "Retry").
    retry: shouldRetryQuery,
    ...options,
    mutationFn: function (payload) {
      return request<IBracket>('/administrator/brackets', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

/** Apaga a chave inteira e reabre as inscrições. É como se refaz um sorteio. */
export function useBracketDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/brackets/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

export type MatchUpdateVariables = Merge<
  MatchUpdatePayload,
  { readonly id: string }
>

/** A agenda: data, hora e local. */
export function useMatchUpdate(
  options?: MutationProps<IMatch, MatchUpdateVariables>,
) {
  return useMutation<IMatch, HTTPError, MatchUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IMatch>('/administrator/matches/'.concat(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

export type MatchScoreVariables = Merge<
  MatchScorePayload,
  { readonly id: string }
>

/** O placar. No mata-mata o vencedor avança sozinho. */
export function useMatchScore(
  options?: MutationProps<IMatch, MatchScoreVariables>,
) {
  return useMutation<IMatch, HTTPError, MatchScoreVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IMatch>('/administrator/matches/'.concat(id, '/score'), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

/** Desfaz o placar: a partida volta a "a jogar" e o vencedor sai da seguinte. */
export function useMatchUnscore(options?: MutationProps<IMatch, string>) {
  return useMutation<IMatch, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return request<IMatch>('/administrator/matches/'.concat(id, '/score'), {
        method: 'DELETE',
      })
    },
  })
}

/** Lança um cartão. O time sai do atleta, no servidor. */
export function useCardCreate(
  options?: MutationProps<IMatchCard, CardCreatePayload>,
) {
  return useMutation<IMatchCard, HTTPError, CardCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IMatchCard>('/administrator/cards', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export function useCardDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/cards/'.concat(id), { method: 'DELETE' })
    },
  })
}

/** A ciência do aviso de remoção. Repetir não muda nada. */
export function useEnrollmentRemovalAcknowledge(
  options?: MutationProps<IEnrollmentRemoval, string>,
) {
  return useMutation<IEnrollmentRemoval, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return request<IEnrollmentRemoval>(
        '/administrator/enrollment-removals/'.concat(id, '/acknowledge'),
        { method: 'PATCH' },
      )
    },
  })
}

// ---------------------------------------------------------------------------
// /advisor e /representative
// ---------------------------------------------------------------------------

export function useStudentCreate(
  options?: MutationProps<IStudent, StudentCreatePayload>,
) {
  return useMutation<IStudent, HTTPError, StudentCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IStudent>('/advisor/students', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export type StudentUpdateVariables = Merge<
  StudentUpdatePayload,
  { readonly id: string }
>

export function useStudentUpdate(
  options?: MutationProps<IStudent, StudentUpdateVariables>,
) {
  return useMutation<IStudent, HTTPError, StudentUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IStudent>('/advisor/students/'.concat(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

export function useStudentDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/advisor/students/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

/** Troca a lista de atletas da turma numa modalidade, inteira. */
export function useAdvisorEnrollmentUpdate(
  options?: MutationProps<IEnrollmentBoard, AdvisorEnrollmentUpdatePayload>,
) {
  return useMutation<
    IEnrollmentBoard,
    HTTPError,
    AdvisorEnrollmentUpdatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request<IEnrollmentBoard>('/advisor/enrollments', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
  })
}

/** A mesma troca, na turma do representante - que sai da sessão. */
export function useRepresentativeEnrollmentUpdate(
  options?: MutationProps<
    IEnrollmentBoard,
    RepresentativeEnrollmentUpdatePayload
  >,
) {
  return useMutation<
    IEnrollmentBoard,
    HTTPError,
    RepresentativeEnrollmentUpdatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request<IEnrollmentBoard>('/representative/enrollments', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
  })
}

/** Grava o "Sobre" e o regulamento. Campo ausente não muda; `null` apaga. */
export function useSiteUpdate(
  options?: MutationProps<ISiteSetting, SiteUpdatePayload>,
) {
  return useMutation<ISiteSetting, HTTPError, SiteUpdatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<ISiteSetting>('/administrator/site', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
  })
}
