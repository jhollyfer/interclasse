import { inject } from '@adonisjs/core'
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { bucket } from '#config/drive'
import {
  MultipartContract,
  type PartToSign,
  type PresignedPart,
  type UploadedPart,
} from '#services/multipart/multipart.contract'

/**
 * Por quanto tempo uma URL assinada vale, em segundos.
 *
 * Uma hora, e não o dia inteiro: URL que vaza continua utilizável até expirar,
 * e o custo de expirar cedo é baixo porque a retomada já sabe pedir URL nova
 * para as partes que faltam.
 */
const URL_EXPIRES_IN = 60 * 60

/**
 * Os headers que a assinatura prende. Sem isto o presigner do SDK não assina
 * `content-type` nem `content-length`, e o bucket aceita qualquer tipo e
 * qualquer tamanho na URL (_standards/backend.md §5.4; _doc-lib/adonisjs.md#guides/basics/file-uploads,
 * https://docs.adonisjs.com/guides/basics/file-uploads). Com ele, `PUT` com tipo
 * ou tamanho diferente do assinado recebe 403 do storage.
 */
const SIGNABLE_HEADERS = new Set(['content-type', 'content-length'])

/**
 * A parte do multipart não tem tipo: o `UploadPart` não leva `ContentType`, e o
 * `Blob.slice` do navegador sobe sem `Content-Type`. Assinar `content-type` aqui
 * declara um header que a requisição não manda, e o S3 de verdade (MinIO, AWS)
 * recusa com "headers present in the request which were not signed". A parte
 * prende só o tamanho.
 */
const PART_SIGNABLE_HEADERS = new Set(['content-length'])

/**
 * O multipart do S3, que o FlyDrive não expõe.
 *
 * O FlyDrive cobre o arquivo inteiro - `put`, `get`, `delete`, `getUrl`,
 * `getSignedUrl` - e é o que `StorageService` usa. O que não existe lá é a
 * conversa em partes (`CreateMultipartUpload`, `UploadPart`, `ListParts`,
 * `CompleteMultipartUpload`, `AbortMultipartUpload`), e é ela que torna um
 * upload retomável. Por isso este serviço fala com o SDK direto, com a mesma
 * conexão que o FlyDrive usa (`config/drive.ts`).
 *
 * Nada aqui conhece `storages`, `Either` nem HTTP: é a camada que traduz
 * "quero subir isto em pedaços" para o protocolo. Quem decide quando iniciar,
 * confirmar ou abortar é o use-case.
 *
 * O cliente vem do container (`providers/storage.provider.ts`), e não de um
 * `new` aqui dentro: é o que permite a um teste apontar para outro bucket ou
 * simular uma falha do storage sem mexer no ambiente do processo.
 */
@inject()
export default class MultipartService extends MultipartContract {
  constructor(private readonly client: S3Client) {
    super()
  }

  /**
   * Abre um upload em partes e devolve o `UploadId` que identifica a conversa.
   *
   * A partir daqui o bucket guarda as partes recebidas sob esse identificador,
   * e nada aparece na chave final até o `complete`. É o que permite ao cliente
   * sumir no meio e voltar depois.
   */
  async initiate(key: string, contentType: string): Promise<string> {
    const response = await this.client.send(
      new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    )

    // O S3 sempre devolve `UploadId` num `CreateMultipartUpload` bem-sucedido; o
    // tipo do SDK o marca opcional porque a resposta é compartilhada com outras
    // operações. Sem ele não há upload para retomar nem para confirmar.
    if (!response.UploadId) {
      throw new Error(`Storage não devolveu UploadId para a chave ${key}`)
    }

    return response.UploadId
  }

  /**
   * As URLs para enviar as partes indicadas, uma por parte.
   *
   * Recebe **quais** partes assinar, e não quantas, porque a retomada precisa
   * assinar só o que falta. Um upload novo pede as partes `1, 2, 3, ...`; um
   * retomado pede o buraco que sobrou. Cada parte leva o próprio tamanho, preso
   * em `Content-Length` na assinatura.
   */
  async signParts(
    key: string,
    uploadId: string,
    parts: ReadonlyArray<PartToSign>,
    expiresIn: number = URL_EXPIRES_IN,
  ): Promise<Array<PresignedPart>> {
    return Promise.all(
      parts.map(async ({ partNumber, size }) => {
        const url = await getSignedUrl(
          this.client,
          new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
            ContentLength: size,
          }),
          { expiresIn, signableHeaders: PART_SIGNABLE_HEADERS },
        )

        return { partNumber, url }
      }),
    )
  }

  /**
   * A URL de um upload de arquivo inteiro, sem partes.
   *
   * Existe porque multipart só compensa quando há mais de uma parte: um avatar
   * de 40 KB não precisa de `UploadId`, de `ETag` coletado nem de confirmação
   * em duas etapas - precisa de um `PUT`.
   */
  async signSingle(
    key: string,
    contentType: string,
    size: number,
    expiresIn: number = URL_EXPIRES_IN,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: size,
      }),
      { expiresIn, signableHeaders: SIGNABLE_HEADERS },
    )
  }

  /**
   * As partes que o bucket já recebeu, em ordem.
   *
   * É o que responde "de onde eu continuo": o cliente compara com o que
   * pretendia enviar e reenvia só o buraco.
   *
   * Pagina de propósito. O `ListParts` devolve no máximo mil partes por
   * chamada, e um arquivo no teto tem mais que isso - sem o laço, a retomada de
   * um arquivo grande reenviaria tudo a partir da milésima primeira parte.
   */
  async listParts(key: string, uploadId: string): Promise<Array<UploadedPart>> {
    const parts: Array<UploadedPart> = []
    let marker: string | undefined

    do {
      const response = await this.client.send(
        new ListPartsCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumberMarker: marker,
        }),
      )

      for (const part of response.Parts ?? []) {
        if (!part.PartNumber || !part.ETag) continue

        parts.push({
          partNumber: part.PartNumber,
          size: part.Size ?? 0,
          etag: part.ETag,
        })
      }

      marker = undefined
      if (response.IsTruncated) marker = response.NextPartNumberMarker
    } while (marker !== undefined)

    return parts.sort((a, b) => a.partNumber - b.partNumber)
  }

  /**
   * Fecha o upload: o bucket remonta as partes na chave final.
   *
   * A lista tem de vir ordenada por `partNumber` e com o `ETag` que cada parte
   * devolveu - é assim que o storage confere que nenhuma se perdeu ou chegou
   * pela metade.
   */
  async complete(
    key: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ): Promise<void> {
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts
            .slice()
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })),
        },
      }),
    )
  }

  /**
   * Descarta o upload e as partes já recebidas.
   *
   * Sem isto, um upload cancelado deixa as partes ocupando o bucket para
   * sempre: elas não aparecem na listagem de objetos e continuam sendo
   * cobradas.
   */
  async abort(key: string, uploadId: string): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }),
    )
  }
}
