import {
  StoragesFileShowResponse,
  StoragesFileUploadResponse,
} from '@interclasse/shared'

import { request, HTTPError } from '#/integrations/tanstack-query/http'
import { missingParts, planParts } from '#/lib/chunking'
import type { PartPlan } from '#/lib/chunking'
import { isStorageMimetype } from '#/lib/mimetype'
import { clearResume, readResume, writeResume } from '#/lib/upload-resume'
import { putPart } from '#/lib/upload-transport'
import { m } from '#/paraglide/messages'

/**
 * O upload de um arquivo, do começo ao fim, do lado do cliente.
 *
 * Três passos, porque o binário não passa pela API: `POST /storages` abre e
 * devolve URLs assinadas, o navegador envia cada parte direto ao bucket, e
 * `POST /storages/:id/complete` confirma. É o que permite arquivo grande - um
 * corpo HTTP de centenas de megabytes esbarra no limite do proxy antes de
 * chegar à aplicação - e é o que permite retomar.
 *
 * A retomada tem duas metades, e as duas precisam existir para valer alguma
 * coisa. A queda de rede é resolvida por `GET /storages/:id/parts`, que diz o
 * que o bucket já tem. O recarregamento da página é resolvido pelo
 * `localStorage`, que é onde o `storageId` sobrevive - sem ele o upload
 * continuaria aberto no servidor, invisível, e o usuário recomeçaria do zero um
 * arquivo que já está quase todo lá.
 */

export type MultipartUploadOptions = {
  /**
   * Quantas partes sobem ao mesmo tempo.
   *
   * Três porque o gargalo é a banda de subida, que é compartilhada: mais
   * conexões não a aumentam, só dividem a mesma em mais pedaços e deixam cada
   * parte demorar mais para terminar - e parte que não termina é parte que a
   * retomada vai reenviar inteira.
   */
  concurrency?: number
}

export type UploadFile = (
  file: File,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
) => Promise<StoragesFileShowResponse>

export function useMultipartUpload({
  concurrency = 3,
}: MultipartUploadOptions = {}): { upload: UploadFile } {
  async function upload(
    file: File,
    onProgress: (percent: number) => void,
    signal: AbortSignal,
  ): Promise<StoragesFileShowResponse> {
    const mimetype = file.type

    if (!isStorageMimetype(mimetype)) {
      throw new Error(
        m.upload_error_type({
          type: mimetype || m.upload_unknown_type(),
        }),
      )
    }

    const plan = await open(file, mimetype)

    // Já estava confirmado quando reencontramos o upload: nada a enviar.
    if (plan.storage.status === 'UPLOADED') {
      clearResume(file)
      onProgress(100)

      // O plano traz o arquivo sem a `url` derivada; o registro com ela vem do
      // `GET /storages/:id`.
      return request(
        '/storages/'.concat(plan.storage.id),
        StoragesFileShowResponse,
        { signal },
      )
    }

    writeResume(file, {
      storageId: plan.storage.id,
      uploadId: plan.uploadId,
      partSize: plan.partSize,
    })

    const etags = await send(file, plan, onProgress, signal, concurrency)
    const storage = await complete(plan.storage.id, plan.uploadId, etags)

    clearResume(file)

    return storage
  }

  return { upload }
}

/**
 * O plano de upload: o de um upload retomado, quando há um, e o de um novo
 * quando não há.
 *
 * O retomado pode ter morrido do outro lado - cancelado noutra aba, varrido por
 * abandono -, e um `404` aqui não é erro: é só um upload que não existe mais, e
 * o certo é abrir outro.
 */
async function open(
  file: File,
  mimetype: string,
): Promise<StoragesFileUploadResponse> {
  const saved = readResume(file)

  if (saved) {
    try {
      return await request(
        `/storages/${saved.storageId}/parts`,
        StoragesFileUploadResponse,
      )
    } catch (error) {
      if (!(error instanceof HTTPError) || error.status !== 404) throw error

      clearResume(file)
    }
  }

  return request('/storages', StoragesFileUploadResponse, {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      mimetype,
      size: file.size,
    }),
  })
}

/**
 * O pedaço do arquivo que vai num `PUT`. A URL de arquivo inteiro (sem
 * `uploadId`) assina o `Content-Type`, e o XHR só o manda se o `Blob` tiver
 * tipo; a parte de multipart não assina tipo, e mandá-lo seria um cabeçalho
 * fora da assinatura, que o S3 recusa.
 */
