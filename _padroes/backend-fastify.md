# Padrão de backend — perfil Fastify

Complementa `_padroes/backend.md` (o perfil AdonisJS + Lucid). Vale só o que
**difere** dele: camadas, nomenclatura, convenções de escrita, ENV e commits
já estão lá e não se repetem aqui. Entidades de exemplo: `User`, `Team`,
`Post` — nunca um domínio real.

Stack do perfil: Fastify + `fastify-decorators` (DI por decorator) + driver
`mongodb` oficial **sem ODM** (sem Mongoose, sem Prisma).

---

## 1. Organização

A árvore é a de `_padroes/arquitetura.md` §3, a mesma de qualquer backend da casa — raiz
`app/`, não `application/`. O que é só deste perfil:

```
app/
├── core/                    # tipo, valor, bootstrap — nada de regra de negócio
├── models/<entidade>.ts     # defineModel<T>(...) — a forma gravada, 1 arquivo por entidade
├── services/
│   └── <entidade>/
│       ├── <entidade>-contract.service.ts   # abstract class, export nomeado
│       ├── <entidade>.service.ts            # @Service() export default, a impl
│       └── store/                           # ModelStore<T>: collection + serialização + hydrate()
├── middleware/<nome>.middleware.ts          # 1 adaptador por contract+impl
└── features/
    └── <módulo>/
        └── <recurso>/
            ├── <recurso>.validator.ts       # um por recurso, um export por ação
            └── <ação>/
                ├── <ação>.controller.ts
                ├── <ação>.use-case.ts
                └── <ação>.spec.ts
```

- **Ação é pasta e validator é por recurso**, como em qualquer perfil (`arquitetura.md` §3,
  `_padroes/backend.md` §1.2 e §4.4). Não existe `_shared.validator.ts` por módulo: regra que
  2+ recursos repetem é função em `app/core/validator.ts`.
- **Alias por subpath imports** do `package.json` (`#core/*`, `#features/*`, `#services/*`,
  …), nativo do Node — não `paths` do `tsconfig` com `@application/*`. *(opinião da casa)*:
  um mecanismo só para runtime, transpilador e teste.
- O bootstrap do `fastify-decorators` carrega controllers por diretório a partir de
  `app/features` (`arquitetura.md` §5).
- **Middleware é tripla** *(opinião da casa — mecanismo do `fastify-decorators`, sem entrada
  de `_doc-lib`)*: `<nome>-middleware-contract.service.ts` (abstract class),
  `<nome>-middleware.service.ts` (`@Service()`, a impl) e `<nome>.middleware.ts` (função que
  devolve o `RequestHook` resolvendo o service pelo container na chamada). **Por quê:** o
  argumento do decorator de rota (`onRequest: [...]`) é avaliado na decoração da classe, antes
  de existir instância para injetar por construtor.

---

## 2. Controller com decorator + schema

```ts
@Controller('/users')
export default class {
  private readonly http = getInstanceByToken(HttpResponseService)

  constructor(
    private readonly useCase: UserCreateUseCase = getInstanceByToken(UserCreateUseCase),
  ) {}

  @POST({ url: '/', options: { schema: userCreateSchema } })
  async create(request: FastifyRequest, reply: FastifyReply) { /* ... */ }
}
```

- Controller **não** é `@Service`, mas o container do `fastify-decorators`
  instancia do mesmo jeito e resolve cada parâmetro do construtor por
  `design:paramtypes`. Tipo de parâmetro sem token registrado estoura
  `TypeError: Invalid argument provided in <Class>'s constructor` no boot — é
  o que um `boot:check` em CI deve pegar antes de produção.
  _doc-lib/fastify-decorators.md#Controllers.
- `HttpResponseService` como field initializer é a única exceção a construtor
  injection — linha idêntica em todo controller, nunca `getInstanceByToken`
  inline dentro de um método (funciona, mas é uma segunda forma sem ganho).
- Schema da rota (`options.schema`) valida e documenta ao mesmo tempo — é o
  Fastify, diferente do perfil Adonis onde o schema é **derivado** do
  validator VineJS pelo `openapi:generate`. Aqui, se o schema não é escrito à
  mão, o Swagger plugin não documenta nada.
  _doc-lib/fastify.md#Reference/Validation-and-Serialization.

---

## 3. DI: registry por convenção, contract/impl

