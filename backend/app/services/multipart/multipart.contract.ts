/**
 * O contrato do upload em partes (_standards/solid.md §2): I/O externo, o S3.
 *
 * `abstract class` e não `type`: serve de token no container e de tipo ao mesmo
 * tempo. O concreto é `MultipartService`, ligado em `providers/storage.provider.ts`;
 * o use-case depende só daqui, e um teste troca o fornecedor por `container.swap`.
 */

/** Uma parte que o cliente ainda vai enviar, e o endereço para onde enviá-la. */
export type PresignedPart = {
  readonly partNumber: number
  readonly url: string
}

/** Uma parte que o bucket já recebeu. O `etag` é o que o `complete` exige. */
export type UploadedPart = {
  readonly partNumber: number
  readonly size: number
  readonly etag: string
}

/**
 * O tamanho de cada parte, em bytes.
 *
 * 10 MB e não 5 MB, que é o mínimo do S3: com o dobro do tamanho são metade das
 * partes, metade das conexões e metade das URLs para assinar. O teto de 10.000
 * partes por upload vira um teto de 100 GB por arquivo, folgado para o
 * `UPLOAD_MAX_SIZE` de 1 GiB.
 */
export const PART_SIZE = 10 * 1024 * 1024

/**
 * Quantas URLs saem numa resposta só.
 *
 * Um arquivo grande tem partes demais para assinar tudo de uma vez: cada URL
 * assinada tem uns 500 bytes, e mil delas seriam meio megabyte de JSON para
 * entregar antes do primeiro byte de arquivo subir. O cliente pede o próximo
 * lote em `GET /storages/:id/parts`, que é o mesmo endpoint da retomada.
 */
export const PRESIGNED_BATCH = 100

export abstract class MultipartContract {
  abstract initiate(key: string, contentType: string): Promise<string>
  abstract signParts(
    key: string,
    uploadId: string,
    partNumbers: ReadonlyArray<number>,
    expiresIn?: number,
  ): Promise<Array<PresignedPart>>
  abstract signSingle(key: string, contentType: string, expiresIn?: number): Promise<string>
  abstract listParts(key: string, uploadId: string): Promise<Array<UploadedPart>>
  abstract complete(
    key: string,
    uploadId: string,
    parts: ReadonlyArray<{ readonly partNumber: number; readonly etag: string }>,
  ): Promise<void>
  abstract abort(key: string, uploadId: string): Promise<void>
}
