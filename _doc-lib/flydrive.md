# FlyDrive

Camada única de armazenamento de arquivos sobre disco local, S3, R2, GCS e outros.

**O que é:** uma abstração de sistema de arquivos para Node.js. Você programa contra uma API só,
`put`, `get`, `delete`, `getUrl`, `getSignedUrl`, e troca o destino real (disco local, bucket S3,
Cloudflare R2, Google Cloud Storage) mudando só a configuração. Sucessor espiritual do
`@adonisjs/drive`, escrito pela mesma equipe, mas independente de framework.

**Para que serve:** eliminar o `if (isProduction)` espalhado pelo código de upload. Em
desenvolvimento os arquivos caem numa pasta local, em produção vão para um bucket, e o código que
chama é idêntico nos dois casos. Também resolve URL pública, URL assinada com expiração e metadados
do arquivo de forma uniforme entre provedores.

**Como usar:**

```bash
pnpm add flydrive
```

```ts
import { Disk } from 'flydrive'
import { FSDriver } from 'flydrive/drivers/fs'

const disk = new Disk(
  new FSDriver({ location: new URL('./storage', import.meta.url), visibility: 'public' })
)

await disk.put('avatars/abc.png', buffer)
const url = await disk.getUrl('avatars/abc.png')
```

**Quando usar a biblioteca:** quando o projeto aceita upload de arquivo e você quer poder mudar de
provedor sem reescrever a feature. Se o app grava um único arquivo local e nunca vai para nuvem,
`node:fs` resolve e a dependência não se justifica.

**Links:** 13.

---

## Fundamentos

#### introduction
[doc](https://flydrive.dev/docs/introduction)

**O que é:** a apresentação da biblioteca, o problema do acoplamento a um provedor de storage e a
proposta de uma API única sobre vários back-ends.
**Para que serve:** decidir se vale adotar FlyDrive em vez de falar direto com o SDK do provedor.
**Quando usar:** antes de escrever a primeira linha de upload do projeto, na hora de escolher entre
FlyDrive, SDK nativo do S3 ou `node:fs` puro.

```ts
// O argumento da biblioteca em uma tela: o mesmo código, dois destinos.
import { Disk } from 'flydrive'
import { FSDriver } from 'flydrive/drivers/fs'
import { S3Driver } from 'flydrive/drivers/s3'

const driver =
  process.env.NODE_ENV === 'production'
    ? new S3Driver({ bucket: process.env.S3_BUCKET!, region: 'us-east-1', visibility: 'public' })
    : new FSDriver({ location: new URL('./storage', import.meta.url), visibility: 'public' })

export const disk = new Disk(driver)

// daqui para baixo, nenhuma linha do app sabe qual destino está ativo
await disk.put('docs/contrato.pdf', buffer)
```

#### getting_started
[doc](https://flydrive.dev/docs/getting_started)

**O que é:** instalação e o primeiro `Disk` funcionando com o driver de sistema de arquivos.
**Para que serve:** sair do zero até um `put` e um `get` rodando, sem depender de credenciais de
nuvem.
**Quando usar:** na configuração inicial. É o caminho mais rápido para validar a integração
localmente antes de mexer com bucket.

```ts
import { Disk } from 'flydrive'
import { FSDriver } from 'flydrive/drivers/fs'

const disk = new Disk(
  new FSDriver({
    location: new URL('./storage', import.meta.url),
    visibility: 'public',
    urlBuilder: {
      async generateURL(key) {
        return `http://localhost:3333/uploads/${key}`
      },
    },
  })
)

await disk.put('notas/ola.txt', 'conteúdo do arquivo')
console.log(await disk.get('notas/ola.txt')) // "conteúdo do arquivo"
console.log(await disk.getUrl('notas/ola.txt')) // http://localhost:3333/uploads/notas/ola.txt
```

#### key_concepts
[doc](https://flydrive.dev/docs/key_concepts)

**O que é:** o vocabulário da biblioteca: *disk*, *driver*, *key*, *visibility* (público ou privado)
e como esses conceitos se traduzem em cada provedor.
**Para que serve:** entender que a *key* é um caminho lógico, não um caminho de sistema de arquivos,
e que `visibility` muda o comportamento de `getUrl` entre provedores.
**Quando usar:** leia **antes** de modelar como o app vai nomear e organizar os arquivos. Decisão de
convenção de key (`avatars/<uuid>.png` contra `<uuid>`) é cara de mudar depois que há arquivos
gravados.

```ts
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'

