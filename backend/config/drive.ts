import env from '#start/env'
import { defineConfig, services } from '@adonisjs/drive'
import type { InferDriveDisks } from '@adonisjs/drive/types'
import type { S3ClientConfig } from '@aws-sdk/client-s3'

/**
 * Armazenamento de arquivos: um bucket S3-compatível, o mesmo em todo ambiente.
 * MinIO em dev e nos testes, e em produção o que o ambiente apontar.
 *
 * Um destino só porque o upload é presigned multipart, e multipart é API do S3
 * - o driver `fs` não a tem. Um disco local em dev exercitaria um caminho de
 * código que produção não usa, que é justamente o que um destino só evita.
 *
 * As credenciais vêm de `STORAGE_*`, e não de um prefixo por fornecedor: o que
 * o código depende é do protocolo. R2, S3, Spaces, Linode e MinIO trocam de
 * lugar mudando `STORAGE_ENDPOINT`.
 */
export const bucket = env.get('STORAGE_BUCKET') ?? ''

/**
 * A conexão com o bucket, exportada porque tem **dois** consumidores: o
 * FlyDrive aqui embaixo, e o `MultipartService`, que fala com o SDK da AWS
 * direto - o FlyDrive não expõe multipart (`CreateMultipartUpload` e companhia).
 *
 * Uma constante e não duas leituras de `env`: dois lugares lendo as mesmas
 * variáveis é onde uma delas é esquecida no dia em que a conexão muda.
 */
export const clientConfig: S3ClientConfig = {
  credentials: {
    accessKeyId: env.get('STORAGE_KEY') ?? '',
    secretAccessKey: env.get('STORAGE_SECRET') ?? '',
  },
  region: 'auto',
  endpoint: env.get('STORAGE_ENDPOINT'),
  forcePathStyle: env.get('STORAGE_FORCE_PATH_STYLE') ?? false,

  // O padrão do SDK é `WHEN_SUPPORTED`, e ele quebra URL assinada: no presign
  // não há corpo, então o checksum que vai para a query é o de **zero bytes**
  // (`x-amz-checksum-crc32=AAAAAA==`). O navegador manda o arquivo de verdade,
  // o bucket confere contra aquele valor e recusa o `PUT`. Com `WHEN_REQUIRED`
  // o checksum só entra onde a operação o exige, e nenhuma das nossas exige.
  requestChecksumCalculation: 'WHEN_REQUIRED',
}

/**
 * Por quanto tempo uma URL de leitura vale.
 *
 * O disco é privado, então não existe endereço permanente para um objeto: toda
 * leitura sai assinada. Quinze minutos cobre a vida de uma página aberta sem
 * deixar um endereço circulando - link copiado expira antes de servir a quem não
 * deveria vê-lo.
 *
 * O custo é o cache: a URL muda a cada leitura, e o CDN não a reaproveita. Numa
 * página com muitas imagens isso pesa, e a saída, se pesar, é arredondar a data
 * de assinatura para a fatia de hora - a URL fica estável dentro da janela e
 * volta a ser cacheável, sem mudar o modelo de segurança.
 *
 * **Este valor tem um par no frontend, e nada liga os dois.** A `url` assinada
 * viaja dentro da resposta, então o cache do cliente a guarda junto: uma query
 * com `staleTime` acima deste prazo serve avatar com URL vencida, e a falha
 * aparece como imagem quebrada, sem erro em lugar nenhum. Hoje o teto do cliente
 * é de cinco minutos (`accountQueryOptions`), com o global em um. Baixar este
 * TTL, ou subir aquele, exige mexer nos dois - e é por isso que o número está
 * escrito nos dois lugares em vez de só aqui.
 */
export const URL_TTL = '15 mins'

const driveConfig = defineConfig({
  default: 'r2',

  services: {
    // `private`, e por isso nao ha `cdnUrl`: com o disco privado o `getUrl` do
    // FlyDrive nao serve mais, e toda leitura passa a ser assinada. Sem isto,
    // todo objeto do bucket e legivel por quem souber o endereco - inclusive o
    // upload ainda nao confirmado e o arquivo que nenhuma linha referencia.
    r2: services.s3({ ...clientConfig, bucket, visibility: 'private' }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
