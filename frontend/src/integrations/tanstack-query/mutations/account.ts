import { useMutation } from '@tanstack/react-query'
import type { AccountProfileUpdatePayload } from '@interclasse/shared'

import type { IUser } from '#/lib/interfaces'

import type { HTTPError } from '../http'
import { request } from '../http'
import type { MutationProps } from '../mutation-props'

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
  options?: MutationProps<IUser, AccountProfileUpdatePayload>,
) {
  return useMutation<IUser, HTTPError, AccountProfileUpdatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IUser>('/account', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
  })
}