// A key é um caminho LÓGICO. Ela é igual em disco local e em bucket S3,
// e é o único identificador que o banco precisa guardar.
function buildKey(scope: string, originalName: string) {
  return `${scope}/${randomUUID()}${extname(originalName)}`
}

const key = buildKey('avatars', 'foto do perfil.PNG')
// avatars/9f1c2f2e-....png  <- nome do usuário nunca vira caminho

// visibility public: getUrl devolve URL direta e permanente
await disk.put(key, buffer, { visibility: 'public' })
const publica = await disk.getUrl(key)

// visibility private: precisa de URL assinada, que expira
await disk.put('contratos/x.pdf', buffer, { visibility: 'private' })
const temporaria = await disk.getSignedUrl('contratos/x.pdf', { expiresIn: '30 mins' })
```

## API

#### disk_api
[doc](https://flydrive.dev/docs/disk_api)

**O que é:** a referência da classe `Disk`, com `put`, `putStream`, `get`, `getStream`, `getBytes`,
`delete`, `deleteAll`, `copy`, `move`, `exists`, `getUrl`, `getSignedUrl` e `listAll`.
**Para que serve:** é a página que você mais volta. Toda operação de escrita e leitura de arquivo
passa por aqui.
**Quando usar:** ao implementar upload, download, remoção, ou ao precisar de URL assinada com
expiração para um arquivo privado. Vale marcar como favorito.

```ts
// escrever
await disk.put('relatorios/2026.csv', 'a,b,c\n1,2,3')
await disk.putStream('videos/aula.mp4', readableStream) // não carrega tudo na memória

// ler
const texto = await disk.get('relatorios/2026.csv')
const bytes = await disk.getBytes('imagens/logo.png') // Uint8Array
const stream = await disk.getStream('videos/aula.mp4')

// existência, cópia, movimentação
if (await disk.exists('imagens/logo.png')) {
  await disk.copy('imagens/logo.png', 'backup/logo.png')
  await disk.move('imagens/logo.png', 'arquivadas/logo.png')
}

// URLs
const publica = await disk.getUrl('imagens/logo.png')
const privada = await disk.getSignedUrl('contratos/x.pdf', { expiresIn: '1 hour' })

// remover
await disk.delete('backup/logo.png')
await disk.deleteAll('arquivadas/') // prefixo inteiro
```

#### file_api
[doc](https://flydrive.dev/docs/file_api)

**O que é:** a referência do objeto que representa um arquivo já existente no disco, com metadados de
tamanho, tipo, data de modificação e etag.
**Para que serve:** inspecionar um arquivo sem baixá-lo inteiro, e listar diretórios com metadados.
**Quando usar:** ao montar telas de listagem de arquivos, ou ao validar tamanho e tipo de algo que já
está gravado. Não confunda com a validação **antes** do upload, que é do framework, não daqui.

```ts
// metadados sem baixar o conteúdo
const meta = await disk.getMetaData('imagens/logo.png')
console.log(meta.contentLength) // bytes
console.log(meta.contentType) // image/png
console.log(meta.lastModified) // Date
console.log(meta.etag)

// listar um prefixo e montar a resposta de uma tela
const listagem = await disk.listAll('avatars/', { recursive: true })

for (const item of listagem.objects) {
  if (item.isFile) {
    const info = await item.getMetaData()
    console.log(item.key, info.contentLength)
  }
}
```

#### drive_manager
[doc](https://flydrive.dev/docs/drive_manager)

**O que é:** o gerenciador que registra vários discos nomeados (`local`, `s3`, `backup`) e resolve
qual usar, com um default configurável.
**Para que serve:** ter mais de um destino ativo ao mesmo tempo e alternar entre eles por nome, além
de trocar o default por ambiente.
**Quando usar:** quando o app precisa de mais de um destino, por exemplo imagens públicas num bucket
e documentos privados em outro. Com um destino só, `Disk` direto basta.

```ts
import { DriveManager } from 'flydrive'
import { FSDriver } from 'flydrive/drivers/fs'
import { S3Driver } from 'flydrive/drivers/s3'

