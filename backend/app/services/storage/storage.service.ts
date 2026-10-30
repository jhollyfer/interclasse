import { randomUUID } from 'node:crypto'

import drive from '@adonisjs/drive/services/main'
import { STORAGE_EXTENSIONS, type StorageMimetype } from '@interclasse/shared'

import { SIGNATURE_BYTES } from '#domain/storage/storage.entity'
import {
  StorageContract,
  type StorageDownload,
  type StorageMetadata,
} from '#services/storage/storage.contract'
import { URL_TTL } from '#config/drive'

/**
 * Tudo que envolve o bucket: a chave sob a qual o arquivo vive, o que o
 * bucket sabe sobre ele, as URLs assinadas e como o binário sai de cena. A linha
 * em `storages` e quem a referencia são do `StorageRepository`.
 *
 * O binário **não** passa por aqui: ele vai do navegador direto ao
 * bucket por URL assinada. O que atravessa esta camada é metadado.
 */
export default class StorageService extends StorageContract {
  /**
   * A chave sob a qual o objeto vai viver no bucket.
   *
   * Um uuid mais a extensão do tipo declarado. O nome que o usuário enviou fica
   * só em `originalName`, como rótulo, e **nunca** vira caminho: ele é texto de
   * terceiro, e caminho montado com texto de terceiro é como se escreve por
   * cima do arquivo alheio.
   *
   * A extensão sai do `mimetype` e não do nome enviado porque o nome não é
   * fonte confiável - `foto.png` pode ser um pdf. O `mimetype` é o mesmo valor
   * com que a URL é assinada, então o que o bucket aceita e o que a chave diz
   * não têm como divergir.
   */
  key(mimetype: StorageMimetype): string {
    return `${randomUUID()}.${STORAGE_EXTENSIONS[mimetype]}`
  }

  /**
   * O que o bucket sabe sobre o objeto: tamanho, tipo, `ETag`.
   *
   * É com isto que a confirmação do upload confere o que **de fato** subiu
   * contra o que o cliente declarou ao pedir as URLs.
   */
  async metadata(path: string): Promise<StorageMetadata> {
    return drive.use().getMetaData(path)
  }

  /**
   * Os primeiros bytes do objeto: lê o início do fluxo e o fecha, sem baixar o
   * resto do arquivo.
   */
  async head(path: string): Promise<Uint8Array> {
    const stream = await drive.use().getStream(path)
    const chunks: Buffer[] = []
    let read = 0

    try {
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
        read += chunk.length

        if (read >= SIGNATURE_BYTES) break
      }
    } finally {
      stream.destroy()
    }

    return Buffer.concat(chunks).subarray(0, SIGNATURE_BYTES)
  }

  /**
   * A URL assinada de leitura, com prazo: o disco é privado, então nenhum
   * endereço do registro autoriza sozinho. Não custa rede: o FlyDrive assina por
   * `@aws-sdk/s3-request-presigner`, que calcula a SigV4 localmente. Vence em
   * `URL_TTL`, e quem a guardar recebe 403 depois disso.
   */
  async signedUrl(path: string): Promise<string> {
    return drive.use().getSignedUrl(path, { expiresIn: URL_TTL })
  }

  /** Apaga o binário do bucket. */
  async discard(path: string): Promise<void> {
    await drive.use().delete(path)
  }

  /**
   * Uma URL temporária que entrega o arquivo com o nome original.
   *
   * O `Content-Disposition` viaja assinado dentro da própria URL, e é o bucket
   * que o devolve no download - por isso o binário não precisa atravessar esta
   * aplicação só para ganhar um header - atravessando, cada download ocuparia
   * a aplicação pelo tempo da transferência.
   *
   * Expira em minutos porque é endereço de uma ação, não de um recurso: quem
   * quiser o arquivo de novo pede outra.
   */
  async signedDownload(file: StorageDownload): Promise<string> {
    return drive.use().getSignedUrl(file.path, {
      expiresIn: '5 minutes',
      contentType: file.mimetype,
      contentDisposition: this.contentDisposition(file.originalName),
    })
  }

  /**
   * O header `Content-Disposition` de um download, com o nome original.
   *
   * Dois nomes no mesmo header porque a RFC 6266 pede os dois: `filename=` só
   * carrega ASCII e é o que navegador antigo lê, e `filename*=UTF-8''` é o que
   * preserva acento e cedilha. Mandar só o segundo faz o arquivo chegar com o
   * nome errado em quem não o entende; mandar só o primeiro perde o acento em
   * todo mundo.
   *
   * O fallback ASCII decompõe o acento e joga fora o diacrítico (`ó` -> `o`) em
   * vez de passar por uma normalização de slug: slug trocaria o ponto da
   * extensão por hífen, e `relatorio-2026-pdf` não abre em programa nenhum.
   * Aspas e barra viram `_` porque escapariam do valor entre aspas do header.
   */
  contentDisposition(originalName: string): string {
    const ascii = originalName
      .normalize('NFD')
      // Os diacríticos que o NFD separou da letra base.
      .replace(/[\u0300-\u036f]/g, '')
      // O que sobrou fora do ASCII imprimível, mais aspas e barra, que
      // escapariam do valor entre aspas do header.
      .replace(/["\\]|[^\u0020-\u007e]/g, '_')

    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(originalName)}`
  }
}
