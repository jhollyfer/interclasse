import type { StoragesFileShowResponse } from '@interclasse/shared'
import { useMutation } from '@tanstack/react-query'

import type { MutationProps } from '#/hooks/tanstack-query/_mutation-props'
import { useMultipartUpload } from '#/hooks/use-multipart-upload'

import type { HTTPError } from '../http'
import { send } from '../http'

/** O arquivo e o sinal que cancela o envio: quem sabe quando cancelar é a tela. */
export type StorageCreateVariables = {
  readonly file: File
  readonly signal: AbortSignal
}

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
 * O `AbortSignal` vem de quem chama (`useAbortOnUnmount`): o hook de mutation é
 * fino (`frontend.md` §2.3) e não guarda controller. Sair da tela no meio do
 * envio aborta as partes em vez de deixá-las subir até o fim.
 *
 * O erro é `Error` e não `HTTPError`: o hook recusa localmente o tipo de
 * arquivo antes de gastar requisição, e essa recusa não tem status HTTP.
 *
 * O arquivo nasce **sem dono**: quem anexa é que guarda a referência, passando
 * o `id` devolvido aqui em `avatarId`, `coverId` ou equivalente da entidade que
 * recebe o anexo. Por isso a mutation não invalida nada - não há listagem de
 * anexos para atualizar.
 */
export function useStorageCreateMutation(
  options?: MutationProps<
    StoragesFileShowResponse,
    StorageCreateVariables,
    Error
  >,
) {
  const { upload } = useMultipartUpload()

  return useMutation<StoragesFileShowResponse, Error, StorageCreateVariables>({
    ...options,
    mutationFn: function ({ file, signal }) {
      return upload(file, () => undefined, signal)
    },
  })
}

/**
 * Apaga um arquivo órfão: o binário e a linha em `storages`.
 *
 * É o par do `useStorageCreateMutation`, e fecha o buraco que ele abre: o upload
 * acontece na hora da escolha, **antes** de o formulário ser salvo, então todo
 * anexo trocado ou removido da tela ficava em disco para sempre.
 *
 * O backend recusa com `409 STORAGE_IN_USE` o arquivo que alguém referencia,
 * então chamar esta mutation sobre um anexo já salvo é seguro: a resposta é um
 * erro, não uma imagem furada em outro cadastro.
 */
export function useStorageDeleteMutation(
  options?: MutationProps<void, string>,
) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/storages/'.concat(id), { method: 'DELETE' })
    },
  })
}
