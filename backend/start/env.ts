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
 * As mesmas chaves, na mesma ordem, nos três backends Adonis - inclusive as que
 * este projeto não usa hoje.
 *
 * Declarar só o que se usa parecia mais limpo e cobrava caro: quem copiava um
 * módulo de um projeto para outro descobria a variável faltando em produção, no
 * primeiro pedido que a lia. Com a lista fechada, `pattern:check` compara o
 * schema com `padrao.manifest.json` e reprova antes do commit; o que sobra é a
 * chave existir e ficar vazia, que não custa nada.
 *
 * Chave que este projeto ainda não lê é opcional. Obrigatória é só a que derruba
 * o boot quando falta - e derrubar o boot é o comportamento desejado: melhor a
 * aplicação não subir do que subir com um default escondido no código.
 */
export default await Env.create(new URL('../', import.meta.url), {
  /*
  |----------------------------------------------------------------------------
  | Node
  |----------------------------------------------------------------------------
  |
  | `TZ` é lida pelo próprio Node, não por `env.get()`, e por isso passava
  | despercebida: estava nos três `.env.example` e em schema nenhum. Ausente, o
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

  STORAGE_KEY: Env.schema.string.optional(),
  STORAGE_SECRET: Env.schema.string.optional(),
  STORAGE_BUCKET: Env.schema.string.optional(),
  STORAGE_ENDPOINT: Env.schema.string.optional(),

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

  /*
  |----------------------------------------------------------------------------
  | Envio de e-mail
  |----------------------------------------------------------------------------
  |
  | Todas opcionais: sem `SMTP_HOST` a aplicação sobe igual e o que seria enviado
  | vira uma linha de log. E-mail é notificação, não parte do fluxo - e nenhuma
  | operação pode ser recusada porque o servidor de e-mail não foi configurado.
  |
  | `MAIL_FROM` precisa ser um endereço do domínio autenticado no SMTP;
  | fornecedor nenhum entrega e-mail assinado como endereço de terceiro.
  | `MAIL_TO` é a caixa que recebe os avisos internos, onde existirem.
  |
  | SMTP e não a API de um fornecedor: Gmail, Zoho, Brevo, Resend e o servidor da
  | própria hospedagem falam SMTP, então trocar de fornecedor é trocar variável.
  |
  | `SMTP_HOST` não tem default: `'localhost'` fazia o mailer apontar para o
  | próprio host em silêncio, e a falha só aparecia como e-mail que nunca chegou.
  */
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  MAIL_FROM: Env.schema.string.optional(),
  MAIL_TO: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------------------------
  | Endereço do site
  |----------------------------------------------------------------------------
  |
  | A base dos links que a API manda por e-mail. É o endereço do **frontend**, e
  | não o da API (`APP_SERVER_URL`): quem clica precisa cair numa tela, não num JSON.
  |
  | Opcional pelo mesmo motivo do bloco acima: sem ela o link vira uma linha de
  | log e a operação continua. Um link montado sobre um default errado seria pior
  | que link nenhum - ele sai, chega, e não funciona.
  */
  APP_CLIENT_URL: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------------------------
  | Fila
  |----------------------------------------------------------------------------
  |
  | `REDIS_URL` é o armazenamento da fila, numa URL só -
  | `redis://[:senha@]host:porta[/db]`. Uma variável e não quatro: é assim que
  | todo provedor entrega a credencial, e é o que o compose sobrescreve.
  |
  | Opcional, e não obrigatória como o instalador do pacote a escreve: a
  | aplicação sobe sem infraestrutura acessória. Sem ela o `config/queue.ts` cai
  | no adaptador `sync`. Exigir a variável transformaria Redis fora do ar em site
  | fora do ar.
  |
  | Sem `format: 'url'`: o validador do Adonis só reconhece esquemas web, e
  | recusa `redis://` como URL inválida.
  |
  | `QUEUE_DRIVER` é o adaptador. Com `REDIS_URL` o default é `redis`, o único
  | que sobrevive a um restart - e a fila existe justamente para o trabalho que
  | não pode se perder quando o processo cai. `sync` executa o job na hora,
  | dentro da requisição: é o default sem `REDIS_URL`, e o que a suíte usa.
  */
  REDIS_URL: Env.schema.string.optional(),
  QUEUE_DRIVER: Env.schema.enum.optional(['redis', 'database', 'sync'] as const),

  /*
  |----------------------------------------------------------------------------
  | Pix
  |----------------------------------------------------------------------------
  |
  | A chave que recebe o pagamento, e o nome e a cidade que aparecem no
  | aplicativo do banco de quem paga.
  |
  | **Obrigatórias onde a cobrança existe**, e opcionais onde não existe - é a
  | única diferença entre os três schemas. Tinham default escrito no serviço, e
  | um deploy que esquecesse a variável emitiria todo BR Code apontando para a
  | chave do repositório; o defeito só apareceria quando alguém reclamasse de um
  | pagamento que não chegou. Sem default, a aplicação não sobe - que é o barulho
  | certo para uma chave que recebe dinheiro.
  |
  | Nome e cidade não são enfeite: o manual do Bacen os exige no BR Code, com
  | teto de 25 e 15 caracteres. Estourar o teto faz o aplicativo recusar o código
  | inteiro, e o erro só aparece na hora de pagar.
  */
  PIX_KEY: Env.schema.string.optional(),
  PIX_MERCHANT: Env.schema.string.optional(),
  PIX_CITY: Env.schema.string.optional(),
})