Nada de lista manual de bindings. Um registry varre o filesystem por
`<base>-contract.service.ts` + `<base>.service.ts` pareados por convenção de
nome, e chama `injectablesHolder.injectService(Contract, Impl)` para cada
par. **Por quê**: lista manual é o tipo de arquivo que ninguém atualiza — dependência
nova registrada "depois" é dependência que falha em runtime, não no boot.

Para adicionar uma dependência nova, zero edição no registry:

1. `<base>-contract.service.ts` com a abstract class `<X>ContractService`
   (export nomeado).
2. `<base>.service.ts` com `@Service() export default class` da impl.
3. Consumir via construtor, tipo = Contract, `getInstanceByToken(Impl)` como
   default do parâmetro (nunca executa em runtime — o container sempre
   injeta — mas mantém a classe construível à mão em teste).

**Importar o Contract pelo caminho direto do módulo, nunca por barrel
`index.ts`.** O SWC elide o tipo do parâmetro em re-export de barrel, e a
injeção vira `undefined` silenciosamente — sem erro, sem log, o campo
simplesmente não existe em runtime. _doc-lib/fastify-decorators.md#Services%20and%20dependency%20injection.

**`new X()` nunca**, para `X` terminado em `Service`, `UseCase`, `Policy`,
`Controller`, `Repository` ou `Seeder` — ver `_padroes/tooling.md` para a regra de
ESLint que cobra isso. Composition root de verdade (`start/kernel.ts`,
`bin/server.ts`, um worker de fila) é a exceção nomeada, nunca um callback de
request.

**Autorização** *(opinião da casa)*. Fastify não tem biblioteca oficial de
autorização — nada equivalente ao Bouncer do AdonisJS (`_padroes/backend.md`
§4.6). A `Policy` é só mais uma classe injetável pelo registry contract/impl
deste perfil, chamada direto no use-case com `(actor, target)`: mesma forma
do perfil Adonis, sem pacote nenhum por trás, porque aqui não existe um para
comparar.

**`actor` pode ser só o id de sessão, por decisão deliberada** *(opinião da casa, diferente
de `_padroes/backend.md` §4.3)*. O guard Adonis já hidrata `context.auth.user`; o controller
Fastify só tem `request.user.sub` (claim do JWT) — carregar o `User` inteiro exigiria uma
consulta extra em **toda** rota autenticada, só para repassar um objeto que a maioria dos
use-cases nem lê por completo. O padrão real do perfil é passar o id (`actorUserId`,
nome único e consistente — nunca `userId`/`ownerId`) e deixar o use-case buscar o que precisa
(`this.user.findActiveById(actorUserId)`) só quando precisa.

**Contrato escolhido pelo nome do arquivo, nunca pela ordem de export.** O scanner de
`injectService`/`pickContract` deriva o nome esperado do *basename* do arquivo, não do
primeiro export que casa — a ordem de emissão de um transpilador (SWC, Vite/oxc) não é
garantia estável entre builds, e "o primeiro que casa" já quebrou specs em silêncio sem
nenhum guard acusar. Receita geral para qualquer scanner por convenção neste perfil.

---

## 4. Store substitui repositório (driver sem ODM)

Use-case e service injetam o **store** da entidade
(`<X>ContractService`/`ModelStore<T>`) e falam direto com a collection
escopada: `this.users.collection().findOne({ ... })`. O store **não** tem
método de consulta por caso de uso — só `collection()`, serialização
(`entity()`/`toEntity()`) e `hydrate()` para as refs que toda leitura da
entidade carrega. Decisão completa e riscos aceitos em
`_doc-lib/mongodb.md` + `_padroes/DECISOES.md` (driver sem ODM).

- **Store não é repositório.** Um método por caso de uso
  ("findActiveUsersOlderThan") é o que a régua do perfil Adonis proíbe —
  vale igual aqui, só sem o Mongoose escondendo o `find` num Model estático.
- **`_id` é `ObjectId` no banco, string na fronteira.** Toda migration,
  índice e contrato de API assume isso — casting explícito na borda
  (`castFilter`/`castUpdate`), use-case nunca manipula `ObjectId` cru.
  _doc-lib/mongodb.md#crud/query/query-document.
- **Relação por `$in` em loader, não `$lookup`.** O lado referenciado passa
  pela própria collection escopada (pode estar em outro database, em outro
  tenant, e leva projeção própria — nunca o hash de senha de um `User`
  completo). `$lookup` não cobre nenhuma das três.
  _doc-lib/mongodb.md#crud/query/project.
