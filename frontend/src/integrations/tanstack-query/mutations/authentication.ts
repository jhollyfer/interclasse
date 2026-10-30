import type { AuthenticationSessionSignInPayload } from '@interclasse/shared'
import { useMutation } from '@tanstack/react-query'

import type { MutationProps } from '#/hooks/tanstack-query/_mutation-props'

import type { HTTPError } from '../http'
import { send } from '../http'

/**
 * Entra. Responde `204` e entrega os dois tokens em `Set-Cookie`, `httpOnly` -
 * não há nada a guardar na tela, e quem passa a saber quem está logado é o
 * `GET /account`.
 */
export function useAuthenticationSignInMutation(
  options?: MutationProps<void, AuthenticationSessionSignInPayload>,
) {
  // Os generics ficam explícitos: são eles que dão tipo contextual aos
  // callbacks do chamador. A regra "tipe a queryFn, não o hook" vale para
  // query, onde `select` e `data` dependem da inferência em cadeia.
  return useMutation<void, HTTPError, AuthenticationSessionSignInPayload>({
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
export function useAuthenticationSignOutMutation(
  options?: MutationProps<void, void>,
) {
  return useMutation<void, HTTPError, void>({
    ...options,
    mutationFn: async function () {
      await send('/authentication/sign-out', { method: 'POST' })
    },
  })
}