function sliceFor(file: File, part: PartPlan, uploadId: string | null): Blob {
  if (uploadId === null) return file.slice(part.start, part.end, file.type)

  return file.slice(part.start, part.end)
}

/**
 * Envia o que falta e devolve o `ETag` de cada parte, inclusive das que já
 * estavam lá - a confirmação precisa da lista inteira, e não só do que subiu
 * nesta sessão.
 *
 * O laço externo existe por causa do lote: um arquivo grande não recebe todas
 * as URLs de uma vez, então quando as deste lote acabam ele pede o próximo no
 * mesmo endpoint da retomada.
 */
async function send(
  file: File,
  initial: StoragesFileUploadResponse,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
  concurrency: number,
): Promise<Array<{ partNumber: number; etag: string }>> {
  const plan = planParts(file.size, initial.partSize)
  const etags = new Map<number, string>()
  const progress = new Map<number, number>()

  function report() {
    let loaded = 0
    for (const bytes of progress.values()) loaded += bytes

    // Arquivo de zero byte não tem como render fração: já está inteiro.
    if (file.size === 0) {
      onProgress(100)
      return
    }

    onProgress(Math.min(100, Math.round((loaded / file.size) * 100)))
  }

  let batch = initial

  for (const part of batch.uploaded) {
    etags.set(part.partNumber, part.etag)
    progress.set(part.partNumber, part.size)
  }

  report()

  while (etags.size < plan.length) {
    const pending = missingParts(plan, [...etags.keys()])
    const urls = new Map(batch.parts.map((part) => [part.partNumber, part.url]))
    const ready = pending.filter((part) => urls.has(part.partNumber))

    // O lote acabou e ainda falta parte: peça o próximo, que vem com URLs
    // recém-assinadas - as antigas podem já ter expirado.
    if (ready.length === 0) {
      batch = await request(
        `/storages/${initial.storage.id}/parts`,
        StoragesFileUploadResponse,
      )

      for (const part of batch.uploaded) {
        etags.set(part.partNumber, part.etag)
        progress.set(part.partNumber, part.size)
      }

      // O servidor não deu URL nova nem parte nova: insistir seria laço eterno.
      if (batch.parts.length === 0 && etags.size < plan.length) {
        throw new Error(m.upload_error_missing_urls())
      }

      continue
    }

    await pool(ready, concurrency, async (part) => {
      const url = urls.get(part.partNumber)

      if (!url) return

      // O backend assina o `Content-Length` da parte: o corpo precisa ter
      // exatamente o tamanho planejado (`Blob.slice` de `[start, end)`). O
      // navegador manda o cabeçalho sozinho a partir do `Blob`, e uma parte de
      // outro tamanho voltaria `403` do bucket sem dizer por quê.
      const blob = sliceFor(file, part, initial.uploadId)

      if (blob.size !== part.end - part.start) {
        throw new Error(m.upload_error_part_size())
      }

      const etag = await putPart(url, blob, {
        signal,
        onProgress: (loaded) => {
          progress.set(part.partNumber, loaded)
          report()
        },
      })

      etags.set(part.partNumber, etag)
      progress.set(part.partNumber, part.end - part.start)
      report()
    })
  }

  return [...etags.entries()]
    .map(([partNumber, etag]) => ({ partNumber, etag }))
    .sort((a, b) => a.partNumber - b.partNumber)
}

/**
 * Fecha o upload. As partes só vão no corpo quando houve multipart - o `PUT`
 * simples não tem parte para confirmar.
 */
async function complete(
  storageId: string,
  uploadId: string | null,
  parts: ReadonlyArray<{ partNumber: number; etag: string }>,
): Promise<StoragesFileShowResponse> {
  const body: {
    parts?: ReadonlyArray<{ partNumber: number; etag: string }>
  } = {}

  if (uploadId) body.parts = parts

  return request(`/storages/${storageId}/complete`, StoragesFileShowResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Executa as tarefas com um teto de simultâneas.
 *
 * Trabalhadores puxando de uma fila comum, e não lotes de tamanho fixo: com
 * lotes, o lote inteiro espera a parte mais lenta antes de o próximo começar, e
 * numa rede irregular isso é a maior parte do tempo parado.
 */
async function pool<TItem>(
  items: ReadonlyArray<TItem>,
  limit: number,
  run: (item: TItem) => Promise<void>,
): Promise<void> {
  // Um iterador só, compartilhado: cada `next()` entrega o item a um
  // trabalhador e nenhum outro o vê de novo.
  const queue = items.values()

  async function worker() {
    for (const item of queue) {
      await run(item)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )
}