- **Validação de schema não é do banco.** Sem ODM, `required`/`enum` da
  definição servem só para o OpenAPI — a validação de entrada de verdade é o
  VineJS na borda, igual ao perfil Adonis. Quem espera o banco rejeitar um
  campo fora do enum está enganado: ele grava.
- **`ignoreUndefined: true` no client** se o projeto migrou de um ODM que
  descartava chave `undefined` em update — sem a opção o driver grava `null`
  em vez de não tocar no campo, mudança de comportamento silenciosa.

---

## 5. Encapsulamento de plugin

Cada plugin do Fastify (`@fastify/mongodb`, `@fastify/jwt`,
`@fastify/cors`, …) é registrado **uma vez**, no kernel (`start/kernel.ts`),
nunca dentro de um controller ou feature. **Por quê**: decorator de plugin
(`fastify.mongo`, `fastify.jwt`) só existe na instância em que foi
registrado e nas suas filhas — registrar um plugin dentro de um `register()`
encapsulado (uma rota com prefixo) o esconde do resto da app, e o sintoma é
`decorator 'mongo' not present` numa rota que devia ver o mesmo banco.
_doc-lib/fastify.md#Reference/Encapsulation.

Plugin que **precisa** vazar decorator para fora do escopo em que foi
registrado usa `fastify-plugin` (`fp()`) explicitamente — é a válvula de
escape documentada, não um acidente de ordem de registro.
_doc-lib/fastify.md#Reference/Plugins.

---

## 6. Error handling

`HTTPException` estende `Error`, com factories estáticas (`HTTPException.of`)
para cada status — nova factory é uma linha, não uma classe. Handler global
único no kernel, nesta ordem de reconhecimento:

1. `HTTPException` → status/code/message/`errors` direto.
2. Erro de validação do VineJS → achata em `Record<campo, mensagem>`, **422**.
3. `BSONError`/`CastError` (ObjectId malformado) → **400**.
4. `E11000` (índice único) → **409**.
5. Erro 4xx nativo do Fastify (corpo vazio, content-type sem parser) → a
   mesma factory do status.
6. Fallback → **500**.

**Por quê centralizado**: sem handler único, cada controller decide o status
de um `CastError` do jeito que lembrar — um retorna 400, outro deixa
estourar 500. Mensagem de erro sempre em pt-BR; `code` é string estável,
comparada pelo frontend (`_padroes/frontend.md` §4), nunca o texto da
`message`. Chamada via `sendError(reply, exception)` central, nunca
`reply.code(...).send(...)` espalhado por controller.

---

## 7. Leitor de ENV

`.env` checado à mão, de forma **síncrona**, num módulo avaliado no import —
antes do kernel e do container de DI. Sem schema ali de propósito: o
`validate()` de uma lib de validação devolve Promise, e a checagem precisa
rodar antes de qualquer `await` possível no bootstrap. A checagem acumula
todas as falhas e lista de uma vez, não para na primeira. A mesma exigência
de sincronismo para o módulo de env está documentada para o frontend em
`_doc-lib/vitejs.md#env-and-mode` (schema do `@t3-oss/env-core` é síncrono);
aqui não há doc-lib de validação de ENV para Fastify/Node, então o raciocínio
é por analogia, não citação direta.

`.env` cobre só **infraestrutura** (DB, JWT, Redis, cookies, CORS). Config de
**domínio** (branding, paginação, provedor de storage) vive num documento de
configuração no próprio banco, editável em runtime — reiniciar o processo
não deveria ser o único jeito de mudar o nome da aplicação.

**`process.env` fora do leitor de ENV é sempre desvio, mesmo para `NODE_ENV`** *(opinião da
casa)*: um service que decide comportamento com `process.env.NODE_ENV !== 'production'`
direto escapa do contrato espelhado. Exponha um getter (`Env.NODE_ENV`, ou uma flag dedicada
como `isTestEmail`) computado no mesmo módulo síncrono acima, e injete/importe esse getter —
nunca leia a variável global de novo em outro arquivo.

---

## 8. Testes

| | Unit | E2E |
|---|---|---|
| Padrão de arquivo | `<ação>.unit.spec.ts` (ou `<nome>.unit.spec.ts` ao lado do service) | `<ação>.spec.ts`, na pasta da ação |
| Sobe banco/kernel? | Não | Sim — MongoDB real, 1 DB por suíte |
| Runner | `forks`, paralelo | `forks`, `maxWorkers: 1` |
| O que testa | Cálculo puro (fatiamento, limite, de-para) | Request completo via supertest |

