import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import type { StoragesFileShowResponse } from '@interclasse/shared'

import { useMultipartUpload } from '#/hooks/use-multipart-upload'

import type { HTTPError } from '../http'
import { send } from '../http'
import type { MutationProps } from '../mutation-props'

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
  options?: MutationProps<StoragesFileShowResponse, File, Error>,
) {
  const { upload } = useMultipartUpload()
  const controller = React.useRef<AbortController | null>(null)

  React.useEffect(() => {
    return () => controller.current?.abort()
  }, [])

  return useMutation<StoragesFileShowResponse, Error, File>({
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