const drive = new DriveManager({
  default: process.env.NODE_ENV === 'production' ? 'publico' : 'local',
  services: {
    local: () => new FSDriver({ location: new URL('./storage', import.meta.url), visibility: 'public' }),
    publico: () => new S3Driver({ bucket: 'assets-publicos', region: 'us-east-1', visibility: 'public' }),
    privado: () => new S3Driver({ bucket: 'documentos', region: 'us-east-1', visibility: 'private' }),
  },
})

await drive.use().put('avatars/a.png', buffer) // vai para o default do ambiente
await drive.use('privado').put('contratos/x.pdf', buffer) // sempre no bucket privado
```

## Drivers

#### services/fs
[doc](https://flydrive.dev/docs/services/fs)

**O que é:** o driver de sistema de arquivos local, com `location`, `visibility` e a função
`urlBuilder` que monta a URL pública.
**Para que serve:** rodar em desenvolvimento e em testes sem credencial nenhuma, e servir de destino
para apps que gravam em volume no próprio servidor.
**Quando usar:** na configuração do ambiente de desenvolvimento, e ao descobrir por que a `url` de um
arquivo local não bate com a rota que serve estáticos. O `urlBuilder` é o ponto de ajuste.

```ts
import { FSDriver } from 'flydrive/drivers/fs'

const driver = new FSDriver({
  location: new URL('./storage/uploads', import.meta.url),
  visibility: 'public',
  // sem isto, getUrl não sabe em qual rota os arquivos estão publicados
  urlBuilder: {
    async generateURL(key) {
      return `${process.env.APP_URL}/uploads/${key}`
    },
    async generateSignedURL(key, expiresAt) {
      return `${process.env.APP_URL}/uploads/${key}?expires=${expiresAt.getTime()}`
    },
  },
})
```

#### services/s3
[doc](https://flydrive.dev/docs/services/s3)

**O que é:** o driver para Amazon S3 e para qualquer serviço com API compatível, incluindo as opções
de credencial, região, bucket e `forcePathStyle`.
**Para que serve:** produção na AWS, e também MinIO ou LocalStack em ambiente de teste.
**Quando usar:** ao configurar o destino de produção. Leia junto com esta página as de R2 e
DigitalOcean, porque as três compartilham o mesmo driver, mudando só endpoint e credenciais.

```ts
import { S3Driver } from 'flydrive/drivers/s3'

// AWS S3 de verdade
const s3 = new S3Driver({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  region: 'us-east-1',
  bucket: 'meu-bucket',
  visibility: 'public',
})

// MinIO ou LocalStack em teste: mesmo driver, endpoint próprio
const minio = new S3Driver({
  credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' },
  endpoint: 'http://localhost:9000',
  forcePathStyle: true, // obrigatório fora da AWS, senão o host vira bucket.localhost
  region: 'us-east-1',
  bucket: 'teste',
  visibility: 'public',
})
```

#### services/r2
[doc](https://flydrive.dev/docs/services/r2)

**O que é:** o driver para Cloudflare R2, que é o driver S3 apontado para o endpoint da Cloudflare,
com as diferenças de URL pública e domínio customizado documentadas.
**Para que serve:** usar armazenamento compatível com S3 sem taxa de saída de dados.
**Quando usar:** ao escolher R2 como destino de produção. A pegadinha documentada aqui é a URL
pública: R2 exige domínio público conectado ao bucket, e não devolve uma URL utilizável por padrão.

```ts
import { S3Driver } from 'flydrive/drivers/s3'

