# Padrão de backend — perfil Fastify

Complementa `_standards/backend.md`. Vale só o que **difere** dele: camadas
(`architecture.md` §2), domínio e persistência (`domain.md`), nomenclatura, convenções de
escrita, ENV e commits já estão lá e não se repetem aqui. Entidades de exemplo: `User`, `Team`,
`Post`, nunca um domínio real.

Stack do perfil: Fastify + `fastify-decorators` (DI por decorator) + driver `mongodb` oficial
**sem ODM** (sem Mongoose, sem Prisma) + Vitest. Driver e servidor MongoDB ficam **sempre na
última major**, ajustando o código à API nova (`tooling.md` §0, `DECISIONS.md` #121).

---

## 1. Organização

A árvore do perfil está em `architecture.md` §3 (comum) e §3.3 (só no Fastify); este arquivo
não a repete. O que a árvore não explica:

- **Alias por subpath imports** do `package.json` (`architecture.md` §3), nativo do Node, não
  `paths` do `tsconfig`. *(opinião da casa)*: um mecanismo só para runtime, transpilador e teste.
- O bootstrap do `fastify-decorators` carrega controllers por diretório a partir de
  `app/features` (`architecture.md` §5). _doc-lib/fastify-decorators.md#Bootstrapping.
- **Middleware: classe + adaptador estático** *(opinião da casa; mecanismo do
  `fastify-decorators`, sem entrada de `_doc-lib` que o descreva)*. O argumento do decorator de
  rota (`onRequest: [...]`) é avaliado na decoração da classe, antes de existir instância para
  injetar por construtor. Por isso `<nome>.middleware.ts` declara a classe `@Service()` com a
  lógica (dependências pelo construtor) e um método estático `hook(options)` que devolve o
  `RequestHook` e resolve a instância com `getInstanceByToken` **na chamada**. Sem contrato
  próprio: o middleware não faz I/O, quem faz é o repository ou o service que ele recebe (§3).

---

## 2. Controller com decorator + schema

```ts
@Controller()
export default class AdministratorUserCreateController {
  private readonly http = getInstanceByToken(HttpResponseService)

  constructor(private readonly useCase: AdministratorUserCreateUseCase) {}

  @POST({
    url: '/administrator/users',
    options: {
      onRequest: [AuthenticationMiddleware.hook({ optional: false })],
      schema: SCHEMAS['POST /administrator/users'],
    },
  })
  async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> { /* … */ }
}
```

- Controller **não** é `@Service`, mas o container do `fastify-decorators` instancia do mesmo
  jeito e resolve cada parâmetro do construtor por `design:paramtypes`. Tipo de parâmetro sem
  token registrado estoura `TypeError: Invalid argument provided in <Class>'s constructor` no
  boot, e toda spec `.e2e.spec.ts` boota o kernel: a suíte reprova antes da primeira asserção
  (`backend.md` §10). _doc-lib/fastify-decorators.md#Controllers.
- **Controller é singleton.** Campo de classe nunca guarda dado de requisição (usuário, idioma,
  corpo): vaza entre usuários. Tudo que é da requisição vive em variável local do método.
- `HttpResponseService` como field initializer é a única exceção a construtor injection: linha
  idêntica em todo controller, nunca `getInstanceByToken` inline dentro de um método.
- Schema da rota (`options.schema`) valida e documenta ao mesmo tempo, com os schemas Zod de
  `shared/` (`body`, `querystring`, `params`, `response`) lidos pelo type provider
  `fastify-type-provider-zod`: `app.setValidatorCompiler(validatorCompiler)` e
  `app.setSerializerCompiler(serializerCompiler)` no kernel, e o `request` já sai tipado pelo
  schema. Ele **não** é escrito à mão: sai do gerador, indexado por `"MÉTODO /caminho"`
  (`openapi.md` #rota-nova), que só monta o objeto com os schemas do `shared/`.
  _doc-lib/fastify-plugins.md#fastify-type-provider-zod,
  _doc-lib/fastify.md#Reference/Validation-and-Serialization (`DECISIONS.md` #241).
- Entrada lida uma vez, pelo validator Zod de `shared/` (`architecture.md` §10): o use-case recebe a
  saída do validator, nunca `request.body` cru nem espalhado (`backend.md` §4.1).

---

## 3. DI: registry por convenção, contrato só para I/O externo

Nada de lista manual de bindings. Um registry (`app/core/di-registry.ts`) varre o filesystem e
chama `injectablesHolder.injectService(Contrato, Implementação)` para cada par que encontra:

| Pasta | Contrato | Implementação |
|---|---|---|
| `app/services/<nome>/` | `<nome>.contract.ts` | `<nome>.service.ts` |
| `app/repositories/<entidade>/` | `<entidade>.repository.ts` | `<entidade>.mongo.repository.ts` |
| `app/hooks/<nome>/` (opcional, `architecture.md` §3.1) | `<nome>.contract.ts` | `<nome>.service.ts` |

**Por quê**: lista manual é o tipo de arquivo que ninguém atualiza, e dependência registrada
"depois" falha em runtime, não no boot.

**O registry só pareia quem tem contrato, e contrato só existe para I/O externo** (`solid.md` §2,
`DECISIONS.md` #113, C20). Service sem I/O (slug, montagem de busca, construtor de schema), policy
e middleware são `@Service()` concretos, injetados pela própria classe; o registry não cria
contrato para eles. Contrato sem I/O é cerimônia: uma classe a mais e nenhuma troca possível.
Quando um service cresce demais, o critério de corte é o de `solid.md` §2, "Quando partir um
service".

Para adicionar uma integração externa, zero edição no registry:

1. `<nome>.contract.ts` com a `abstract class <Nome>Contract` (export nomeado).
2. `<nome>.service.ts` com `@Service() export default class` da implementação.
3. `<nome>.fake.ts` com o dublê em memória para o unitário (`architecture.md` §3).
4. Consumir via construtor, tipo = contrato. O default `= getInstanceByToken(Impl)` no parâmetro
   é opcional; o container sempre injeta.

**Importar o contrato pelo caminho direto do módulo, nunca por barrel `index.ts`.** O SWC elide o
tipo do parâmetro em re-export de barrel, e a injeção vira `undefined` em silêncio: sem erro, sem
log. _doc-lib/fastify-decorators.md#Services%20and%20dependency%20injection.

**Contrato escolhido pelo nome do arquivo, nunca pela ordem de export.** O scanner deriva o nome
esperado do *basename*, não do primeiro export que casa: a ordem de emissão de um transpilador
(SWC, Vite/oxc) não é estável entre builds, e "o primeiro que casa" já quebrou specs sem nenhum
guard acusar. Vale para qualquer scanner por convenção deste perfil.

**`new X()` nunca** em código de produção, para `X` terminado em `Service`, `UseCase`, `Policy`,
`Controller`, `Repository` ou `Seeder` (`backend.md` §2.1; regra de ESLint em `tooling.md` §4).
Composition root de verdade (`start/kernel.ts`, `bin/server.ts`, o boot de um worker de fila) é a
exceção nomeada, nunca um callback de request. `*.unit.spec.ts` pode usar `new` (§8).

**Autorização** *(opinião da casa)*. Fastify não tem biblioteca oficial de autorização, nada
equivalente ao Bouncer do AdonisJS. A `Policy` é classe `@Service()` concreta, chamada no
use-case com `(actor, target)`; a regra (incluindo 404 uniforme para registro de outro dono) é a
de `backend.md` §4.6.

**`actor` vem do token, validado pelo schema** (`backend.md` §4.3, `DECISIONS.md` #115). O
middleware de autenticação verifica o JWT, valida as claims contra o `ActorSchema` de `shared/`
e deixa o `actor` na requisição; o controller o repassa no payload. Sem consulta extra por rota:
`roles`, `teamId` e `locale` vêm nas claims, e a mudança de papel revoga a sessão (§11). O que o
use-case precisar além disso pede ao repository. O nome é `actor` também aqui, pela regra de
`backend.md` §4.3; `request.user.sub` não se repassa cru.

---

## 4. Repository sobre o driver `mongodb` (sem ODM)

O use-case injeta o **contrato** do repository (`domain.md` §5); a implementação
`<entidade>.mongo.repository.ts` fala com a collection escopada pelo driver e converte documento ↔
entidade em métodos privados (`toEntity`/`toDocument`, `domain.md` §5.2). O use-case nunca vê
`collection()`, `ObjectId` nem filtro do driver (`DECISIONS.md` #111). O antigo store exposto
(`services/<entidade>/store/`, `ModelStore<T>`) sai: o que ele fazia é detalhe da implementação.
Quando duas ou mais implementações repetem a mesma mecânica (cast de `_id`, paginação, escopo de
tenant), ela sobe para uma classe base `<nome>.base.ts` em `app/repositories/` (`backend.md` §3,
linha "classe base de template method").

- **Métodos por intenção, não CRUD genérico** (`domain.md` §5.1): nada de `find(where)` que deixa
  o filtro do Mongo vazar para o use-case.
- **Filtro montado campo a campo a partir do validado.** Nunca `collection.find(request.body)`,
  `{ ...request.query }` nem critério repassado inteiro ao driver: abre `$ne`, `$where`, `$regex`
  vindos de fora. O critério do contrato é tipado (`domain.md` §5.1) e a implementação traduz cada
  campo. _doc-lib/fastify.md#Guides/Prototype-Poisoning (mesma família de ataque).
- **`_id` é `ObjectId` no banco, string na fronteira.** Toda migration, índice e contrato de API
  assume isso; a conversão acontece no mapper, nunca no use-case.
  _doc-lib/mongodb.md#crud/query/query-document.
- **Relação por `$in` em loader, não `$lookup`.** O lado referenciado passa pela própria
  collection escopada (pode estar em outro database, em outro tenant, e leva projeção própria,
  nunca o hash de senha de um `User` completo). `$lookup` não cobre nenhuma das três.
  _doc-lib/mongodb.md#crud/query/project.
- **Validação de schema não é do banco.** Sem ODM, `required`/`enum` da definição do model não
  impedem gravação; a validação de entrada é o Zod na borda (`architecture.md` §9). Quem espera
  o banco rejeitar um campo fora do enum está enganado: ele grava.
- **`ignoreUndefined: true` no client** se o projeto migrou de um ODM que descartava chave
  `undefined` em update; sem a opção o driver grava `null` em vez de não tocar no campo.
  _doc-lib/mongodb.md#data-formats/bson/undefined-values.
- **Idempotência por claim atômico.** Finalizar upload, confirmar pagamento e webhook tratam a
  segunda chamada como sucesso, com `findOneAndUpdate` condicional ou índice único, nunca `find`
  seguido de `update` (perde a corrida). _doc-lib/mongodb.md#crud/compound-operations.
- **Transação** pelo `UnitOfWork` (`domain.md` §6): a implementação Mongo usa sessão com
  `withTransaction`, que exige replica set (o `docker-compose.yml` local sobe replica set de um
  nó). _doc-lib/mongodb.md#crud/transactions. Onde o deploy não tem replica set, a
  **compensação** é documentada no JSDoc do use-case: escreve A, tenta B, desfaz A em `left` ou
  exceção; operação destrutiva reexecutável apaga a raiz por último, para a segunda execução
  achar o que faltou *(opinião da casa)*.
- **Recusa de service é fato, não `HTTPException`.** Service de I/O devolve `Either<Fato, T>` e
  nunca importa `HTTPException`; a tradução fato → HTTP é a de `domain.md` §2
  (`_shared.<recurso>-refusal.ts` quando várias ações a repetem).

---

## 5. Encapsulamento de plugin

Cada plugin do Fastify (`@fastify/mongodb`, `@fastify/jwt`, `@fastify/cors`, …) é registrado
**uma vez**, no kernel (`start/kernel.ts`), nunca dentro de um controller ou feature. **Por quê**:
decorator de plugin (`fastify.mongo`, `fastify.jwt`) só existe na instância em que foi
registrado e nas suas filhas; registrar um plugin dentro de um `register()` encapsulado o esconde
do resto da app, e o sintoma é `decorator 'mongo' not present` numa rota que devia ver o mesmo
banco. _doc-lib/fastify.md#Reference/Encapsulation.

Plugin que **precisa** vazar decorator para fora do escopo em que foi registrado usa
`fastify-plugin` (`fp()`) explicitamente: é a válvula de escape documentada, não um acidente de
ordem de registro. _doc-lib/fastify.md#Reference/Plugins.

A ordem e a configuração dos plugins de segurança estão na §11.

---

## 6. Error handling

`HTTPException` com fábricas por status (`backend.md` §4.2). Handler global único no kernel, nesta
ordem de reconhecimento:

1. `HTTPException` → status/code/message/`errors` direto.
2. Erro de validação do Zod (`hasZodFastifySchemaValidationErrors(error)`, com os `issues` em `error.validation`, quando passou pelo `validatorCompiler` do type provider; `ZodError` direto, em `safeParse` manual) → achata em `Record<campo, mensagem>` (`z.flattenError`), **422**. Resposta que não bate com o schema (`isResponseSerializationError(error)`, `issues` em `error.cause.issues`) é bug nosso: **500**, sem os `issues` no corpo.
3. `BSONError` (ObjectId malformado) → **400**.
4. `MongoServerError` com código `11000` (índice único) → **409**.
   _doc-lib/mongodb.md#classes/MongoServerError.
5. Erro 4xx nativo do Fastify (corpo vazio, content-type sem parser, corpo acima do `bodyLimit`) →
   a mesma fábrica do status.
6. Fallback → **500**, mensagem genérica e `code` derivado do caminho (`architecture.md` §3); o
   detalhe vai para o log.

**Por quê centralizado**: sem handler único, cada controller decide o status de um `BSONError` do
jeito que lembrar. Produção nunca devolve stack, consulta, caminho de arquivo nem mensagem de
exceção desconhecida. _doc-lib/fastify.md#Reference/Errors.

A mensagem sai no idioma da requisição (§12, `i18n.md` §3); o `code` é string estável, comparada
pelo frontend, nunca o texto da `message`. Envio via `this.http.sendError(reply, exception)` do
`HttpResponseService`, nunca `reply.code(...).send(...)` espalhado por controller.

Log pelo logger do Fastify (`request.log`, ou o logger injetado no service), nunca `console.*`,
nunca o corpo inteiro da requisição. _doc-lib/fastify.md#Reference/Logging.

---

## 7. Leitor de ENV

`start/env.ts` valida o `.env` com Zod, de forma **síncrona**, num módulo avaliado no import, antes do
kernel e do container de DI. O que manda é o `safeParse`: o `validate()` do VineJS devolve Promise e a
checagem precisa rodar antes de qualquer `await` possível no bootstrap, e foi por isso que o leitor
era manual. `safeParse` é síncrono e acumula todas as falhas, que saem listadas de uma vez
(`z.prettifyError`), sem parar na primeira (_doc-lib/zod.md#basics, #error-formatting). A mesma
exigência de sincronismo está documentada para o frontend em `_doc-lib/vitejs.md#env-and-mode`.
Blocos e regras das chaves: `backend.md` §6.

```ts
// start/env.ts
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.url(),
})

const result = schema.safeParse(process.env)
if (!result.success) throw new Error(`ENV inválido:\n${z.prettifyError(result.error)}`)

export const env = result.data
```

`.env` cobre só **infraestrutura** (banco, JWT, Redis, cookie, CORS, proxy confiável). Config de
**domínio** (branding, paginação, provedor de storage) vive num documento de configuração no
próprio banco, editável em runtime: reiniciar o processo não deveria ser o único jeito de mudar o
nome da aplicação.

**`process.env` fora do leitor de ENV é sempre desvio, mesmo para `NODE_ENV`** *(opinião da
casa)*: um service que decide comportamento com `process.env.NODE_ENV !== 'production'` direto
escapa do contrato espelhado. Exponha um getter (`Env.isProduction()`, ou uma flag dedicada) no
mesmo módulo síncrono e injete/importe esse getter.

---

## 8. Testes

Matriz por camada em `architecture.md` §8; ciclo e dublês em `domain.md` §10. O que é só deste
perfil:

| | Unit | E2E |
|---|---|---|
| Arquivo | `<x>.unit.spec.ts`, ao lado do que cobre | `<x>.e2e.spec.ts`, ao lado do que cobre |
| Config | `vitest.unit.config.ts` | `vitest.e2e.config.ts` |
| Sobe banco/kernel? | Não | Sim: MongoDB real em container, um database por suíte |
| Como obtém o objeto | `new`, com a implementação em memória do repository e o `.fake.ts` do service (`DECISIONS.md` #116) | do container: `fromContainer(Impl)` / `getInstanceByToken(Impl)`, nunca `new` |
| Runner | `forks`, paralelo | `forks`, `maxWorkers: 1` |

_doc-lib/vitest.md#config/pool, #config/maxworkers.

**Por quê separar**: `*.unit.spec.ts` que sobe Mongo é lento e esconde a regressão de regra atrás de
setup de banco. No E2E, `new` deixaria o teste passar com um objeto meio construído quando o
construtor ganha uma dependência; o container quebra na hora. No unitário o risco não existe: o
construtor recebe tudo explícito, e o compilador acusa o que faltar.

**Teste de contrato do repository** (`<entidade>.repository.e2e.spec.ts`): os mesmos casos na
implementação Mongo e na de memória, com `describe.each` (`domain.md` §5.4).

**Dublê de I/O externo no E2E** *(opinião da casa)*: `provide(Contract, impl)` e
`fromContainer(Impl)` em `tests/di-fixtures.ts`; `provide` devolve um `Proxy` sem `as` que satisfaz
o tipo do contrato. Só para integração sem container de teste (gateway de pagamento, API de
terceiro); MinIO, Redis e SMTP de teste sobem de verdade. Subclasse completa do contrato só quando
ele tem método concreto. Classe nossa nunca é mockada (`domain.md` §10).
_doc-lib/fastify-decorators.md#Testing.

Transpilação de decorator em teste precisa do mesmo SWC do dev (`@swc-node/register` ou o plugin
SWC do Vitest), porque `fastify-decorators` depende de `emitDecoratorMetadata`; `tsx` ou
`ts-node` sem o plugin quebram a injeção em silêncio.
_doc-lib/fastify-decorators.md#Testing, _doc-lib/vitest.md#guide.

**Gate de cobertura explícito** *(opinião da casa, sem número fixado: decidir por projeto)*:
`coverage.thresholds` no config do Vitest, para a suíte falhar por regressão de cobertura e não só
reportar. _doc-lib/vitest.md#config/coverage.

Migration standalone, spec de script de guard-rail e suíte E2E sequencial: `backend.md` §7 (regra
única para os dois perfis).

---

## 9. Onde entram Socket.IO, BullMQ e isolated-vm

- **Socket.IO**: um service próprio em `app/services/<nome>/`, ligado no entry point
  (`bin/server.ts`), nunca dentro do kernel HTTP do Fastify: são dois servidores sobre o mesmo
  `http.Server`. Autenticação do socket reusa o **mesmo** cookie JWT do HTTP; mensagem recebida
  passa por validator antes de chegar ao use-case (`typescript.md` §2).
  _doc-lib/socket-io.md#server-initialization. Namespace e nome de sala por feature: `backend.md`
  §3 (linha "socket").
- **BullMQ**: fila sobre Redis + worker **in-process**, iniciado junto do servidor principal
  (processo separado só se o volume justificar). Job persiste no Redis: restart do worker retoma
  sozinho, sem lógica de retomada escrita à mão. _doc-lib/bullmq.md#guide/architecture.
- **Payload de job tem validator.** O dado do job trafega como JSON e chega ao worker como
  `unknown` na prática: instância de classe vira objeto puro, `undefined` some
  (_doc-lib/bullmq.md#guide/jobs/job-data). O contrato da fila
  (`app/services/<fila>/<fila>.contract.ts`) declara o schema Zod do payload (via
  `shared/` ou `#core/validator`) e o tipo `z.infer`; quem enfileira passa o tipo, e o worker abre o job por
  `QueueWorker.payloadOf(Validator, job)`, método estático da base `queue-worker.base.ts`
  (`backend.md` §3). Payload inválido falha o job sem retry, com log da tag do worker.
- **isolated-vm**: só para executar código fornecido por usuário (script de automação, fórmula),
  nunca para isolar lógica interna da própria aplicação. Timeout curto (segundos, não minutos) e
  heap limitado são obrigatórios; sem os dois, um script do usuário é negação de serviço contra o
  próprio processo. _doc-lib/isolated-vm.md#security.

---

## 10. Segredo em repouso

Credencial de terceiro em documento de configuração (chave de storage, senha de SMTP, token de API
externa) é **cifrada em repouso**, não texto puro, mesmo que "quem lê o Mongo já tem o
`process.env`" pareça fechar o caso. **Por quê**: o caminho comum de exposição é um dump de backup,
uma réplica de leitura ou um snapshot de volume, e nenhum carrega `process.env`. Cifra usa
derivação de chave de verdade (HKDF, não hash cru) com dado associado por campo (AAD), para um
ciphertext copiado de um campo para outro não decifrar no destino. Formato versionado (`enc:v1`,
`enc:v2`): versão antiga continua **lida**, escrita nova é sempre a corrente; migração de segredo
existente é idempotente. A troca de chave segue o roteiro de rotação de `docs/SECURITY.md` do
projeto. HKDF é `RFC 5869` (datatracker.ietf.org/doc/html/rfc5869); a implementação em Node é
`crypto.hkdf`/`hkdfSync` (nodejs.org/api/crypto.html#cryptohkdfdigest-ikm-salt-info-keylen-callback).
Não há `_doc-lib` de criptografia nesta casa, então a citação é direta à RFC e à doc do runtime.

---

## 11. Borda HTTP e segurança

A regra geral (sessão, CSRF, limite, cabeçalhos) é de `backend.md`; aqui fica o mecanismo do
Fastify. Tudo registrado **uma vez**, no kernel (§5), nesta ordem *(opinião da casa sobre a ordem)*:

| # | Peça | Configuração da casa | Doc |
|---|---|---|---|
| 1 | fábrica `Fastify({ … })` | `trustProxy` com o número de saltos ou a sub-rede do proxy real (`TRUSTED_PROXIES` no ENV), nunca `true` às cegas; `bodyLimit` explícito; logger com `redact` de `password`, `*.password`, `token`, `*.token`, `refreshToken`, `req.headers.authorization`, `req.headers.cookie`, `res.headers["set-cookie"]` e documento (CPF/CNPJ) | _doc-lib/fastify.md#Reference/Server, #Reference/Logging |
| 2 | `@fastify/helmet` | na raiz; API que só serve JSON fica no default. HSTS no default, sem `preload` nem `includeSubDomains` sem decisão registrada | _doc-lib/fastify-plugins.md#@fastify/helmet |
| 3 | `@fastify/cors` | origens explícitas do ENV e `credentials: true`; nunca `origin: '*'` nem refletir `Origin` sem conferir; métodos e `exposedHeaders` só os usados | _doc-lib/fastify-plugins.md#@fastify/cors |
| 4 | `@fastify/rate-limit` | global desligado ou alto; limite por rota em toda escrita sem sessão (login, cadastro, recuperação de senha, reenvio de e-mail, upload anônimo); login com chave IP + e-mail normalizado; contador em Redis com mais de uma instância; 429 com `code` estável | _doc-lib/fastify-plugins.md#@fastify/rate-limit |
| 5 | `@fastify/cookie` | atributos num ponto só, o service de cookie: `httpOnly`, `sameSite` (`backend.md` §4.10), `path: '/'`, `secure` pelo getter de ENV (§7), `domain` de `COOKIE_DOMAIN` | _doc-lib/fastify-plugins.md#@fastify/cookie |
| 6 | `@fastify/jwt` | RS256 com chave privada e pública do ENV, sem default; verificação fixa o algoritmo (`RS256`) *(página oficial não conferida para o nome exato da opção)*; access token curto, refresh com estado no banco, apagado em logout, troca de senha e mudança de papel | _doc-lib/fastify-plugins.md#@fastify/jwt |
| 7 | `@fastify/multipart` | `limits` de tamanho, quantidade de arquivos e de campos; processamento por stream | _doc-lib/fastify-plugins.md#@fastify/multipart |
| 8 | hook `onRequest` de origem | CSRF por `Origin` (ou `Sec-Fetch-Site`) contra a mesma allowlist do CORS em todo método que não é `GET`/`HEAD`; nenhum `GET` altera estado | _doc-lib/fastify-plugins.md#@fastify/csrf-protection (o `SameSite=Lax` cobre a maior parte; a checagem de origem cobre subdomínio irmão) |
| 9 | hook `onRequest` de idioma | §12 | `i18n.md` §3 |

Depois da cadeia global vêm, por rota: autenticação → papel → policy (no use-case) → validator →
use-case. **Negar por padrão**: toda rota exige sessão, exceto as declaradas públicas num lugar só
(opção `public` da rota, lida pelo `authz:check`). Webhook com corpo cru só na rota que verifica a
assinatura, com parser próprio registrado no escopo dela (_doc-lib/fastify.md#Reference/ContentTypeParser).

---

## 12. Internacionalização

Regra em `i18n.md`. No Fastify não há `_doc-lib` de i18n (não coberto) *(opinião da casa)*:

- Os textos ficam em `resources/lang/{pt-BR,es,en}/*.json`, lidos no boot por um `@Service()`
  concreto (`app/services/i18n/i18n.service.ts`; sem contrato, porque não faz I/O em runtime).
- O idioma é resolvido num hook `onRequest` registrado no kernel, a partir de `Accept-Language`,
  restrito à lista de `i18n.md` §1 com fallback `pt-BR`, e guardado na requisição por
  `decorateRequest` (_doc-lib/fastify.md#Reference/Decorators). O `actor.locale` prevalece quando
  há sessão.
- Use-case recebe o `locale` no payload junto do `actor` e monta a mensagem pela chave
  (`t('posts.not_found')`); o `code` nunca é traduzido.
- Mensagens de validação do Zod saem de `shared/src/validator.ts` (`architecture.md` §9), pelo
  locale do Zod (`z.config` com `z.locales.*`) e pelo mapa de mensagens da casa
  (_doc-lib/zod.md#error-customization). `z.config` é global ao processo e não troca por
  requisição: o idioma da requisição entra pelo `error` passado ao `parse`, montado do mapa do
  idioma, nunca por um provider por controller.
- E-mail e job usam o idioma salvo no usuário, não o da requisição que disparou o envio.

---

## 13. Segurança por classe de ataque, no Fastify *(opinião da casa sobre a skill `security-audit`)*

Completa `backend.md` §5.7 com o que só existe neste perfil. `DECISIONS.md` #230.

1. **Socket.IO** (§9). `cors.origin` = `CORS_ORIGINS`; entrar na sala de um recurso exige a policy do
   actor sobre o id dela; logout e troca de papel chamam `disconnectSockets()` na sala do usuário,
   porque o middleware de handshake roda uma vez só. *(CLIENT-SIDE.md, Cross-site WebSocket;
   PROTOCOLS-RPC-AND-MESSAGING.md, Streaming authorization.)*
2. **isolated-vm** (§9), além de timeout e teto de memória: nunca pôr `Reference`, `ExternalCopy` nem
   o módulo `ivm` no global do isolate; argumento sempre copiado; `isolate.dispose()` no `finally`;
   isolate fora do processo do servidor HTTP; Node em dia (_doc-lib/isolated-vm.md, seção de
   segurança). *(ATTACK-CLASSES.md; RESOURCE-EXHAUSTION-AND-AVAILABILITY.md, Reachable fatal error.)*
3. **LLM e MCP como agente com crachá alheio** (§9). Todo handler de ferramenta do chat ou do MCP
   recebe o `actor` da sessão e passa pela mesma policy e pelo mesmo repository escopado da rota HTTP
   equivalente; nenhuma credencial de serviço; argumento do modelo passa por Zod. *(AI-AND-LLM.md,
   Excessive agency; Tool-argument injection.)*
4. **Contexto do LLM** (§9). O que entra no prompt sai do repository escopado do actor; histórico e
   cache de prompt têm chave com tenant e usuário; texto recuperado nunca entra como mensagem de
   sistema. *(AI-AND-LLM.md, Cross-tenant context bleed; Prompt role confusion.)*
5. **JWT** (§11, linha 6). A verificação fixa `iss` e `aud` e exige `exp`; access e refresh têm `typ`
   ou `aud` distintos, e refresh apresentado como access dá 401, com E2E. *(WEB-PROTOCOL-AND-AUTH.md,
   JWT claim binding.)*
6. **Busca que vira `$regex`** (§4). Texto escapado (metacaractere literal) e limitado por
   `maxLength`; regex escrita pelo usuário nunca roda no processo web. *(RESOURCE-EXHAUSTION-AND-AVAILABILITY.md,
   Superlinear matching.)*
