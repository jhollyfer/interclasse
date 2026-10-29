import { useMutation } from '@tanstack/react-query'

import type { SessionSignInPayload } from '#/validators/authentication/sessions.validator'

import type { HTTPError } from '../http'
import { send } from '../http'
import type { MutationProps } from '../mutation-props'

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