const r2 = new S3Driver({
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto', // R2 não tem região, sempre "auto"
  bucket: process.env.R2_BUCKET!,
  visibility: 'public',
  // sem domínio público conectado no painel da Cloudflare, getUrl não devolve algo acessível
  urlBuilder: {
    async generateURL(key) {
      return `${process.env.R2_PUBLIC_DOMAIN}/${key}`
    },
  },
})
```

#### services/digital_ocean
[doc](https://flydrive.dev/docs/services/digital_ocean)

**O que é:** o driver para DigitalOcean Spaces, também compatível com S3, com o formato de endpoint
por região.
**Para que serve:** usar Spaces como destino, geralmente quando a aplicação já roda na DigitalOcean.
**Quando usar:** só se o destino escolhido for Spaces. Caso contrário, pule.

```ts
import { S3Driver } from 'flydrive/drivers/s3'

const spaces = new S3Driver({
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  endpoint: 'https://nyc3.digitaloceanspaces.com', // o endpoint carrega a região
  region: 'nyc3',
  bucket: 'meu-space',
  visibility: 'public',
})
```

#### services/gcs
[doc](https://flydrive.dev/docs/services/gcs)

**O que é:** o driver para Google Cloud Storage, com autenticação por service account ou por
credenciais implícitas do ambiente.
**Para que serve:** usar GCS como destino, com um driver próprio, que não é o S3 reaproveitado.
**Quando usar:** só se o destino escolhido for GCP. Caso contrário, pule.

```ts
import { GCSDriver } from 'flydrive/drivers/gcs'

const gcs = new GCSDriver({
  bucket: 'meu-bucket',
  // em GCP (Cloud Run, GKE) as credenciais vêm do ambiente e este bloco some
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GCP_PROJECT_ID,
  visibility: 'public',
})
```

#### services/supabase
[doc](https://flydrive.dev/docs/services/supabase)

**O que é:** o driver para Supabase Storage, que é compatível com S3, com a nota sobre as políticas
de bucket público e privado do Supabase.
**Para que serve:** usar o storage do Supabase quando o projeto já usa o resto da plataforma.
**Quando usar:** só se o destino escolhido for Supabase. Preste atenção nas políticas de RLS do
bucket, porque elas podem recusar operações que o driver considera válidas.

```ts
import { S3Driver } from 'flydrive/drivers/s3'

const supabase = new S3Driver({
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY!,
    secretAccessKey: process.env.SUPABASE_S3_SECRET!,
  },
  endpoint: `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3`,
  region: process.env.SUPABASE_REGION!,
  bucket: 'uploads',
  forcePathStyle: true,
  visibility: 'public',
})

// Se um put retornar erro de permissão com credencial correta,
// o problema é a policy do bucket no painel do Supabase, não o driver.
```

## Avançado

#### advanced/custom_drivers
[doc](https://flydrive.dev/docs/advanced/custom_drivers)

**O que é:** o contrato `DriverContract` que qualquer driver precisa implementar, e o passo a passo
para escrever um do zero.
**Para que serve:** suportar um provedor que a biblioteca não cobre, ou criar um driver falso em
memória para testes.
**Quando usar:** raramente para provedor real, já que os drivers existentes cobrem quase tudo. Vale
mais a pena ao escrever um **driver em memória para testes**, que dispensa disco e rede na suíte.

```ts
import { Disk } from 'flydrive'
import type { DriverContract } from 'flydrive/types'

// Driver em memória: a suíte de testes roda sem tocar disco nem rede.
class MemoryDriver implements Partial<DriverContract> {
  files = new Map<string, string | Uint8Array>()

  async put(key: string, contents: string | Uint8Array) {
    this.files.set(key, contents)
  }
  async get(key: string) {
    const file = this.files.get(key)
    if (file === undefined) throw new Error(`Arquivo não encontrado: ${key}`)
    return file.toString()
  }
  async exists(key: string) {
    return this.files.has(key)
  }
  async delete(key: string) {
    this.files.delete(key)
  }
  async getUrl(key: string) {
    return `memory://${key}`
  }
}

const disk = new Disk(new MemoryDriver() as DriverContract)
await disk.put('teste.txt', 'ok')
console.log(await disk.get('teste.txt')) // "ok"
```