**Por quê separar**: `*.unit.spec.ts` que sobe Mongo é lento e esconde a
regressão de cálculo puro atrás de setup de banco — e é onde a regressão
silenciosa de verdade mora (fatiamento errado, limite off-by-one). E2E usa
`app.container.make(X)` — nunca `new X()` — para instanciar; com `new`, o
teste não quebra quando o construtor ganha uma dependência nova, e passa
testando um objeto meio construído.

Transpilação de decorator em teste precisa do mesmo `@swc-node/register` (ou
equivalente SWC) do dev, porque `fastify-decorators` depende de
`emitDecoratorMetadata` — rodar via `ts-node` puro ou `tsx` sem o plugin SWC
correto quebra a injeção silenciosamente, não com erro.
_doc-lib/fastify-decorators.md#Testing, _doc-lib/vitest.md#guide.

**Helper de teste para dublê sem container** *(opinião da casa)*: um `provide()`/
`fromContainer()` em `tests/helpers/di.helper.ts`, onde `provide(Contract, impl)` devolve um
`Proxy` sem `as` que satisfaz o tipo do Contract — para `*.unit.spec.ts` que precisa de um
dublê tipado sem subir o container real. Vale para todo backend deste perfil.

**Gate de cobertura explícito** *(opinião da casa, sem número fixado — decidir por
projeto)*: `coverage.thresholds` no config do Vitest, para que a suíte falhe por regressão de
cobertura e não só reporte — hoje `test:coverage` existe mas nada quebra o CI quando a
cobertura cai.

Migration como script standalone, spec de script de guard-rail e suíte E2E sequencial:
`backend.md` §7 (regra única para os dois perfis).

---

## 9. Onde entram Socket.IO, BullMQ e isolated-vm

- **Socket.IO**: um `*.service.ts` próprio, ligado no entry point
  (`bin/server.ts`), nunca dentro do kernel HTTP do Fastify — são dois
  servidores sobre o mesmo `http.Server`. Autenticação do socket reusa o
  **mesmo** cookie JWT do HTTP — segundo mecanismo de auth só para o socket é
  retrabalho e mais uma superfície pra divergir.
  _doc-lib/socket-io.md#server-initialization.
  Namespace e nome de sala por feature: `backend.md` §3 (linha "socket").
- **BullMQ**: fila sobre Redis + worker **in-process**, iniciado junto do
  servidor principal (processo separado só se o volume justificar). Job
  persiste no Redis — restart do worker retoma sozinho, sem lógica de
  retomada escrita à mão. _doc-lib/bullmq.md#guide/architecture.
- **isolated-vm**: só para executar código fornecido por usuário
  (script de automação, fórmula, etc.), nunca para isolar lógica interna da
  própria aplicação — isso é responsabilidade de módulo, não de sandbox.
  Timeout curto (segundos, não minutos) e heap limitado são obrigatórios;
  sem os dois, um script do usuário é negação de serviço contra o próprio
  processo. _doc-lib/isolated-vm.md#security.

---

## 10. Segredo em repouso

Credencial de terceiro em documento de configuração (chave de storage, senha
de SMTP, token de API externa) é **cifrada em repouso**, não texto puro —
mesmo que "quem lê o Mongo já tem o `process.env`" pareça fechar o caso.
**Por quê**: o caminho comum de exposição é um dump de backup, uma réplica
de leitura ou um snapshot de volume — nenhum carrega `process.env`. Cifra usa
derivação de chave de verdade (HKDF, não hash cru) com dado associado por
campo (AAD), para um ciphertext copiado de um campo para outro não decifrar
no destino. Formato versionado (`enc:v1`, `enc:v2`): versão antiga continua
**lida**, escrita nova é sempre a corrente — migração de segredo existente é
idempotente, nunca quebra o que já estava gravado. HKDF é `RFC 5869`
(datatracker.ietf.org/doc/html/rfc5869); a implementação em Node é
`crypto.hkdf`/`hkdfSync` (nodejs.org/api/crypto.html#cryptohkdfdigest-ikm-salt-info-keylen-callback) —
não há `_doc-lib` de criptografia nesta casa, então a citação é direta à
RFC e à doc do runtime, não a um doc-lib.
