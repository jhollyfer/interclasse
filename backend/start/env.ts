/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

/**
 * O único leitor de ambiente (_standards/backend.md §6), em blocos na ordem da
 * casa. Toda chave declarada aqui é lida por algum `env.get()`, e vice-versa -
 * `pattern:check` cobra os dois sentidos; chave que perdeu o leitor sai.
 *
 * Obrigatória é a que derruba o boot quando falta - e derrubar o boot é o
 * comportamento desejado: melhor a aplicação não subir do que subir com um
 * default escondido no código.
 */
export default await Env.create(new URL('../', import.meta.url), {
  /*
  |----------------------------------------------------------------------------
  | Node
  |----------------------------------------------------------------------------
  |
  | `TZ` é lida pelo próprio Node, não por `env.get()`, e por isso passava
  | despercebida: estava no `.env.example` e em schema nenhum. Ausente, o
  | processo herda o fuso do host, e a mesma consulta responde datas diferentes
  | conforme a máquina. `UTC` em todo ambiente; quem converte para o fuso de quem
  | lê é a camada de apresentação.
  */
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),
  TZ: Env.schema.string.optional(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_SERVER_URL: Env.schema.string({ format: 'url', tld: false }),

  /**
   * Quem o Adonis trata como proxy confiável, para `request.ip()` ler o
   * `X-Forwarded-For` só de quem o proxy de fato escreveu. Um valor só, no
   * formato do `proxy-addr`: IP, sub-rede (`10.0.0.0/8`) ou apelido
   * (`loopback`, `linklocal`, `uniquelocal`).
   *
   * Opcional, e o default é seguro: ausente vale `loopback`, o do Adonis. Atrás
   * do Traefik do Coolify (outro container) ela é **necessária**: sem ela
   * `request.ip()` é o IP do proxy e todo limite por IP vira global. Nunca
   * `true`: o cliente passa a forjar o `X-Forwarded-For`.
   */
  TRUSTED_PROXIES: Env.schema.string.optional(),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  /**
   * Origens que o navegador pode usar para chamar esta API, separadas por
   * vírgula. Opcional porque em desenvolvimento o `config/cors.ts` libera tudo;
   * fora dele, ausente significa lista vazia, e lista vazia recusa todo pedido
   * cross-origin - que é o default certo para um valor que ninguém configurou.
   */
  CORS_ORIGIN: Env.schema.string.optional(),

  /**
   * O domínio do cookie de sessão, quando o app e a API ficam em hosts
   * diferentes do mesmo domínio-pai.
   *
   * Sem ela o cookie nasce host-only e o SSR do frontend nunca o recebe: todo
   * F5 em rota privada vira 401 e volta para a tela de entrada. Em
   * desenvolvimento não aparece porque cookie ignora porta - `localhost:3333` e
   * `localhost:3000` são o mesmo domínio.
   *
   * O valor é o menor domínio que cobre os dois hosts. Opcional de propósito:
   * ausente é o comportamento que este arquivo sempre teve.
   */
  COOKIE_DOMAIN: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Banco de dados
  |----------------------------------------------------------
  */
  DATABASE_URL: Env.schema.string(),

  /**
   * TLS na conexão com o Postgres. É decisão de infraestrutura, não de ambiente:
   * um banco na mesma rede privada da aplicação normalmente não fala TLS, e um
   * banco gerenciado normalmente exige. Amarrar isso a `NODE_ENV` obrigava um
   * dos dois arranjos a não subir.
   */
  DATABASE_SSL: Env.schema.boolean.optional(),

  /*
  |----------------------------------------------------------
  | Armazenamento de arquivos
  |----------------------------------------------------------
  |
  | Um bucket S3-compatível, o mesmo em todo ambiente: MinIO em dev e nos testes,
  | e em produção o que `STORAGE_ENDPOINT` apontar. Não há escolha de destino por
  | ambiente porque o upload é presigned multipart, e multipart é API do S3 - um
  | disco local não a tem.
  |
  | O prefixo é `STORAGE_`, e não o nome de um fornecedor: o que o código depende
  | é do protocolo. R2, S3, Spaces, Linode e MinIO trocam de lugar mudando o
  | endpoint.
  |
  | `UPLOAD_MAX_SIZE` é o teto por arquivo, em bytes, e é **exigida**: o quanto
  | cabe num upload é decisão de quem opera, e um default escondido no código é
  | um teto que ninguém escolheu e ninguém vê. Faltando, a aplicação não sobe -
  | que é melhor do que subir recusando arquivo por um limite invisível.
  */
  UPLOAD_MAX_SIZE: Env.schema.number(),

  // Credencial e destino do bucket: obrigatórios e sem default. O storage é
  // funcionalidade de base, e subir sem ele é subir com upload quebrado.
  STORAGE_KEY: Env.schema.string(),
  STORAGE_SECRET: Env.schema.string(),
  STORAGE_BUCKET: Env.schema.string(),
  STORAGE_ENDPOINT: Env.schema.string(),

  /**
   * O MinIO só atende no estilo `endpoint/bucket/chave`; os buckets gerenciados
   * atendem também no estilo `bucket.endpoint`. Ligar isto em dev e desligar em
   * produção é a única diferença de configuração entre os dois.
   */
  STORAGE_FORCE_PATH_STYLE: Env.schema.boolean.optional(),

  /*
  |----------------------------------------------------------------------------
  | Semeadura
  |----------------------------------------------------------------------------
  |
  | Lidas pelos seeders, e opcionais porque a aplicação sobe sem elas - só quem
  | semeia precisa. Sem a senha o seeder para em vez de criar uma conta com
  | credencial conhecida: ela era literal no arquivo, e qualquer pessoa que o
  | lesse tinha o dono de todo ambiente já semeado.
  |
  | `SEED_DEMO_PASSWORD` é a senha das contas do catálogo de demonstração, onde
  | houver esse catálogo. Mesma regra: sem default, e o seeder para sem ela.
  */
  SEED_OWNER_EMAIL: Env.schema.string.optional(),
  SEED_OWNER_PASSWORD: Env.schema.string.optional(),
  SEED_DEMO_PASSWORD: Env.schema.string.optional(),
})
