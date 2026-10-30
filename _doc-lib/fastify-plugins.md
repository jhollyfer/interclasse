# Fastify — plugins

O catálogo do ecossistema: 60 plugins oficiais e 237 da comunidade, com o que cada um resolve.

**O que é:** a lista de pacotes que estendem o Fastify. Ela é grande porque o núcleo é pequeno de
propósito — o sexto princípio técnico do projeto é "se pode ser um plugin, provavelmente deve
ser". CORS, cabeçalho de segurança, cookie, sessão, JWT, upload, arquivo estático, WebSocket,
conexão de banco, documentação: nada disso vem no pacote `fastify`.

**Para que serve:** responder "que plugin resolve isto" sem varrer o npm. E, principalmente,
responder **antes** de você escrever o seu: quase toda necessidade de infraestrutura de um
servidor HTTP já está empacotada aqui, testada por gente que levou o defeito em produção antes.

**Como usar:** plugin é `register`, e a **ordem importa** — quem registra depois enxerga o que
foi decorado antes, e o que é registrado dentro de um contexto não sobe.

```ts
import Fastify from 'fastify'

const app = Fastify({ logger: true })

// Na raiz: vale para toda a aplicação.
await app.register(import('@fastify/helmet'))
await app.register(import('@fastify/cors'), { origin: true, credentials: true })
await app.register(import('@fastify/cookie'), { secret: env.COOKIE_SECRET })

// Num contexto: vale só para as rotas registradas ali dentro.
app.register(async (scope) => {
  await scope.register(import('@fastify/rate-limit'), { max: 5, timeWindow: '1 minute' })
  scope.post('/authentication/sign-in', handler)
})
```

**Quando escrever o seu em vez de instalar:** quando o que você precisa é **regra deste
projeto** — o guard de papel, o envelope de resposta, o contexto do usuário autenticado. Plugin
de terceiro vale para o que é genérico e chato de acertar: parsing, protocolo, cabeçalho de
segurança, pool de conexão. Regra de negócio embrulhada em plugin publicável costuma ser a
mesma regra com uma camada de indireção a mais.

**Como escolher entre dois que fazem a mesma coisa:** `Guides/Write-Plugin`, em
[`fastify.md`](fastify.md), é a régua que os oficiais seguem — documentação, exemplo, teste,
linter e CI. Serve para avaliar plugin dos outros com o mesmo critério.

---

**Divergência de formato, e o porquê.** Os 60 oficiais têm os três campos de sempre — **O que
é**, **Para que serve**, **Quando usar**. Os 237 da comunidade vão em **tabela de uma linha**,
e é deliberado: a pergunta que se faz sobre eles é varrer nomes atrás de um que sirva, não
escolher entre dois. São README no `HEAD` de repositório de terceiro — mudam sem o link
quebrar, e um parágrafo escrito hoje sobre um deles envelhece sem aviso. A ordem também não é a
do site: lá é alfabética, e aqui é por problema, porque `fastify-` inicia 181 dos 230 nomes e
ordem alfabética não separa nada.

**Links:** 298.

**Skills:** `maiyu-backend`, `solid`, `api-and-interface-design`, `security-best-practices`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

**Marca ⚠ nas tabelas da comunidade:** repositório arquivado, sumido ou sem push há mais de dois
anos, conferido em 2026-10 por `scripts/doc-lib/audit.mjs` (seção de repositórios do
`_audit/REPORT.md`). Não quer dizer quebrado: quer dizer que o defeito que aparecer é seu.
Prefira o oficial ou um sem marca que resolva o mesmo.

---

## Fundamentos

#### ecosystem
[doc](https://fastify.dev/ecosystem/) | [markdown](https://fastify.dev/docs/latest/Guides/Ecosystem.md)
**O que é:** a página oficial do ecossistema, com os plugins mantidos pela organização Fastify
separados dos da comunidade, cada um com uma linha de descrição em inglês.
**Para que serve:** é a fonte deste arquivo, e continua sendo a fonte para o que entrou depois.
Plugin novo aparece lá primeiro.
**Quando usar:** ao conferir se o catálogo daqui envelheceu, e ao procurar algo que não está
nas tabelas abaixo.

---

## Da comunidade, adotado pela casa

Um plugin de terceiro que o padrão exige no backend Fastify (`DECISIONS.md` #241). Tem entrada
completa em vez de linha de tabela; a linha da tabela de validação, mais abaixo, continua como
índice do mesmo repositório.

#### fastify-type-provider-zod
[repo](https://github.com/turkerdev/fastify-type-provider-zod) | [markdown](https://raw.githubusercontent.com/turkerdev/fastify-type-provider-zod/main/README.md)
**O que é:** o type provider do Zod para o Fastify 5. Conferido contra o README no `main` e contra o
tipo de `fastify-type-provider-zod@7.0.0`. Peers: `fastify ^5.5.0`, `zod >=4.1.5`,
`@fastify/swagger >=9.5.1`, `openapi-types ^12.1.3`. Quatro peças:
`validatorCompiler` (valida a requisição com `safeParse` do Zod), `serializerCompiler` (serializa a
resposta com `safeEncode`, depois `JSON.stringify`), o tipo `ZodTypeProvider` (infere `req.body`,
`req.query`, `req.params` e `reply.send` do schema) e `jsonSchemaTransform` (entrega o schema ao
`@fastify/swagger` em JSON Schema, por `z.toJSONSchema`).
**Para que serve:** schema de rota em Zod no lugar de JSON Schema escrito à mão: o mesmo objeto valida,
tipa o handler, serializa a resposta e gera o OpenAPI. É o que liga o `shared/` ao Fastify
(`_doc-lib/zod.md`).
**Quando usar:** em todo backend Fastify da casa.

```ts
import fastifySwagger from '@fastify/swagger'
import Fastify from 'fastify'
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { SignInPayload, UserResponse } from '@acme/shared'

const app = Fastify().withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// o transform precisa estar registrado antes das rotas: rota sem ele não entra no documento
await app.register(fastifySwagger, {
  openapi: { info: { title: 'API', version: '1.0.0' } },
  transform: jsonSchemaTransform,
  transformObject: jsonSchemaTransformObject,
})

app.route({
  method: 'POST',
  url: '/authentication/sign-in',
  schema: { body: SignInPayload, response: { 200: UserResponse } },
  handler: (req, reply) => reply.send(req.body.email),
})
```

**O que muda a experiência:**

1. **A versão 7 serializa por `z.output`.** Até a 6 era `z.input`. Com `transform`, `default` ou
   `codec` o handler entrega o tipo de **saída** e o serializador faz o `encode` (precisa do Zod
   4.2 ou mais novo). O `Date` de um `codec` vira texto na resposta.
2. **O validador é síncrono.** `validatorCompiler` usa `safeParse`: schema de rota com refinamento ou
   transform `async` lança. Consulta a banco fica no use-case.
3. **`$ref` por `id`.** `z.globalRegistry.add(schema, { id: 'User' })` (ou `.meta({ id })`) mais o
   `jsonSchemaTransformObject` produz `components.schemas` e referências no OpenAPI.
4. **Alvo do OpenAPI.** O padrão é `openapi-3.0` para documento `3.0.x` e `draft-2020-12` para `3.1.x`;
   `createJsonSchemaTransform({ zodToJsonConfig: { target } })` força um. `skipList` tira rota do
   documento. Corpo vazio é `z.undefined()` (204).
5. **Erro tipado.** `hasZodFastifySchemaValidationErrors(err)` reconhece falha de requisição (`err.validation`
   traz as issues) e `isResponseSerializationError(err)` a de resposta (`err.cause.issues`, 500). Os dois
   saem do pacote e entram no `setErrorHandler`; o README usa o segundo sem importá-lo.
6. **Plugin.** `FastifyPluginAsyncZod` e `FastifyPluginCallbackZod` herdam o provider dentro de
   `register`; sem eles o `req.body` volta a `unknown` no plugin.
7. **O README importa de `zod/v4`.** É o mesmo Zod 4; no código da casa o `z` vem de `shared`.

---

## Oficiais

Mantidos pela organização Fastify, com a mesma política de LTS do framework. São 60.

### Segurança e limite

#### @fastify/helmet
[repo](https://github.com/fastify/fastify-helmet) | [markdown](https://raw.githubusercontent.com/fastify/fastify-helmet/HEAD/README.md)
**O que é:** os cabeçalhos de segurança do Helmet — CSP, HSTS, `X-Frame-Options`,
`X-Content-Type-Options` e o resto — aplicados como plugin.
**Para que serve:** a camada de defesa que não custa nada e ninguém lembra de pôr. Boa parte
dos achados de um scanner de segurança em API são cabeçalhos ausentes.
**Quando usar:** **em toda aplicação, na raiz.** Se a API serve HTML, revise a CSP; se serve só
JSON, o default já está certo.

#### @fastify/cors
[repo](https://github.com/fastify/fastify-cors) | [markdown](https://raw.githubusercontent.com/fastify/fastify-cors/HEAD/README.md)
**O que é:** CORS: origem permitida, método, cabeçalho, credencial e resposta ao preflight.
**Para que serve:** deixar o navegador chamar a API de outro domínio. Sem ele, front separado
não fala com o backend — e o erro aparece no console do navegador, não no log do servidor.
**Quando usar:** sempre que o frontend estiver em outra origem. Com cookie de sessão,
`credentials: true` **e** origem explícita: o navegador recusa `origin: '*'` junto de credencial,
e o sintoma é a requisição funcionar no Insomnia e falhar no navegador.

#### @fastify/csrf-protection
[repo](https://github.com/fastify/csrf-protection) | [markdown](https://raw.githubusercontent.com/fastify/csrf-protection/HEAD/README.md)
**O que é:** proteção contra CSRF por token, sobre cookie ou sessão.
**Para que serve:** impedir que outro site faça o navegador do usuário mandar uma requisição
autenticada — o ataque que existe justamente porque o cookie viaja sozinho.
**Quando usar:** quando a sessão mora em **cookie** e o formulário é servido pela aplicação.
API que autentica por cabeçalho `Authorization` não tem esse problema, porque o navegador não
manda cabeçalho customizado sozinho. `SameSite=Lax` cobre a maior parte dos casos hoje; este
plugin é a camada que resta.

#### @fastify/rate-limit
[repo](https://github.com/fastify/fastify-rate-limit) | [markdown](https://raw.githubusercontent.com/fastify/fastify-rate-limit/HEAD/README.md)
**O que é:** limite de requisição por janela de tempo, com contagem em memória ou em Redis, por
IP ou por chave escolhida, global ou por rota.
**Para que serve:** teto em porta aberta. Login, recuperação de senha, cadastro público e upload
anônimo são as quatro que sempre precisam.
**Quando usar:** **em toda rota que aceita escrita sem sessão.** Duas armadilhas: sem
`trustProxy` na fábrica, o IP contado atrás de proxy é o do proxy — e o limite vira global; e
com mais de uma instância, contador em memória conta um enésimo do tráfego real, então Redis não
é otimização, é correção.

#### @fastify/throttle
[repo](https://github.com/fastify/fastify-throttle) | [markdown](https://raw.githubusercontent.com/fastify/fastify-throttle/HEAD/README.md)
**O que é:** limitação da **velocidade** de download de uma resposta, em bytes por segundo.
**Para que serve:** não deixar um download grande comer a banda de saída inteira.
**Quando usar:** ao servir arquivo pesado para muita gente. É outro problema que o
`rate-limit` — aquele conta requisição, este conta byte.

#### @fastify/under-pressure
[repo](https://github.com/fastify/under-pressure) | [markdown](https://raw.githubusercontent.com/fastify/under-pressure/HEAD/README.md)
**O que é:** medida de pressão do processo — atraso do event loop, heap, memória residente — com
resposta automática de `503 Service Unavailable` quando o limite estoura, e uma rota de saúde.
**Para que serve:** degradar de forma previsível em vez de travar. Um servidor sobrecarregado que
recusa rápido se recupera; um que aceita tudo e responde em trinta segundos não.
**Quando usar:** quando houver mais de uma instância e um balanceador na frente — o 503 é o
sinal para ele mandar tráfego a outro lugar. A rota de saúde daqui costuma dispensar plugin
separado de healthcheck.

#### @fastify/circuit-breaker
[repo](https://github.com/fastify/fastify-circuit-breaker) | [markdown](https://raw.githubusercontent.com/fastify/fastify-circuit-breaker/HEAD/README.md)
**O que é:** disjuntor por rota: depois de N falhas, a rota passa a recusar de imediato por um
tempo, sem tentar de novo.
**Para que serve:** parar de bater numa dependência que já caiu. Sem disjuntor, cada requisição
espera o timeout, e a fila de espera derruba o processo junto.
**Quando usar:** em rota que depende de serviço externo instável. Se a dependência é o próprio
banco, o disjuntor mascara o problema em vez de resolvê-lo.

### Autenticação e sessão

#### @fastify/auth
[repo](https://github.com/fastify/fastify-auth) | [markdown](https://raw.githubusercontent.com/fastify/fastify-auth/HEAD/README.md)
**O que é:** um combinador de estratégias: roda várias funções de autenticação em sequência
(`relation: 'or'`) ou todas (`'and'`), com uma decisão só no fim.
**Para que serve:** a rota que aceita mais de uma forma de credencial — cookie **ou** chave de
API, por exemplo — sem `if` aninhado no handler.
**Quando usar:** com duas ou mais estratégias. Com uma só, um `preHandler` seu já resolve, e
com menos indireção.

#### @fastify/jwt
[repo](https://github.com/fastify/fastify-jwt) | [markdown](https://raw.githubusercontent.com/fastify/fastify-jwt/HEAD/README.md)
**O que é:** assinatura e verificação de JWT sobre o `fast-jwt`, com decorators
(`request.jwtVerify`, `reply.jwtSign`) e leitura do token em cabeçalho, cookie ou query.
**Para que serve:** emitir e conferir token sem escrever a parte criptográfica.
**Quando usar:** ao autenticar por token. Nota que custa caro: JWT **não se revoga** — o token
vale até expirar. Quem precisa de logout imediato precisa de lista de revogação ou de sessão
com estado, e é aí que `secure-session` ou `session` entram no lugar.

#### @fastify/cookie
[repo](https://github.com/fastify/fastify-cookie) | [markdown](https://raw.githubusercontent.com/fastify/fastify-cookie/HEAD/README.md)
**O que é:** leitura e escrita de cookie, com assinatura opcional e as opções de
`httpOnly`, `secure`, `sameSite`, `domain` e `path`.
**Para que serve:** é a base de quase toda sessão, e a dependência de `session`,
`secure-session` e `csrf-protection`.
**Quando usar:** sempre que a credencial viajar em cookie. `httpOnly` tira o token do alcance
do JavaScript, e `domain` é o que decide se o cookie chega ao subdomínio — cookie sem `domain`
nasce host-only, e quem faz SSR em outro host nunca o recebe.

#### @fastify/session
[repo](https://github.com/fastify/session) | [markdown](https://raw.githubusercontent.com/fastify/session/HEAD/README.md)
**O que é:** sessão **com estado**: um id no cookie e os dados num armazenamento — memória por
padrão, Redis ou banco por configuração.
**Para que serve:** sessão que se pode invalidar do servidor, ao contrário do JWT.
**Quando usar:** quando logout precisa valer na hora, ou quando a sessão guarda mais do que
cabe num cookie. O armazenamento em memória é só para desenvolvimento: com duas instâncias,
metade das requisições não acha a sessão.

#### @fastify/secure-session
[repo](https://github.com/fastify/fastify-secure-session) | [markdown](https://raw.githubusercontent.com/fastify/fastify-secure-session/HEAD/README.md)
**O que é:** sessão **sem estado**, criptografada com libsodium dentro do próprio cookie.
**Para que serve:** sessão sem armazenamento — nada de Redis, nada de tabela — com o conteúdo
ilegível para o cliente, ao contrário de um JWT, que é só assinado e se lê em qualquer site de
decodificação.
**Quando usar:** quando a sessão é pequena e não precisa de revogação imediata. O limite é o
tamanho do cookie: uns 4KB, contando tudo.

#### @fastify/basic-auth
[repo](https://github.com/fastify/fastify-basic-auth) | [markdown](https://raw.githubusercontent.com/fastify/fastify-basic-auth/HEAD/README.md)
**O que é:** autenticação HTTP Basic — usuário e senha no cabeçalho, em base64.
**Para que serve:** proteger algo interno com o mínimo de código: painel de métrica, documentação
de API em ambiente de teste, rota de administração.
**Quando usar:** só sobre HTTPS, e só para o que é interno. Não serve de autenticação de
usuário final: não tem logout, não tem expiração, e o navegador guarda a credencial.

#### @fastify/bearer-auth
[repo](https://github.com/fastify/fastify-bearer-auth) | [markdown](https://raw.githubusercontent.com/fastify/fastify-bearer-auth/HEAD/Readme.md)
**O que é:** conferência de um token estático no cabeçalho `Authorization: Bearer`, contra uma
lista de chaves.
**Para que serve:** autenticar **máquina**: webhook, job, integração, serviço interno.
**Quando usar:** para chamador que não é gente. Para usuário, o token precisa de emissão e
expiração, e aí o plugin é o `jwt`.

#### @fastify/oauth2
[repo](https://github.com/fastify/fastify-oauth2) | [markdown](https://raw.githubusercontent.com/fastify/fastify-oauth2/HEAD/README.md)
**O que é:** o fluxo OAuth 2.0 de ponta a ponta sobre o `simple-oauth2`, com configuração pronta
de Google, GitHub, Facebook, Microsoft e outros.
**Para que serve:** "entrar com o Google" sem implementar redirecionamento, troca de código por
token e renovação à mão.
**Quando usar:** ao oferecer login por provedor externo. O que ele entrega é o token do
provedor — a sessão da **sua** aplicação ainda é sua, e sai de `jwt`, `session` ou
`secure-session`.

#### @fastify/passport
[repo](https://github.com/fastify/fastify-passport) | [markdown](https://raw.githubusercontent.com/fastify/fastify-passport/HEAD/README.md)
**O que é:** a ponte para as estratégias do Passport, que são centenas.
**Para que serve:** o provedor exótico que o `oauth2` não cobre — SAML, LDAP, um SSO
corporativo.
**Quando usar:** quando a estratégia existe no Passport e não existe em outro lugar. Ele traz o
modelo de sessão do Express junto, então é mais peso do que o `oauth2` para o caso comum.

#### @fastify/flash
[repo](https://github.com/fastify/fastify-flash) | [markdown](https://raw.githubusercontent.com/fastify/fastify-flash/HEAD/README.md)
**O que é:** mensagem de uma leitura só, guardada na sessão e consumida na requisição seguinte.
**Para que serve:** o "salvo com sucesso" que sobrevive a um redirecionamento, no fluxo clássico
de formulário e `POST-redirect-GET`.
**Quando usar:** em aplicação que renderiza HTML no servidor. API JSON não precisa: quem mostra
a mensagem é o cliente, com o que veio na resposta.

### Corpo, conteúdo e arquivo

#### @fastify/formbody
[repo](https://github.com/fastify/fastify-formbody) | [markdown](https://raw.githubusercontent.com/fastify/fastify-formbody/HEAD/Readme.md)
**O que é:** o parser de `application/x-www-form-urlencoded`.
**Para que serve:** aceitar `<form>` HTML sem JavaScript, e webhook de serviço que ainda posta
formulário — pagamento e telefonia são os suspeitos de sempre.
**Quando usar:** ao receber formulário clássico. O Fastify entende JSON e texto puro nativamente,
e mais nada.

#### @fastify/multipart
[repo](https://github.com/fastify/fastify-multipart) | [markdown](https://raw.githubusercontent.com/fastify/fastify-multipart/HEAD/README.md)
**O que é:** `multipart/form-data`: arquivo por stream ou em buffer, campo de texto junto, e
limites de tamanho, quantidade e nome.
**Para que serve:** upload. É o caminho oficial, e o que integra com a validação de schema.
**Quando usar:** em toda rota de upload. **Configure os limites**: o default é generoso, e
upload sem teto é derrubada de serviço de graça. Processar por stream em vez de buffer é o que
evita carregar um arquivo de 200MB na memória para gravá-lo em seguida.

#### @fastify/accepts
[repo](https://github.com/fastify/fastify-accepts) | [markdown](https://raw.githubusercontent.com/fastify/fastify-accepts/HEAD/README.md)
**O que é:** o pacote `accepts` como decorator: negociação de tipo, charset, codificação e
idioma a partir dos cabeçalhos `Accept*`.
**Para que serve:** decidir no handler se responde JSON, XML ou HTML para o mesmo recurso.
**Quando usar:** quando a mesma rota serve formatos diferentes. Se a API só fala JSON, não
existe negociação a fazer.

#### @fastify/accepts-serializer
[repo](https://github.com/fastify/fastify-accepts-serializer) | [markdown](https://raw.githubusercontent.com/fastify/fastify-accepts-serializer/HEAD/README.md)
**O que é:** o passo seguinte: escolhe **o serializador** conforme o `Accept`, em vez de deixar
a decisão no handler.
**Para que serve:** manter o handler devolvendo um objeto e deixar o formato para a camada de
serialização, onde ele pertence.
**Quando usar:** com mais de um formato de saída em várias rotas. Para uma rota só, um `if` é
mais honesto.

#### @fastify/compress
[repo](https://github.com/fastify/fastify-compress) | [markdown](https://raw.githubusercontent.com/fastify/fastify-compress/HEAD/README.md)
**O que é:** compressão da resposta em gzip, deflate e brotli, com limiar de tamanho e lista de
tipos.
**Para que serve:** cortar o tamanho de resposta grande.
**Quando usar:** quando **não** houver proxy na frente — com Traefik ou nginx, quem comprime é
ele, e comprimir duas vezes é só CPU gasta. Em qualquer um dos dois, **exclua
`text/event-stream`**: SSE comprimido fica preso no buffer, e o cliente não recebe nada até
encher — sem erro nenhum no log.

#### @fastify/static
[repo](https://github.com/fastify/fastify-static) | [markdown](https://raw.githubusercontent.com/fastify/fastify-static/HEAD/README.md)
**O que é:** servidor de arquivo estático, com `ETag`, `Last-Modified`, `Range` e prefixo de
rota.
**Para que serve:** servir upload, build de frontend ou qualquer pasta.
**Quando usar:** em desenvolvimento, e em produção pequena. Com CDN ou proxy na frente, o
arquivo estático não deveria passar pelo Node. Cuidado com o caminho: `root` deve ser absoluto
e fora de qualquer diretório que contenha segredo.

#### @fastify/url-data
[repo](https://github.com/fastify/fastify-url-data) | [markdown](https://raw.githubusercontent.com/fastify/fastify-url-data/HEAD/README.md)
**O que é:** um método na requisição para ler os componentes **crus** da URL — esquema, host,
porta, caminho, query — como vieram, sem normalização.
**Para que serve:** o caso em que a normalização atrapalha: assinatura de URL, proxy que precisa
repassar o original, roteamento por host.
**Quando usar:** raramente. `request.url`, `request.host` e `request.protocol` cobrem o dia a
dia.

#### @fastify/etag
[repo](https://github.com/fastify/fastify-etag) | [markdown](https://raw.githubusercontent.com/fastify/fastify-etag/HEAD/README.md)
**O que é:** `ETag` calculado automaticamente para a resposta, com `304 Not Modified` quando o
cliente manda `If-None-Match`.
**Para que serve:** economizar banda em resposta que muda pouco — o corpo não é reenviado.
**Quando usar:** em `GET` de recurso estável. Em resposta que muda a cada chamada, é hash
calculado à toa.

#### @fastify/caching
[repo](https://github.com/fastify/fastify-caching) | [markdown](https://raw.githubusercontent.com/fastify/fastify-caching/HEAD/README.md)
**O que é:** cache no servidor mais controle de `Cache-Control` e `ETag` na resposta.
**Para que serve:** as duas metades do cache HTTP: dizer ao cliente e ao proxy o que podem
guardar, e guardar do lado de cá o que é caro de produzir.
**Quando usar:** em resposta cara e pouco mutável. A parte de `Cache-Control` vale sozinha —
resposta autenticada sem `private` ou `no-store` pode acabar num cache compartilhado, servindo
o dado de um usuário para outro.

### Banco e fila

#### @fastify/postgres
[repo](https://github.com/fastify/fastify-postgres) | [markdown](https://raw.githubusercontent.com/fastify/fastify-postgres/HEAD/README.md)
**O que é:** o pool do `pg` como decorator (`fastify.pg`), com transação por requisição e o
fechamento amarrado ao `onClose`.
**Para que serve:** ter **um** pool para o processo inteiro, e não um por módulo. Pool duplicado
é o caminho mais rápido para estourar `max_connections` do Postgres.
**Quando usar:** com SQL direto. Com ORM, quem administra o pool é o ORM, e este plugin sobra —
o que continua valendo é a forma: conexão como decorator, fechada no `onClose`.

#### @fastify/mysql
[repo](https://github.com/fastify/fastify-mysql) | [markdown](https://raw.githubusercontent.com/fastify/fastify-mysql/HEAD/README.md)
**O que é:** o mesmo para MySQL e MariaDB, com pool e modo promessa.
**Para que serve:** conexão compartilhada em toda a aplicação.
**Quando usar:** com SQL direto em MySQL.

#### @fastify/mongodb
[repo](https://github.com/fastify/fastify-mongodb) | [markdown](https://raw.githubusercontent.com/fastify/fastify-mongodb/HEAD/README.md)
**O que é:** o cliente oficial do MongoDB decorado na instância, com acesso ao banco e às
coleções e `forceClose` no desligamento.
**Para que serve:** um pool de conexão para o processo, em vez de um por módulo.
**Quando usar:** com o driver puro. Com Mongoose, quem conecta é o Mongoose.

#### @fastify/redis
[repo](https://github.com/fastify/fastify-redis) | [markdown](https://raw.githubusercontent.com/fastify/fastify-redis/HEAD/README.md)
**O que é:** o `ioredis` como decorator, com suporte a mais de uma conexão nomeada e
`closeClient` opcional.
**Para que serve:** cache, contador de limite de requisição, sessão, fila — a mesma conexão
para tudo isso.
**Quando usar:** ao usar Redis para qualquer coisa. Por padrão ele **não** fecha a conexão no
desligamento: `closeClient: true` é o que evita o processo que não morre no deploy.

#### @fastify/elasticsearch
[repo](https://github.com/fastify/fastify-elasticsearch) | [markdown](https://raw.githubusercontent.com/fastify/fastify-elasticsearch/HEAD/README.md)
**O que é:** o cliente oficial do Elasticsearch compartilhado na instância.
**Para que serve:** busca e agregação sem instanciar cliente em cada módulo.
**Quando usar:** com Elasticsearch ou OpenSearch.

#### @fastify/kafka
[repo](https://github.com/fastify/fastify-kafka) | [markdown](https://raw.githubusercontent.com/fastify/fastify-kafka/HEAD/README.md)
**O que é:** produtor e consumidor Kafka como decorator.
**Para que serve:** publicar e consumir evento dentro do ciclo de vida do servidor, com o
desligamento tratado.
**Quando usar:** com Kafka. Consumidor dentro do processo do servidor HTTP é uma decisão de
arquitetura, não uma consequência do plugin: um consumidor lento segura o event loop que
atende requisição.

### Documentação e schema

#### @fastify/swagger
[repo](https://github.com/fastify/fastify-swagger) | [markdown](https://raw.githubusercontent.com/fastify/fastify-swagger/HEAD/README.md)
**O que é:** o gerador de documento OpenAPI a partir do `schema` que as rotas já declaram.
**Para que serve:** documentação que não dessincroniza, porque não é escrita à parte — sai do
mesmo schema que valida a requisição.
**Quando usar:** **em toda API pública.** Vale declarar `tags`, `summary` e `description` nas
rotas: sem isso o documento sai correto e ilegível. Rota sem `schema` não aparece — e o aviso
`FSTWRN001` está avisando exatamente disso.

#### @fastify/swagger-ui
[repo](https://github.com/fastify/fastify-swagger-ui) | [markdown](https://raw.githubusercontent.com/fastify/fastify-swagger-ui/HEAD/README.md)
**O que é:** a interface do Swagger UI servida sobre o documento que o `swagger` produz.
**Para que serve:** a página navegável, com o botão de experimentar a requisição.
**Quando usar:** junto do `swagger`. Em produção, atrás de autenticação ou desligada: o
documento descreve toda a superfície da API, inclusive o que não está no frontend.

#### @fastify/response-validation
[repo](https://github.com/fastify/fastify-response-validation) | [markdown](https://raw.githubusercontent.com/fastify/fastify-response-validation/HEAD/README.md)
**O que é:** validação da **resposta** contra o schema declarado, e não só serialização.
**Para que serve:** pegar o handler que devolve algo fora do contrato. Sem ele, o schema de
resposta apenas **remove** o que não está declarado, em silêncio.
**Quando usar:** em desenvolvimento e em teste, sempre. Em produção, pesa — e a decisão é entre
custo por requisição e devolver dado errado calado.

#### @fastify/type-provider-typebox
[repo](https://github.com/fastify/fastify-type-provider-typebox) | [markdown](https://raw.githubusercontent.com/fastify/fastify-type-provider-typebox/HEAD/README.md)
**O que é:** o type provider do TypeBox, que declara JSON Schema **e** tipo TypeScript na mesma
expressão.
**Para que serve:** acabar com o par schema-e-tipo que dessincroniza, sem gerar código.
**Quando usar:** em projeto TypeScript que valida por JSON Schema. É a escolha mais comum do
ecossistema, porque o que o TypeBox produz **é** JSON Schema — nada de conversão.

#### @fastify/type-provider-json-schema-to-ts
[repo](https://github.com/fastify/fastify-type-provider-json-schema-to-ts) | [markdown](https://raw.githubusercontent.com/fastify/fastify-type-provider-json-schema-to-ts/HEAD/README.md)
**O que é:** o type provider que infere o tipo a partir de JSON Schema escrito à mão.
**Para que serve:** o caso em que o schema já existe — importado de um contrato, gerado por
outra ferramenta — e o que falta é o tipo.
**Quando usar:** com JSON Schema literal. Exige `as const` em schema extraído para variável, ou
o TypeScript alarga os literais e a inferência morre.

### Montagem da aplicação

#### @fastify/autoload
[repo](https://github.com/fastify/fastify-autoload) | [markdown](https://raw.githubusercontent.com/fastify/fastify-autoload/HEAD/README.md)
**O que é:** carrega todos os plugins de um diretório, recursivamente, com prefixo derivado da
estrutura de pastas e filtro por nome.
**Para que serve:** parar de manter uma lista de `register` que sempre esquece o arquivo novo.
**Quando usar:** ao organizar a aplicação em pastas de feature. O preço é que a ordem de carga
passa a ser a do sistema de arquivos — para o que precisa vir antes, `dependencies` no plugin ou
um `register` explícito continua sendo a resposta.

#### @fastify/awilix
[repo](https://github.com/fastify/fastify-awilix) | [markdown](https://raw.githubusercontent.com/fastify/fastify-awilix/HEAD/README.md)
**O que é:** injeção de dependência pelo Awilix, com container por aplicação e por requisição.
**Para que serve:** o que o Fastify não tem — resolução de dependência declarada, em vez de
decorator manual.
**Quando usar:** em aplicação grande, com muitos serviços e testes que trocam implementação.
Em aplicação pequena, decorator resolve o mesmo problema com menos peça móvel.

#### @fastify/env
[repo](https://github.com/fastify/fastify-env) | [markdown](https://raw.githubusercontent.com/fastify/fastify-env/HEAD/README.md)
**O que é:** carga e validação das variáveis de ambiente contra um JSON Schema, com default e
coerção de tipo, expostas em `fastify.config`.
**Para que serve:** falhar no **boot** quando falta variável, em vez de falhar em runtime na
primeira requisição que a usa.
**Quando usar:** sempre. É o plugin que transforma "por que está `undefined` em produção" num
erro de inicialização com o nome da variável.

#### @fastify/sensible
[repo](https://github.com/fastify/fastify-sensible) | [markdown](https://raw.githubusercontent.com/fastify/fastify-sensible/HEAD/README.md)
**O que é:** um conjunto de defaults e atalhos: erros HTTP (`httpErrors.notFound()`), asserções
(`assert`), `reply.vary`, `reply.cacheControl` e outros.
**Para que serve:** parar de escrever `reply.code(404).send({...})` com um formato levemente
diferente em cada arquivo.
**Quando usar:** cedo, se o projeto ainda não tem envelope de erro próprio. Se já tem, este
plugin cria um segundo caminho para a mesma coisa.

#### @fastify/request-context
[repo](https://github.com/fastify/fastify-request-context) | [markdown](https://raw.githubusercontent.com/fastify/fastify-request-context/HEAD/README.md)
**O que é:** armazenamento por requisição sobre `AsyncLocalStorage` — o dado fica acessível em
qualquer profundidade da pilha, sem passar parâmetro.
**Para que serve:** id de correlação, usuário atual e locale disponíveis no log e no repositório
sem atravessar cinco assinaturas de função.
**Quando usar:** com moderação. Resolve o problema real do id de correlação, e é a porta de
entrada do estado global disfarçado — dependência que não aparece na assinatura é dependência
que o teste não vê.

#### @fastify/routes
[repo](https://github.com/fastify/fastify-routes) | [markdown](https://raw.githubusercontent.com/fastify/fastify-routes/HEAD/README.md)
**O que é:** um `Map` com todas as rotas registradas e suas opções.
**Para que serve:** introspecção: gerar índice, conferir cobertura, montar diagnóstico.
**Quando usar:** em ferramenta interna e em teste. Não tem uso em requisição.

#### @fastify/routes-stats
[repo](https://github.com/fastify/fastify-routes-stats) | [markdown](https://raw.githubusercontent.com/fastify/fastify-routes-stats/HEAD/README.md)
**O que é:** estatística de tempo por rota com `node:perf_hooks`.
**Para que serve:** achar a rota lenta sem instalar APM.
**Quando usar:** em investigação de desempenho. Para observabilidade contínua, `otel` ou
métrica de Prometheus.

#### @fastify/schedule
[repo](https://github.com/fastify/fastify-schedule) | [markdown](https://raw.githubusercontent.com/fastify/fastify-schedule/HEAD/README.md)
**O que é:** tarefa periódica sobre o `toad-scheduler`, com o ciclo de vida amarrado ao do
servidor.
**Para que serve:** limpeza, sincronização, relatório — o que um cron faria.
**Quando usar:** com uma instância só. Com várias, **toda** instância roda a tarefa, e o
resultado é o e-mail enviado três vezes: aí a resposta é fila com trava ou cron da plataforma.

### Interop e view

#### @fastify/express
[repo](https://github.com/fastify/fastify-express) | [markdown](https://raw.githubusercontent.com/fastify/fastify-express/HEAD/README.md)
**O que é:** a camada de compatibilidade completa com Express: `app.use`, middleware e o que
depende do `req`/`res` do Express.
**Para que serve:** migração gradual, e o middleware que só existe para Express.
**Quando usar:** como ponte, não como destino. Ele traz o Express inteiro junto e devolve boa
parte do custo que o Fastify existe para evitar. Onde bastar middleware simples, `middie` é
mais leve.

#### @fastify/middie
[repo](https://github.com/fastify/middie) | [markdown](https://raw.githubusercontent.com/fastify/middie/HEAD/README.md)
**O que é:** um motor de middleware no estilo Express, sem o Express.
**Para que serve:** usar middleware de terceiro que só precisa de `req`, `res` e `next`.
**Quando usar:** quando não existir plugin equivalente. Para os populares, existe: `helmet`,
`cors` e `serve-static` têm plugin nativo.

#### @fastify/view
[repo](https://github.com/fastify/point-of-view) | [markdown](https://raw.githubusercontent.com/fastify/point-of-view/HEAD/README.md)
**O que é:** renderização de template — EJS, Pug, Handlebars, Marko, Liquid e outros — por
`reply.view()`.
**Para que serve:** servir HTML pelo servidor: painel simples, página de erro, e-mail
renderizado.
**Quando usar:** em aplicação que devolve HTML. Numa API com frontend separado, o uso que sobra
é template de e-mail.

#### @fastify/hotwire
[repo](https://github.com/fastify/fastify-hotwire) | [markdown](https://raw.githubusercontent.com/fastify/fastify-hotwire/HEAD/README.md)
**O que é:** suporte ao padrão Hotwire — Turbo Streams e Turbo Frames — para atualizar pedaço de
página com HTML vindo do servidor.
**Para que serve:** interatividade sem SPA.
**Quando usar:** em aplicação renderizada no servidor que adotou Hotwire. Não se mistura com
frontend em React.

#### @fastify/funky
[repo](https://github.com/fastify/fastify-funky) | [markdown](https://raw.githubusercontent.com/fastify/fastify-funky/HEAD/README.md)
**O que é:** aceita retorno funcional no handler — `Either`, `Task`, função sem parâmetro — e
resolve antes de responder.
**Para que serve:** quem usa `Either` como resultado de caso de uso pode devolvê-lo direto, sem
desembrulhar em toda rota.
**Quando usar:** em base que já é funcional. Fora dela, é uma indireção a mais.

#### @fastify/nextjs
[repo](https://github.com/fastify/fastify-nextjs) | [markdown](https://raw.githubusercontent.com/fastify/fastify-nextjs/HEAD/README.md)
**O que é:** SSR de Next.js dentro do Fastify.
**Para que serve:** um processo só servindo API e páginas.
**Quando usar:** raramente — o Next tem servidor próprio e é ele quem recebe as melhorias.
Serve quando a API já existe em Fastify e o Next é uma parte pequena.

#### @fastify/vite
[repo](https://github.com/fastify/fastify-vite) | [markdown](https://raw.githubusercontent.com/fastify/fastify-vite/HEAD/README.md)
**O que é:** integração com o Vite: HMR em desenvolvimento e servir a build em produção, para
SPA, MPA ou SSR.
**Para que serve:** um servidor só para o frontend e a API, sem proxy no meio em
desenvolvimento.
**Quando usar:** quando o frontend em Vite e a API moram no mesmo processo. Com deploy separado
— o caso comum — não entra.

### Tempo real e proxy

#### @fastify/websocket
[repo](https://github.com/fastify/fastify-websocket) | [markdown](https://raw.githubusercontent.com/fastify/fastify-websocket/HEAD/README.md)
**O que é:** WebSocket sobre o `ws`, com a rota declarada como qualquer outra e o ciclo de vida
do Fastify por trás.
**Para que serve:** comunicação nos dois sentidos: chat, colaboração, notificação.
**Quando usar:** quando o cliente também **fala**. Se o servidor só empurra, SSE é mais simples,
sobrevive a proxy e reconecta sozinho.

#### @fastify/sse
[repo](https://github.com/fastify/sse) | [markdown](https://raw.githubusercontent.com/fastify/sse/HEAD/README.md)
**O que é:** Server-Sent Events: uma conexão HTTP que fica aberta e o servidor manda evento por
ela.
**Para que serve:** progresso, notificação, atualização ao vivo — sempre num sentido só.
**Quando usar:** quando o servidor empurra e o cliente só escuta. Dois cuidados de operação:
**nada de gzip** em `text/event-stream`, e um ping periódico para o proxy não fechar a conexão
ociosa.

#### @fastify/http-proxy
[repo](https://github.com/fastify/fastify-http-proxy) | [markdown](https://raw.githubusercontent.com/fastify/fastify-http-proxy/HEAD/README.md)
**O que é:** proxy reverso de um prefixo de rota para outro servidor, com hooks para reescrever
requisição e resposta.
**Para que serve:** gateway, estrangulamento de monolito, upstream escondido atrás da mesma
origem — o que também mata o problema de CORS.
**Quando usar:** ao pôr uma API na frente de outra. Para uma rota só, `reply-from` é mais
direto.

#### @fastify/reply-from
[repo](https://github.com/fastify/fastify-reply-from) | [markdown](https://raw.githubusercontent.com/fastify/fastify-reply-from/HEAD/README.md)
**O que é:** encaminha **uma** requisição para outro servidor e devolve a resposta, por
`reply.from()`.
**Para que serve:** o encaminhamento pontual, com a chance de mexer no que vai e no que volta.
**Quando usar:** em rota específica. É a peça sobre a qual o `http-proxy` é construído.

### Observabilidade e deploy

#### @fastify/otel
[repo](https://github.com/fastify/otel) | [markdown](https://raw.githubusercontent.com/fastify/otel/HEAD/README.md)
**O que é:** instrumentação OpenTelemetry oficial: span por requisição, propagação de contexto e
atributos de rota.
**Para que serve:** rastreio distribuído sem instrumentar handler à mão.
**Quando usar:** quando houver mais de um serviço, ou um serviço e um banco lento. É o padrão
aberto — troca-se o backend (Jaeger, Tempo, Datadog) sem trocar o código.

#### @fastify/zipkin
[repo](https://github.com/fastify/fastify-zipkin) | [markdown](https://raw.githubusercontent.com/fastify/fastify-zipkin/HEAD/README.md)
**O que é:** rastreio no formato do Zipkin.
**Para que serve:** o mesmo do `otel`, para quem já tem Zipkin de pé.
**Quando usar:** só nesse caso. Em projeto novo, `otel`.

#### @fastify/one-line-logger
[repo](https://github.com/fastify/one-line-logger) | [markdown](https://raw.githubusercontent.com/fastify/one-line-logger/HEAD/README.md)
**O que é:** um formatador que transforma o JSON do Pino numa linha legível.
**Para que serve:** ler log no terminal sem `pino-pretty`.
**Quando usar:** **só em desenvolvimento.** Em produção o log tem de ser JSON, ou nenhum
agregador consegue indexar campo.

#### @fastify/aws-lambda
[repo](https://github.com/fastify/aws-lambda-fastify) | [markdown](https://raw.githubusercontent.com/fastify/aws-lambda-fastify/HEAD/README.md)
**O que é:** o adaptador que transforma a aplicação em handler de AWS Lambda, atrás do API
Gateway.
**Para que serve:** publicar em Lambda sem reescrever as rotas.
**Quando usar:** quando a plataforma for essa. Antes, leia `Guides/Serverless` em
[`fastify.md`](fastify.md): em Lambda não há processo de pé, então keep-alive, pool e cache em
memória — parte do que faz o Fastify ser rápido — não têm onde existir.

---

## Comunidade

Mantidos por terceiros. Um link vivo aqui **não** é prova de que o plugin está vivo: o que morre
primeiro é o pacote, não a URL. Antes de instalar, olhe a data do último commit e o número de
issues abertas — e passe a régua de `Guides/Write-Plugin`.

São 237, agrupados por problema.

### Autenticação e autorização

| Plugin | O que resolve |
| --- | --- |
| [`@clerk/fastify`](https://github.com/clerk/javascript/tree/main/packages/fastify) · [md](https://raw.githubusercontent.com/clerk/javascript/main/packages/fastify/README.md) | Autenticação e gestão de usuário pelo Clerk |
| [`@stitchapi/fastify`](https://github.com/rejifald/StitchAPI/tree/main/packages/fastify) · [md](https://raw.githubusercontent.com/rejifald/StitchAPI/main/packages/fastify/README.md) | Contexto de requisição do StitchAPI: principal, SSE, mapeamento de erro e ponte com o Pino |
| [`fastify-api-key`](https://github.com/arkerone/fastify-api-key) · [md](https://raw.githubusercontent.com/arkerone/fastify-api-key/HEAD/README.md) | Autenticação por chave de API e assinatura — ⚠ parado desde 2022-08 |
| [`fastify-auth0-verify`](https://github.com/nearform/fastify-auth0-verify) · [md](https://raw.githubusercontent.com/nearform/fastify-auth0-verify/HEAD/README.md) | Verificação de token do Auth0 |
| [`fastify-bcrypt`](https://github.com/beliven-it/fastify-bcrypt) · [md](https://raw.githubusercontent.com/beliven-it/fastify-bcrypt/HEAD/README.md) | Gera e confere hash de senha com bcrypt — ⚠ arquivado |
| [`fastify-casbin`](https://github.com/nearform/fastify-casbin) · [md](https://raw.githubusercontent.com/nearform/fastify-casbin/HEAD/README.md) | Autorização por política do Casbin |
| [`fastify-casbin-rest`](https://github.com/nearform/fastify-casbin-rest) · [md](https://raw.githubusercontent.com/nearform/fastify-casbin-rest/HEAD/README.md) | Casbin com modelo RESTful |
| [`fastify-casl`](https://github.com/Inlecom/fastify-casl) · [md](https://raw.githubusercontent.com/Inlecom/fastify-casl/HEAD/README.md) | Proteção de rota por CASL, com filtro de entrada e de saída — ⚠ parado desde 2022-12 |
| [`fastify-cloudflare-turnstile`](https://github.com/112RG/fastify-cloudflare-turnstile) · [md](https://raw.githubusercontent.com/112RG/fastify-cloudflare-turnstile/HEAD/README.md) | Verificação de captcha do Cloudflare Turnstile |
| [`fastify-esso`](https://github.com/patrickpissurno/fastify-esso) · [md](https://raw.githubusercontent.com/patrickpissurno/fastify-esso/HEAD/README.md) | Autenticação simples, com single sign-on embutido |
| [`fastify-grant`](https://github.com/simov/fastify-grant) · [md](https://raw.githubusercontent.com/simov/fastify-grant/HEAD/README.md) | Autenticação por mais de duzentos provedores OAuth — ⚠ parado desde 2020-11 |
| [`fastify-guard`](https://github.com/hsynlms/fastify-guard) · [md](https://raw.githubusercontent.com/hsynlms/fastify-guard/HEAD/README.md) | Protege endpoint conferindo papel e escopo do usuário autenticado |
| [`fastify-jwt-authz`](https://github.com/Ethan-Arrowood/fastify-jwt-authz) · [md](https://raw.githubusercontent.com/Ethan-Arrowood/fastify-jwt-authz/HEAD/README.md) | Confere escopo dentro do JWT — ⚠ parado desde 2018-03 |
| [`fastify-jwt-webapp`](https://github.com/charlesread/fastify-jwt-webapp) · [md](https://raw.githubusercontent.com/charlesread/fastify-jwt-webapp/HEAD/README.md) | JWT para aplicação web, e não para API — ⚠ parado desde 2022-12 |
| [`fastify-keycloak-adapter`](https://github.com/yubinTW/fastify-keycloak-adapter) · [md](https://raw.githubusercontent.com/yubinTW/fastify-keycloak-adapter/HEAD/README.md) | Adaptador do Keycloak |
| [`fastify-next-auth`](https://github.com/wobsoriano/fastify-next-auth) · [md](https://raw.githubusercontent.com/wobsoriano/fastify-next-auth/HEAD/README.md) | NextAuth.js como plugin — ⚠ parado desde 2023-08 |
| [`fastify-opaque-apake`](https://github.com/squirrelchat/fastify-opaque-apake) · [md](https://raw.githubusercontent.com/squirrelchat/fastify-opaque-apake/HEAD/README.md) | Protocolo aPAKE OPAQUE, para autenticação sem enviar senha — ⚠ parado desde 2023-04 |
| [`fastify-permissions`](https://github.com/pckrishnadas88/fastify-permissions) · [md](https://raw.githubusercontent.com/pckrishnadas88/fastify-permissions/HEAD/readme.md) | Permissão por rota, com verificação própria |
| [`fastify-rbac`](https://gitlab.com/m03geek/fastify-rbac) · [md](https://gitlab.com/m03geek/fastify-rbac/-/raw/HEAD/README.md) | Controle de acesso por papel — ⚠ parado desde 2023-06 |
| [`fastify-recaptcha`](https://github.com/qwertyforce/fastify-recaptcha) · [md](https://raw.githubusercontent.com/qwertyforce/fastify-recaptcha/HEAD/README.md) | Verificação do reCAPTCHA — ⚠ parado desde 2023-11 |
| [`fastify-totp`](https://github.com/beliven-it/fastify-totp) · [md](https://raw.githubusercontent.com/beliven-it/fastify-totp/HEAD/README.md) | TOTP, para segundo fator — ⚠ arquivado |

### Sessão

| Plugin | O que resolve |
| --- | --- |
| [`@mgcrea/fastify-session`](https://github.com/mgcrea/fastify-session) · [md](https://raw.githubusercontent.com/mgcrea/fastify-session/HEAD/README.md) | Sessão com e sem estado |
| [`@mgcrea/fastify-session-redis-store`](https://github.com/mgcrea/fastify-session-redis-store) · [md](https://raw.githubusercontent.com/mgcrea/fastify-session-redis-store/HEAD/README.md) | Armazenamento em Redis para o `@mgcrea/fastify-session`, via ioredis — ⚠ parado desde 2023-12 |
| [`@mgcrea/fastify-session-sodium-crypto`](https://github.com/mgcrea/fastify-session-sodium-crypto) · [md](https://raw.githubusercontent.com/mgcrea/fastify-session-sodium-crypto/HEAD/README.md) | Criptografia de sessão com libsodium — ⚠ parado desde 2024-04 |
| [`fastify-good-sessions`](https://github.com/Phara0h/fastify-good-sessions) · [md](https://raw.githubusercontent.com/Phara0h/fastify-good-sessions/HEAD/README.md) | Sessão com foco em velocidade — ⚠ parado desde 2021-11 |
| [`fastify-redis-session`](https://github.com/mohammadraufzahed/fastify-redis-session) · [md](https://raw.githubusercontent.com/mohammadraufzahed/fastify-redis-session/HEAD/README.md) | Sessão em Redis |
| [`fastify-server-session`](https://github.com/jsumners/fastify-server-session) · [md](https://raw.githubusercontent.com/jsumners/fastify-server-session/HEAD/Readme.md) | Sessão com cache de apoio configurável — ⚠ parado desde 2021-09 |

### Banco de dados e ORM

| Plugin | O que resolve |
| --- | --- |
| [`@aaroncadillac/crudify-mongo`](https://github.com/aaroncadillac/crudify-mongo) · [md](https://raw.githubusercontent.com/aaroncadillac/crudify-mongo/HEAD/README.md) | CRUD pronto sobre uma coleção do MongoDB |
| [`@exortek/fastify-mongo-sanitize`](https://github.com/ExorTek/fastify-mongo-sanitize) · [md](https://raw.githubusercontent.com/ExorTek/fastify-mongo-sanitize/HEAD/README.md) | Sanitiza a entrada contra injeção em consulta NoSQL |
| [`@inaiat/fastify-papr`](https://github.com/inaiat/fastify-papr) · [md](https://raw.githubusercontent.com/inaiat/fastify-papr/HEAD/README.md) | Integração com o Papr, ORM de MongoDB para TypeScript |
| [`@zrosenbauer/fastify-prisma`](https://github.com/zrosenbauer/fastify-prisma) · [md](https://raw.githubusercontent.com/zrosenbauer/fastify-prisma/HEAD/README.md) | Expõe um `PrismaClient` já instanciado na instância |
| [`fast-water`](https://github.com/tswayne/fast-water) · [md](https://raw.githubusercontent.com/tswayne/fast-water/HEAD/README.md) | Modelos do Waterline como decorator da instância — ⚠ parado desde 2022-12 |
| [`fastify-at-mysql`](https://github.com/mateonunez/fastify-at-mysql) · [md](https://raw.githubusercontent.com/mateonunez/fastify-at-mysql/HEAD/README.md) | MySQL com prevenção automática de injeção de SQL |
| [`fastify-at-postgres`](https://github.com/mateonunez/fastify-at-postgres) · [md](https://raw.githubusercontent.com/mateonunez/fastify-at-postgres/HEAD/README.md) | Postgres com prevenção automática de injeção de SQL — ⚠ parado desde 2024-02 |
| [`fastify-better-sqlite3`](https://github.com/punkish/fastify-better-sqlite3) · [md](https://raw.githubusercontent.com/punkish/fastify-better-sqlite3/HEAD/README.md) | SQLite pelo `better-sqlite3` |
| [`fastify-bookshelf`](https://github.com/butlerx/fastify-bookshelfjs) · [md](https://raw.githubusercontent.com/butlerx/fastify-bookshelfjs/HEAD/README.md) | ORM Bookshelf.js |
| [`fastify-cockroachdb`](https://github.com/alex-ppg/fastify-cockroachdb) · [md](https://raw.githubusercontent.com/alex-ppg/fastify-cockroachdb/HEAD/README.md) | CockroachDB pelo Sequelize — ⚠ parado desde 2018-12 |
| [`fastify-couchdb`](https://github.com/nigelhanlon/fastify-couchdb) · [md](https://raw.githubusercontent.com/nigelhanlon/fastify-couchdb/HEAD/README.md) | CouchDB pelo nano — ⚠ parado desde 2023-06 |
| [`fastify-dynamodb`](https://github.com/matrus2/fastify-dynamodb) · [md](https://raw.githubusercontent.com/matrus2/fastify-dynamodb/HEAD/README.md) | Cliente de documento do AWS DynamoDB — ⚠ parado desde 2023-03 |
| [`fastify-hana`](https://github.com/yoav0gal/fastify-hana) · [md](https://raw.githubusercontent.com/yoav0gal/fastify-hana/HEAD/README.md) | Conexão com o SAP HANA — ⚠ parado desde 2024-01 |
| [`fastify-influxdb`](https://github.com/alex-ppg/fastify-influxdb) · [md](https://raw.githubusercontent.com/alex-ppg/fastify-influxdb/HEAD/README.md) | Conexão com o InfluxDB — ⚠ parado desde 2019-02 |
| [`fastify-kysely`](https://github.com/alenap93/fastify-kysely) · [md](https://raw.githubusercontent.com/alenap93/fastify-kysely/HEAD/README.md) | Construtor de consulta tipado Kysely |
| [`fastify-lured`](https://github.com/lependu/fastify-lured) · [md](https://raw.githubusercontent.com/lependu/fastify-lured/HEAD/README.md) | Carrega script Lua com o `@fastify/redis` e o lured — ⚠ parado desde 2023-06 |
| [`fastify-mongodb-sanitizer`](https://github.com/KlemenKozelj/fastify-mongodb-sanitizer) · [md](https://raw.githubusercontent.com/KlemenKozelj/fastify-mongodb-sanitizer/HEAD/README.md) | Sanitiza a entrada contra injeção em consulta do MongoDB |
| [`fastify-mongoose-api`](https://github.com/jeka911/fastify-mongoose-api) · [md](https://raw.githubusercontent.com/jeka-kiselyov/fastify-mongoose-api/HEAD/README.md) | Gera rotas REST a partir dos modelos do Mongoose |
| [`fastify-mongoose-driver`](https://github.com/alex-ppg/fastify-mongoose) · [md](https://raw.githubusercontent.com/alex-ppg/fastify-mongoose/HEAD/README.md) | Conexão por Mongoose, com suporte a modelo — ⚠ parado desde 2023-08 |
| [`fastify-objectionjs-classes`](https://github.com/kamikazechaser/fastify-objectionjs-classes) · [md](https://raw.githubusercontent.com/kamikazechaser/fastify-objectionjs-classes/HEAD/README.md) | Seleciona classes do ORM Objection.js — ⚠ parado desde 2023-01 |
| [`fastify-oracle`](https://github.com/cemremengu/fastify-oracle) · [md](https://raw.githubusercontent.com/cemremengu/fastify-oracle/HEAD/README.md) | Pool de conexão do Oracle pelo `oracledb` — ⚠ parado desde 2020-05 |
| [`fastify-orama`](https://github.com/mateonunez/fastify-orama) · [md](https://raw.githubusercontent.com/mateonunez/fastify-orama/HEAD/README.md) | Busca full-text em processo, pelo Orama |
| [`fastify-postgraphile`](https://github.com/alemagio/fastify-postgraphile) · [md](https://raw.githubusercontent.com/alemagio/fastify-postgraphile/HEAD/README.md) | PostGraphile integrado — ⚠ parado desde 2021-06 |
| [`fastify-postgres-dot-js`](https://github.com/kylerush/fastify-postgresjs) · [md](https://raw.githubusercontent.com/kylerush/fastify-postgresjs/HEAD/README.md) | Postgres pelo `postgres.js` — ⚠ parado desde 2023-03 |
| [`fastify-ravendb`](https://github.com/nearform/fastify-ravendb) · [md](https://raw.githubusercontent.com/nearform/fastify-ravendb/HEAD/README.md) | `DocumentStore` do RavenDB compartilhado |
| [`fastify-sequelize`](https://github.com/lyquocnam/fastify-sequelize) · [md](https://raw.githubusercontent.com/lyquocnam/fastify-sequelize/HEAD/README.md) | ORM Sequelize — ⚠ parado desde 2022-08 |
| [`fastify-sqlite`](https://github.com/Eomm/fastify-sqlite) · [md](https://raw.githubusercontent.com/Eomm/fastify-sqlite/HEAD/README.md) | Conexão com SQLite — ⚠ parado desde 2024-01 |
| [`fastify-sqlite-typed`](https://github.com/yoav0gal/fastify-sqlite-typed) · [md](https://raw.githubusercontent.com/yoav0gal/fastify-sqlite-typed/HEAD/README.md) | SQLite com tipagem TypeScript |
| [`fastify-typeorm-plugin`](https://github.com/inthepocket/fastify-typeorm-plugin) · [md](https://raw.githubusercontent.com/inthepocket/fastify-typeorm-plugin/HEAD/README.md) | ORM TypeORM — ⚠ arquivado |
| [`sequelize-fastify`](https://github.com/hsynlms/sequelize-fastify) · [md](https://raw.githubusercontent.com/hsynlms/sequelize-fastify/HEAD/README.md) | Sequelize, em versão leve — ⚠ parado desde 2024-05 |

### Fila, mensageria e trabalho assíncrono

| Plugin | O que resolve |
| --- | --- |
| [`@glidemq/fastify`](https://github.com/avifenesh/glidemq-fastify) · [md](https://raw.githubusercontent.com/avifenesh/glidemq-fastify/HEAD/README.md) | Fila sobre Valkey/Redis Streams, com REST, SSE e modo de teste em memória |
| [`fastify-amqp`](https://github.com/RafaelGSS/fastify-amqp) · [md](https://raw.githubusercontent.com/RafaelGSS/fastify-amqp/HEAD/README.md) | Conexão AMQP (RabbitMQ) por `amqplib` — ⚠ parado desde 2023-11 |
| [`fastify-amqp-async`](https://github.com/kffl/fastify-amqp-async) · [md](https://raw.githubusercontent.com/kffl/fastify-amqp-async/HEAD/README.md) | AMQP com API baseada em promessa — ⚠ parado desde 2023-11 |
| [`fastify-aws-sns`](https://github.com/gzileni/fastify-aws-sns) · [md](https://raw.githubusercontent.com/gzileni/fastify-aws-sns/HEAD/README.md) | Publicação de mensagem no AWS SNS — ⚠ parado desde 2022-10 |
| [`fastify-bree`](https://github.com/climba03003/fastify-bree) · [md](https://raw.githubusercontent.com/climba03003/fastify-bree/HEAD/README.md) | Tarefa agendada com o Bree — ⚠ parado desde 2024-05 |
| [`fastify-event-bus`](https://github.com/Shiva127/fastify-event-bus) · [md](https://raw.githubusercontent.com/Shiva127/fastify-event-bus/HEAD/README.md) | Barramento de evento sobre o `js-event-bus` — ⚠ parado desde 2023-10 |
| [`fastify-hemera`](https://github.com/hemerajs/fastify-hemera) · [md](https://raw.githubusercontent.com/hemerajs/fastify-hemera/HEAD/README.md) | Microsserviço tolerante a falha sobre NATS, pelo Hemera — ⚠ parado desde 2023-01 |
| [`fastify-kafkajs`](https://github.com/kffl/fastify-kafkajs) · [md](https://raw.githubusercontent.com/kffl/fastify-kafkajs/HEAD/README.md) | Kafka pelo KafkaJS — ⚠ parado desde 2023-09 |
| [`fastify-mqtt`](https://github.com/love-lena/fastify-mqtt) · [md](https://raw.githubusercontent.com/love-lena/fastify-mqtt/HEAD/README.md) | Cliente MQTT compartilhado — ⚠ parado desde 2022-03 |
| [`fastify-piscina`](https://github.com/piscinajs/fastify-piscina) · [md](https://raw.githubusercontent.com/piscinajs/fastify-piscina/HEAD/README.md) | Pool de worker thread pelo Piscina |
| [`fastify-rabbitmq`](https://github.com/Bugs5382/fastify-rabbitmq) · [md](https://raw.githubusercontent.com/Bugs5382/fastify-rabbitmq/HEAD/README.md) | RabbitMQ pelo `node-rabbitmq-client` |
| [`fastify-redis-channels`](https://github.com/hearit-io/fastify-redis-channels) · [md](https://raw.githubusercontent.com/hearit-io/fastify-redis-channels/HEAD/README.md) | Canal sobre Redis Streams — ⚠ parado desde 2024-06 |
| [`fastify-wamp-router`](https://github.com/lependu/fastify-wamp-router) · [md](https://raw.githubusercontent.com/lependu/fastify-wamp-router/HEAD/README.md) | Roteador do protocolo WAMP — ⚠ parado desde 2020-05 |
| [`pubsub-http-handler`](https://github.com/simenandre/pubsub-http-handler) · [md](https://raw.githubusercontent.com/simenandre/pubsub-http-handler/HEAD/README.md) | Endpoint de Google Cloud Pub/Sub |

### Contrato de API: OpenAPI e tipo

| Plugin | O que resolve |
| --- | --- |
| [`@coobaha/typed-fastify`](https://github.com/Coobaha/typed-fastify) · [md](https://raw.githubusercontent.com/Coobaha/typed-fastify/HEAD/README.md) | Rota tipada com validação em runtime a partir do tipo TypeScript |
| [`@eropple/fastify-openapi3`](https://github.com/eropple/fastify-openapi3) · [md](https://raw.githubusercontent.com/eropple/fastify-openapi3/HEAD/README.md) | Especificação OpenAPI 3.1 e explorador de doc a partir das rotas |
| [`@hey-api/openapi-ts`](https://heyapi.dev/docs/openapi/typescript/plugins/fastify) | Gera cliente, SDK e validador TypeScript a partir de um documento OpenAPI |
| [`@scalar/fastify-api-reference`](https://github.com/scalar/scalar/tree/main/integrations/fastify) · [md](https://raw.githubusercontent.com/scalar/scalar/main/integrations/fastify/README.md) | Referência de API navegável a partir do documento OpenAPI |
| [`elements-fastify`](https://github.com/rohitsoni1010/elements-fastify) · [md](https://raw.githubusercontent.com/rohitsoni007/elements-fastify/HEAD/README.md) | Documentação de API com o Stoplight Elements |
| [`fastify-oas`](https://gitlab.com/m03geek/fastify-oas) · [md](https://gitlab.com/m03geek/fastify-oas/-/raw/HEAD/README.md) | Gera documento OpenAPI 3.0+ a partir do schema das rotas |
| [`fastify-openapi-docs`](https://github.com/ShogunPanda/fastify-openapi-docs) · [md](https://raw.githubusercontent.com/ShogunPanda/fastify-openapi-docs/HEAD/README.md) | Gera a especificação OpenAPI automaticamente |
| [`fastify-openapi-glue`](https://github.com/seriousme/fastify-openapi-glue) · [md](https://raw.githubusercontent.com/seriousme/fastify-openapi-glue/HEAD/README.md) | Gera as rotas a partir de uma especificação OpenAPI |
| [`fastify-schema-to-typescript`](https://github.com/thomasthiebaud/fastify-schema-to-typescript) · [md](https://raw.githubusercontent.com/thomasthiebaud/fastify-schema-to-typescript/HEAD/README.md) | Gera tipo TypeScript a partir do schema de validação |
| [`http-wizard`](https://github.com/flodlc/http-wizard) · [md](https://raw.githubusercontent.com/flodlc/http-wizard/HEAD/README.md) | Exporta cliente TypeScript da API, com tipo de ponta a ponta — ⚠ parado desde 2024-03 |
| [`oas-fastify`](https://github.com/ahmadnassri/node-oas-fastify) · [md](https://raw.githubusercontent.com/ahmadnassri/node-oas-fastify/HEAD/README.md) | Gera handler e validação a partir de OAS 3.x |
| [`openapi-validator-middleware`](https://github.com/PayU/openapi-validator-middleware) · [md](https://raw.githubusercontent.com/PayU/openapi-validator-middleware/HEAD/README.md) | Valida a requisição contra a especificação Swagger ou OpenAPI 3.0 |

### Schema e validação

| Plugin | O que resolve |
| --- | --- |
| [`fastify-ata`](https://github.com/ata-core/fastify-ata) · [md](https://raw.githubusercontent.com/ata-core/fastify-ata/HEAD/README.md) | Troca o validador de JSON Schema pelo `ata-validator`, mantendo o formato de erro |
| [`fastify-no-additional-properties`](https://github.com/greguz/fastify-no-additional-properties) · [md](https://raw.githubusercontent.com/greguz/fastify-no-additional-properties/HEAD/README.md) | Põe `additionalProperties: false` por padrão nos schemas |
| [`fastify-param-schema-validation`](https://github.com/Player1205/fastify-param-schema-validation) · [md](https://raw.githubusercontent.com/Player1205/fastify-param-schema-validation/HEAD/README.md) | Cobra que todo parâmetro de rota esteja no schema |
| [`fastify-qs`](https://github.com/vanodevium/fastify-qs) · [md](https://raw.githubusercontent.com/vanodevium/fastify-qs/HEAD/README.MD) | Interpreta query string aninhada com o qs — ⚠ parado desde 2024-10 |
| [`fastify-raw-body`](https://github.com/Eomm/fastify-raw-body) · [md](https://raw.githubusercontent.com/Eomm/fastify-raw-body/HEAD/README.md) | Acrescenta `request.rawBody` |
| [`fastify-schema-constraint`](https://github.com/Eomm/fastify-schema-constraint) · [md](https://raw.githubusercontent.com/Eomm/fastify-schema-constraint/HEAD/README.md) | Escolhe o schema conforme o parâmetro da requisição |
| [`fastify-shared-schema`](https://github.com/Adibla/fastify-shared-schema) · [md](https://raw.githubusercontent.com/Adibla/fastify-shared-schema/HEAD/README.md) | Compartilha schema entre rotas — ⚠ parado desde 2023-02 |
| [`fastify-split-validator`](https://github.com/MetCoder95/fastify-split-validator) · [md](https://raw.githubusercontent.com/MetCoder95/fastify-split-validator/HEAD/README.md) | Um validador diferente por parte da requisição |
| [`fastify-type-provider-effect-schema`](https://github.com/daotl/fastify-type-provider-effect-schema) · [md](https://raw.githubusercontent.com/daotl/fastify-type-provider-effect-schema/HEAD/README.md) | Type provider do `@effect/schema` |

### Log, métrica e rastreio

| Plugin | O que resolve |
| --- | --- |
| [`@attaryz/fastify-devtools`](https://github.com/attaryz/fastify-devtools) · [md](https://raw.githubusercontent.com/attaryz/fastify-devtools/HEAD/README.md) | Painel de requisição ao vivo, replay e métrica em desenvolvimento |
| [`@dnlup/fastify-doc`](https://github.com/dnlup/fastify-doc) · [md](https://raw.githubusercontent.com/dnlup/fastify-doc/HEAD/README.md) | Amostragem de métrica do processo — ⚠ parado desde 2023-11 |
| [`@immobiliarelabs/fastify-metrics`](https://github.com/immobiliare/fastify-metrics) · [md](https://raw.githubusercontent.com/immobiliare/fastify-metrics/HEAD/README.md) | Métrica de uso e de processo despachada para statsd |
| [`@mgcrea/fastify-request-logger`](https://github.com/mgcrea/fastify-request-logger) · [md](https://raw.githubusercontent.com/mgcrea/fastify-request-logger/HEAD/README.md) | Log de requisição em formato compacto |
| [`@mgcrea/pino-pretty-compact`](https://github.com/mgcrea/pino-pretty-compact) · [md](https://raw.githubusercontent.com/mgcrea/pino-pretty-compact/HEAD/README.md) | Formatador compacto para o Pino |
| [`apitally`](https://github.com/apitally/apitally-js) · [md](https://raw.githubusercontent.com/apitally/apitally-js/HEAD/README.md) | Integração com o Apitally: análise, log e monitoração de API |
| [`aws-xray-sdk-fastify`](https://github.com/aws/aws-xray-sdk-node/tree/master/sdk_contrib/fastify) · [md](https://raw.githubusercontent.com/aws/aws-xray-sdk-node/master/sdk_contrib/fastify/README.md) | Rastreio de requisição e subsegmento no AWS X-Ray |
| [`cls-rtracer`](https://github.com/puzpuzpuz/cls-rtracer) · [md](https://raw.githubusercontent.com/puzpuzpuz/cls-rtracer/HEAD/README.md) | Id de requisição por CLS, para amarrar as linhas de log |
| [`fastify-asyncforge`](https://github.com/mcollina/fastify-asyncforge) · [md](https://raw.githubusercontent.com/mcollina/fastify-asyncforge/HEAD/README.md) | Alcança instância, log, requisição e resposta pelo AsyncLocalStorage — ⚠ parado desde 2024-05 |
| [`fastify-blipp`](https://github.com/PavloPoliakov/fastify-blipp) · [md](https://raw.githubusercontent.com/PavelPolyakov/fastify-blipp/HEAD/README.md) | Imprime no console as rotas registradas |
| [`fastify-bugsnag`](https://github.com/ZigaStrgar/fastify-bugsnag) · [md](https://raw.githubusercontent.com/ZigaStrgar/fastify-bugsnag/HEAD/README.md) | Envio de erro para o Bugsnag |
| [`fastify-cloudevents`](https://github.com/smartiniOnGitHub/fastify-cloudevents) · [md](https://raw.githubusercontent.com/smartiniOnGitHub/fastify-cloudevents/HEAD/README.md) | Emite os eventos do Fastify no formato CloudEvents |
| [`fastify-gcloud-trace`](https://github.com/mkinoshi/fastify-gcloud-trace) · [md](https://raw.githubusercontent.com/mkinoshi/fastify-gcloud-trace/HEAD/README.md) | Rastreio pelo Google Cloud Trace — ⚠ parado desde 2020-09 |
| [`fastify-http-context`](https://github.com/thorough-developer/fastify-http-context) · [md](https://raw.githubusercontent.com/thorough-developer/fastify-http-context/HEAD/README.md) | Contexto por requisição, como se fosse variável de thread — ⚠ parado desde 2023-01 |
| [`fastify-impressions`](https://github.com/manju4ever/fastify-impressions) · [md](https://raw.githubusercontent.com/manju4ever/fastify-impressions/HEAD/README.md) | Contabiliza acesso de todas as rotas — ⚠ parado desde 2022-03 |
| [`fastify-ip`](https://github.com/metcoder95/fastify-ip) · [md](https://raw.githubusercontent.com/metcoder95/fastify-ip/HEAD/README.md) | Deriva o id da requisição a partir de cabeçalhos escolhidos |
| [`fastify-list-routes`](https://github.com/chuongtrh/fastify-list-routes) · [md](https://raw.githubusercontent.com/chuongtrh/fastify-list-routes/HEAD/README.md) | Lista as rotas disponíveis |
| [`fastify-log-controller`](https://github.com/Eomm/fastify-log-controller) · [md](https://raw.githubusercontent.com/Eomm/fastify-log-controller/HEAD/README.md) | Muda o nível de log do servidor em tempo de execução |
| [`fastify-metrics`](https://gitlab.com/m03geek/fastify-metrics) · [md](https://gitlab.com/m03geek/fastify-metrics/-/raw/HEAD/README.md) | Exporta métrica no formato Prometheus — ⚠ parado desde 2022-11 |
| [`fastify-opentelemetry`](https://github.com/autotelic/fastify-opentelemetry) · [md](https://raw.githubusercontent.com/autotelic/fastify-opentelemetry/HEAD/README.md) | Rastreio de requisição pela API do OpenTelemetry |
| [`fastify-print-routes`](https://github.com/ShogunPanda/fastify-print-routes) · [md](https://raw.githubusercontent.com/ShogunPanda/fastify-print-routes/HEAD/README.md) | Imprime as rotas disponíveis |
| [`fastify-response-time`](https://github.com/lolo32/fastify-response-time) · [md](https://raw.githubusercontent.com/lolo32/fastify-response-time/HEAD/README.md) | Cabeçalho `X-Response-Time` em milissegundos |
| [`fastify-sentry`](https://github.com/alex-ppg/fastify-sentry) · [md](https://raw.githubusercontent.com/alex-ppg/fastify-sentry/HEAD/README.md) | Envio de erro para o Sentry — ⚠ parado desde 2022-12 |
| [`nstats`](https://github.com/Phara0h/nstats) · [md](https://raw.githubusercontent.com/Phara0h/nstats/HEAD/README.md) | Estatística de rede e de processo, compatível com Prometheus |

### Saúde, ciclo de vida e resiliência

| Plugin | O que resolve |
| --- | --- |
| [`@dnlup/fastify-traps`](https://github.com/dnlup/fastify-traps) · [md](https://raw.githubusercontent.com/dnlup/fastify-traps/HEAD/README.md) | Desligamento gracioso em `SIGINT` e `SIGTERM` |
| [`@gquittet/graceful-server`](https://github.com/gquittet/graceful-server) · [md](https://raw.githubusercontent.com/gquittet/graceful-server/HEAD/README.md) | Desligamento gracioso minúsculo e sem dependência |
| [`@mgcrea/fastify-graceful-exit`](https://github.com/mgcrea/fastify-graceful-exit) · [md](https://raw.githubusercontent.com/mgcrea/fastify-graceful-exit/HEAD/README.md) | Desligamento gracioso do servidor |
| [`arecibo`](https://github.com/ducktors/arecibo) · [md](https://raw.githubusercontent.com/ducktors/arecibo/HEAD/README.md) | Rota de resposta a probe de liveness e readiness do Kubernetes |
| [`fastify-custom-healthcheck`](https://github.com/gkampitakis/fastify-custom-healthcheck) · [md](https://raw.githubusercontent.com/gkampitakis/fastify-custom-healthcheck/HEAD/README.md) | Rota de saúde que roda verificações próprias |
| [`fastify-delay-request`](https://github.com/climba03003/fastify-delay-request) · [md](https://raw.githubusercontent.com/climba03003/fastify-delay-request/HEAD/README.md) | Segura a requisição enquanto uma tarefa cara não termina — ⚠ parado desde 2023-05 |
| [`fastify-graceful-shutdown`](https://github.com/hemerajs/fastify-graceful-shutdown) · [md](https://raw.githubusercontent.com/hemerajs/fastify-graceful-shutdown/HEAD/README.md) | Desligamento gracioso e assíncrono |
| [`fastify-healthcheck`](https://github.com/smartiniOnGitHub/fastify-healthcheck) · [md](https://raw.githubusercontent.com/smartiniOnGitHub/fastify-healthcheck/HEAD/README.md) | Rota de saúde e script de probe |
| [`fastify-kubernetes`](https://github.com/greguz/fastify-kubernetes) · [md](https://raw.githubusercontent.com/greguz/fastify-kubernetes/HEAD/README.md) | Cliente da API do Kubernetes |
| [`fastify-override`](https://github.com/matthyk/fastify-override) · [md](https://raw.githubusercontent.com/matthyk/fastify-override/HEAD/README.md) | Substitui decorator, plugin e hook — para teste |
| [`fastify-racing`](https://github.com/metcoder95/fastify-racing) · [md](https://raw.githubusercontent.com/metcoder95/fastify-racing/HEAD/README.md) | Trata requisição abortada de forma assíncrona |
| [`fastify-slow-down`](https://github.com/nearform/fastify-slow-down) · [md](https://raw.githubusercontent.com/nearform/fastify-slow-down/HEAD/README.md) | Atrasa a resposta do servidor |

### Rota: organização e carregamento

| Plugin | O que resolve |
| --- | --- |
| [`@jerome1337/fastify-enforce-routes-pattern`](https://github.com/Jerome1337/fastify-enforce-routes-pattern) · [md](https://raw.githubusercontent.com/Jerome1337/fastify-enforce-routes-pattern/HEAD/README.md) | Cobra um padrão de nome no caminho das rotas |
| [`@pybot/fastify-autoload`](https://github.com/kunal097/fastify-autoload) · [md](https://raw.githubusercontent.com/kunal097/fastify-autoload/HEAD/README.md) | Gera rotas automaticamente a partir de um conteúdo JSON válido — ⚠ parado desde 2024-09 |
| [`@thecodepace/fastify-http-query`](https://github.com/TheCodePace/fastify-http-query) · [md](https://raw.githubusercontent.com/TheCodePace/fastify-http-query/HEAD/README.md) | Habilita o método HTTP `QUERY` — seguro, idempotente e com corpo |
| [`fastify-204`](https://github.com/Shiva127/fastify-204) · [md](https://raw.githubusercontent.com/Shiva127/fastify-204/HEAD/README.md) | Responde 204 quando o corpo sai vazio |
| [`fastify-405`](https://github.com/Eomm/fastify-405) · [md](https://raw.githubusercontent.com/Eomm/fastify-405/HEAD/README.md) | Acrescenta 405 às rotas cujo método não existe |
| [`fastify-allow`](https://github.com/mattbishop/fastify-allow) · [md](https://raw.githubusercontent.com/mattbishop/fastify-allow/HEAD/README.md) | Cabeçalho `Allow` automático, e 405 no método que a rota não tem |
| [`fastify-autoroutes`](https://github.com/GiovanniCardamone/fastify-autoroutes) · [md](https://raw.githubusercontent.com/GiovanniCardamone/fastify-autoroutes/HEAD/README.md) | Carrega rotas varrendo um diretório — ⚠ parado desde 2023-03 |
| [`fastify-constraints`](https://github.com/nearform/fastify-constraints) · [md](https://raw.githubusercontent.com/nearform/fastify-constraints/HEAD/README.md) | Aplica constraint a várias rotas de uma vez |
| [`fastify-crud-generator`](https://github.com/beliven-it/fastify-crud-generator) · [md](https://raw.githubusercontent.com/beliven-it/fastify-crud-generator/HEAD/README.md) | Gera as rotas de CRUD de uma entidade — ⚠ arquivado |
| [`fastify-decorators`](https://github.com/L2jLiga/fastify-decorators) · [md](https://raw.githubusercontent.com/L2jLiga/fastify-decorators/HEAD/README.md) | Conjunto de decorators TypeScript para controller e serviço |
| [`fastify-dynareg`](https://github.com/greguz/fastify-dynareg) · [md](https://raw.githubusercontent.com/greguz/fastify-dynareg/HEAD/README.md) | Registro dinâmico de plugin — ⚠ arquivado |
| [`fastify-explorer`](https://github.com/Eomm/fastify-explorer) · [md](https://raw.githubusercontent.com/Eomm/fastify-explorer/HEAD/README.md) | Inspeciona decorators através dos contextos encapsulados — ⚠ arquivado |
| [`fastify-file-router`](https://github.com/bhouston/fastify-file-router) · [md](https://raw.githubusercontent.com/bhouston/fastify-file-router/HEAD/README.md) | Roteamento por arquivo no estilo TanStack Start e Next.js, com schema JSON e Zod |
| [`fastify-file-routes`](https://github.com/spa5k/fastify-file-routes) · [md](https://raw.githubusercontent.com/spa5k/fastify-file-routes/HEAD/README.md) | Roteamento por sistema de arquivos no estilo Next.js — ⚠ arquivado |
| [`fastify-get-head`](https://github.com/MetCoder95/fastify-get-head) · [md](https://raw.githubusercontent.com/MetCoder95/fastify-get-head/HEAD/README.md) | Cria a rota `HEAD` correspondente a cada `GET` já registrado — ⚠ parado desde 2023-08 |
| [`fastify-get-only`](https://github.com/DanieleFedeli/fastify-get-only) · [md](https://raw.githubusercontent.com/DanieleFedeli/fastify-get-only/HEAD/README.md) | Faz o servidor aceitar só requisição `GET` — ⚠ parado desde 2021-12 |
| [`fastify-loader`](https://github.com/TheNoim/fastify-loader) · [md](https://raw.githubusercontent.com/TheNoim/fastify-loader/HEAD/Readme.md) | Carrega rotas de um diretório, injetando a instância em cada arquivo — ⚠ parado desde 2023-01 |
| [`fastify-method-override`](https://github.com/corsicanec82/fastify-method-override) · [md](https://raw.githubusercontent.com/corsicanec82/fastify-method-override/HEAD/README.md) | Aceita `DELETE`, `PATCH`, `PUT` e `OPTIONS` de cliente que não os suporta — ⚠ parado desde 2023-02 |
| [`fastify-now`](https://github.com/yonathan06/fastify-now) · [md](https://raw.githubusercontent.com/yonathan06/fastify-now/HEAD/README.md) | Carrega endpoint de uma pasta, dinamicamente — ⚠ parado desde 2024-10 |
| [`fastify-register-routes`](https://github.com/israeleriston/fastify-register-routes) · [md](https://raw.githubusercontent.com/israeleriston/fastify-register-routes/HEAD/README.md) | Carrega rotas de um caminho, com filtro por expressão regular — ⚠ parado desde 2018-05 |
| [`fastify-resty`](https://github.com/FastifyResty/fastify-resty) · [md](https://raw.githubusercontent.com/FastifyResty/fastify-resty/HEAD/README.md) | Framework sobre o Fastify, com REST gerado de entidades do TypeORM |
| [`fastify-reverse-routes`](https://github.com/dimonnwc3/fastify-reverse-routes) · [md](https://raw.githubusercontent.com/dimonnwc3/fastify-reverse-routes/HEAD/README.md) | Rota nomeada, e caminho construído pelo nome — ⚠ parado desde 2023-03 |
| [`fastify-route-group`](https://github.com/TakNePoidet/fastify-route-group) · [md](https://raw.githubusercontent.com/TakNePoidet/fastify-route-group/HEAD/README.md) | Agrupamento e herança de rota — ⚠ parado desde 2023-09 |
| [`fastify-route-preset`](https://github.com/inyourtime/fastify-route-preset) · [md](https://raw.githubusercontent.com/inyourtime/fastify-route-preset/HEAD/README.md) | Configuração de rota reaproveitada por várias rotas |

### Corpo, upload e formato de resposta

| Plugin | O que resolve |
| --- | --- |
| [`@pompelmi/fastify-plugin`](https://github.com/pompelmi/pompelmi/tree/HEAD/packages/fastify) · [md](https://raw.githubusercontent.com/pompelmi/pompelmi/HEAD/packages/fastify/README.md) | Varredura de upload no processo: tipo real por magic byte, bomba de zip, teto de tamanho e YARA |
| [`fastify-formidable`](https://github.com/climba03003/fastify-formidable) · [md](https://raw.githubusercontent.com/climba03003/fastify-formidable/HEAD/README.md) | Multipart pelo formidable, com integração ao swagger — ⚠ parado desde 2023-10 |
| [`fastify-json-to-xml`](https://github.com/Fdawgs/fastify-json-to-xml) · [md](https://raw.githubusercontent.com/Fdawgs/fastify-json-to-xml/HEAD/README.md) | Serializa a resposta JSON em XML |
| [`fastify-markdown`](https://github.com/freezestudio/fastify-markdown) · [md](https://raw.githubusercontent.com/freezestudio/fastify-markdown/HEAD/Readme.md) | Suporte a markdown |
| [`fastify-minify`](https://github.com/Jelenkee/fastify-minify) · [md](https://raw.githubusercontent.com/Jelenkee/fastify-minify/HEAD/README.md) | Minifica e transforma a resposta — ⚠ parado desde 2021-11 |
| [`fastify-msgpack`](https://github.com/kenriortega/fastify-msgpack) · [md](https://raw.githubusercontent.com/kenriortega/fastify-msgpack/HEAD/README.md) | Corpo e resposta em MessagePack — ⚠ parado desde 2021-05 |
| [`fastify-multer`](https://github.com/fox1t/fastify-multer) · [md](https://raw.githubusercontent.com/fox1t/fastify-multer/HEAD/README.md) | Upload multipart pelo multer — ⚠ parado desde 2023-07 |
| [`fastify-prettier`](https://github.com/hsynlms/fastify-prettier) · [md](https://raw.githubusercontent.com/hsynlms/fastify-prettier/HEAD/README.md) | Embeleza a resposta com o Prettier — ⚠ parado desde 2022-08 |
| [`fastify-protobufjs`](https://github.com/kenriortega/fastify-protobufjs) · [md](https://raw.githubusercontent.com/kenriortega/fastify-protobufjs/HEAD/README.md) | Corpo e resposta em Protocol Buffers — ⚠ parado desde 2021-05 |
| [`fastify-qrcode`](https://github.com/chonla/fastify-qrcode) · [md](https://raw.githubusercontent.com/chonla/fastify-qrcode/HEAD/README.md) | Gera QR Code pelo qrcode — ⚠ parado desde 2020-04 |
| [`fastify-sse`](https://github.com/lolo32/fastify-sse) · [md](https://raw.githubusercontent.com/lolo32/fastify-sse/HEAD/README.md) | Server-Sent Events por `reply.sse(…)` |
| [`fastify-uws`](https://github.com/geut/fastify-uws) · [md](https://raw.githubusercontent.com/geut/fastify-uws/HEAD/README.md) | Troca o servidor HTTP pelo uWebSockets.js |
| [`fastify-web-response`](https://github.com/erfanium/fastify-web-response) · [md](https://raw.githubusercontent.com/erfanium/fastify-web-response/HEAD/readme.md) | Permite devolver `Response` e `ReadableStream` da API web |
| [`fastify-ws`](https://github.com/gj/fastify-ws) · [md](https://raw.githubusercontent.com/gj/fastify-ws/HEAD/README.md) | WebSocket com hook de ciclo de vida, e não um handler só — ⚠ parado desde 2022-12 |
| [`fastify-xml-body-parser`](https://github.com/NaturalIntelligence/fastify-xml-body-parser) · [md](https://raw.githubusercontent.com/NaturalIntelligence/fastify-xml-body-parser/HEAD/README.md) | Converte corpo XML em objeto |

### Cache

| Plugin | O que resolve |
| --- | --- |
| [`@blastorg/fastify-aws-dynamodb-cache`](https://github.com/blastorg/fastify-aws-dynamodb-cache) · [md](https://raw.githubusercontent.com/blastorg/fastify-aws-dynamodb-cache/HEAD/README.md) | Cache de resposta de API no DynamoDB |
| [`fastify-cacheman`](https://gitlab.com/aalfiann/fastify-cacheman) | Cache em memória, arquivo, Redis ou MongoDB |
| [`fastify-disablecache`](https://github.com/Fdawgs/fastify-disablecache) · [md](https://raw.githubusercontent.com/Fdawgs/fastify-disablecache/HEAD/README.md) | Desliga o cache do lado do cliente |
| [`fastify-lcache`](https://github.com/denbon05/fastify-lcache) · [md](https://raw.githubusercontent.com/denbon05/fastify-lcache/HEAD/README.md) | Cache leve em memória |
| [`fastify-peekaboo`](https://github.com/simone-sanfratello/fastify-peekaboo) · [md](https://raw.githubusercontent.com/simone-sanfratello/fastify-peekaboo/HEAD/README.md) | Memoriza resposta por regra configurável — ⚠ parado desde 2021-03 |
| [`fastify-response-caching`](https://github.com/codeaholicguy/fastify-response-caching) · [md](https://raw.githubusercontent.com/codeaholicguy/fastify-response-caching/HEAD/README.md) | Cache da resposta — ⚠ parado desde 2022-12 |

### Erro, redirecionamento e cabeçalho

| Plugin | O que resolve |
| --- | --- |
| [`@yeliex/fastify-problem-details`](https://github.com/yeliex/fastify-problem-details) · [md](https://raw.githubusercontent.com/yeliex/fastify-problem-details/HEAD/README.md) | Resposta de erro no formato RFC 9457, com erro HTTP tipado |
| [`fastify-boom`](https://github.com/jeromemacias/fastify-boom) · [md](https://raw.githubusercontent.com/jeromemacias/fastify-boom/HEAD/README.md) | Erro HTTP no formato do Boom — ⚠ parado desde 2023-01 |
| [`fastify-error-page`](https://github.com/hemerajs/fastify-error-page) · [md](https://raw.githubusercontent.com/hemerajs/fastify-error-page/HEAD/README.md) | Erro em HTML estruturado no navegador, em desenvolvimento — ⚠ parado desde 2023-01 |
| [`fastify-favicon`](https://github.com/smartiniOnGitHub/fastify-favicon) · [md](https://raw.githubusercontent.com/smartiniOnGitHub/fastify-favicon/HEAD/README.md) | Serve um favicon padrão |
| [`fastify-hashids`](https://github.com/andersonjoseph/fastify-hashids) · [md](https://raw.githubusercontent.com/andersonjoseph/fastify-hashids/HEAD/README.md) | Codifica e decodifica id com hashids — ⚠ parado desde 2023-11 |
| [`fastify-http-errors-enhanced`](https://github.com/ShogunPanda/fastify-http-errors-enhanced) · [md](https://raw.githubusercontent.com/ShogunPanda/fastify-http-errors-enhanced/HEAD/README.md) | Erro HTTP enriquecido no tratamento de erro |
| [`fastify-http-exceptions`](https://github.com/bhouston/fastify-http-exceptions) · [md](https://raw.githubusercontent.com/bhouston/fastify-http-exceptions/HEAD/README.md) | Exceção de status HTTP tipada, convertida em resposta |
| [`fastify-http2https`](https://github.com/lolo32/fastify-http2https) · [md](https://raw.githubusercontent.com/lolo32/fastify-http2https/HEAD/README.md) | Redireciona HTTP para HTTPS na mesma porta |
| [`fastify-https-always`](https://github.com/mattbishop/fastify-https-always) · [md](https://raw.githubusercontent.com/mattbishop/fastify-https-always/HEAD/README.md) | Redireciona para HTTPS, ciente de proxy |
| [`fastify-https-redirect`](https://github.com/tomsvogel/fastify-https-redirect) · [md](https://raw.githubusercontent.com/tomsvogel/fastify-https-redirect/HEAD/README.md) | Redireciona HTTP para HTTPS — ⚠ parado desde 2021-09 |
| [`fastify-no-icon`](https://github.com/jsumners/fastify-no-icon) · [md](https://raw.githubusercontent.com/jsumners/fastify-no-icon/HEAD/Readme.md) | Elimina o erro de `/favicon.ico` — ⚠ parado desde 2024-09 |
| [`fastify-tls-keygen`](https://gitlab.com/sebdeckers/fastify-tls-keygen) · [md](https://gitlab.com/sebdeckers/fastify-tls-keygen/-/raw/HEAD/README.md) | Gera certificado TLS de `localhost`, confiável no navegador — ⚠ parado desde 2019-12 |
| [`fastify-user-agent`](https://github.com/Eomm/fastify-user-agent) · [md](https://raw.githubusercontent.com/Eomm/fastify-user-agent/HEAD/README.md) | Interpreta o cabeçalho `user-agent` |

### Renderização e frontend

| Plugin | O que resolve |
| --- | --- |
| [`@applicazza/fastify-nextjs`](https://github.com/applicazza/fastify-nextjs) · [md](https://raw.githubusercontent.com/applicazza/fastify-nextjs/HEAD/README.md) | Integração alternativa com o Next.js — ⚠ parado desde 2023-11 |
| [`@exortek/remix-fastify`](https://github.com/ExorTek/remix-fastify) · [md](https://raw.githubusercontent.com/ExorTek/remix-fastify/HEAD/README.md) | Integração com o Remix |
| [`@matths/fastify-svelte-view`](https://github.com/matths/fastify-svelte-view) · [md](https://raw.githubusercontent.com/matths/fastify-svelte-view/HEAD/README.md) | Renderiza componente Svelte em SSR, CSR e SSR com hidratação |
| [`fastify-angular-universal`](https://github.com/exequiel09/fastify-angular-universal) · [md](https://raw.githubusercontent.com/exequiel09/fastify-angular-universal/HEAD/README.md) | SSR de Angular por `@angular/platform-server` — ⚠ parado desde 2018-12 |
| [`fastify-babel`](https://github.com/cfware/fastify-babel) · [md](https://raw.githubusercontent.com/cfware/fastify-babel/HEAD/README.md) | Transformação de fonte por Babel, para servidor de desenvolvimento — ⚠ parado desde 2023-10 |
| [`fastify-nuxtjs`](https://github.com/gomah/fastify-nuxtjs) · [md](https://raw.githubusercontent.com/gomah/fastify-nuxtjs/HEAD/README.md) | SSR de Vue com Nuxt.js — ⚠ parado desde 2022-04 |
| [`fastify-ssr-vite`](https://github.com/nineohnine/fastify-ssr-vite) · [md](https://raw.githubusercontent.com/nineohnine/fastify-ssr-vite/HEAD/README.md) | SSR com o Vite — ⚠ parado desde 2022-06 |
| [`fastify-vue-plugin`](https://github.com/TheNoim/fastify-vue) · [md](https://raw.githubusercontent.com/TheNoim/fastify-vue/HEAD/Readme.md) | Nuxt.js com controle sobre quais rotas o Nuxt atende — ⚠ parado desde 2022-12 |
| [`fastify-webpack-hmr`](https://github.com/lependu/fastify-webpack-hmr) · [md](https://raw.githubusercontent.com/lependu/fastify-webpack-hmr/HEAD/README.md) | Recarga de módulo do Webpack — ⚠ parado desde 2023-04 |
| [`fastify-webpack-hot`](https://github.com/gajus/fastify-webpack-hot) · [md](https://raw.githubusercontent.com/gajus/fastify-webpack-hot/HEAD/README.md) | Hot Module Replacement do Webpack — ⚠ parado desde 2023-06 |
| [`mercurius`](https://mercurius.dev/) | Servidor GraphQL completo |

### Internacionalização

| Plugin | O que resolve |
| --- | --- |
| [`fastify-i18n`](https://github.com/Vanilla-IceCream/fastify-i18n) · [md](https://raw.githubusercontent.com/Vanilla-IceCream/fastify-i18n/HEAD/README.md) | Internacionalização sobre o node-polyglot |
| [`fastify-language-parser`](https://github.com/lependu/fastify-language-parser) · [md](https://raw.githubusercontent.com/lependu/fastify-language-parser/HEAD/README.md) | Lê o idioma da requisição — ⚠ parado desde 2023-03 |
| [`fastify-multilingual`](https://github.com/guydamato/fastify-multilingual) · [md](https://raw.githubusercontent.com/gbrugger/fastify-multilingual/HEAD/README.md) | Decora a requisição com o Polyglot.js |
| [`fastify-polyglot`](https://github.com/beliven-it/fastify-polyglot) · [md](https://raw.githubusercontent.com/beliven-it/fastify-polyglot/HEAD/README.md) | Internacionalização com o node-polyglot — ⚠ arquivado |
| [`i18next-http-middleware`](https://github.com/i18next/i18next-http-middleware) · [md](https://raw.githubusercontent.com/i18next/i18next-http-middleware/HEAD/README.md) | Internacionalização pelo i18next |

### Serviço externo e nuvem

| Plugin | O que resolve |
| --- | --- |
| [`@h4ad/serverless-adapter`](https://github.com/H4ad/serverless-adapter) · [md](https://raw.githubusercontent.com/H4ad/serverless-adapter/HEAD/README.md) | Roda a aplicação em Lambda, Azure e outras plataformas serverless |
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) · [md](https://raw.githubusercontent.com/inferdi/inferdi/main/packages/fastify/README.md) | Injeção de dependência tipada pelo InferDI |
| [`@trubavuong/fastify-seaweedfs`](https://github.com/trubavuong/fastify-seaweedfs) · [md](https://raw.githubusercontent.com/trubavuong/fastify-seaweedfs/HEAD/README.md) | Cliente do SeaweedFS — ⚠ parado desde 2021-05 |
| [`electron-server`](https://github.com/anonrig/electron-server) · [md](https://raw.githubusercontent.com/anonrig/electron-server/HEAD/readme.md) | Roda o Fastify em app Electron sem ocupar porta — ⚠ parado desde 2022-07 |
| [`fastify-appwrite`](https://github.com/maniecodes/fastify-appwrite) · [md](https://raw.githubusercontent.com/maniecodes/fastify-appwrite/HEAD/README.md) | Cliente do servidor Appwrite — ⚠ parado desde 2021-09 |
| [`fastify-aws-timestream`](https://github.com/gzileni/fastify-aws-timestream) · [md](https://raw.githubusercontent.com/gzileni/fastify-aws-timestream/HEAD/README.md) | Banco e consulta agendada no AWS Timestream — ⚠ parado desde 2022-10 |
| [`fastify-axios`](https://github.com/davidedantonio/fastify-axios) · [md](https://raw.githubusercontent.com/davidedantonio/fastify-axios/HEAD/README.md) | Requisição HTTP de saída pelo axios |
| [`fastify-cloudinary`](https://github.com/Vanilla-IceCream/fastify-cloudinary) · [md](https://raw.githubusercontent.com/Vanilla-IceCream/fastify-cloudinary/HEAD/README.md) | Conexão compartilhada com o Cloudinary — ⚠ parado desde 2024-09 |
| [`fastify-evervault`](https://github.com/Briscoooe/fastify-evervault) · [md](https://raw.githubusercontent.com/Briscoooe/fastify-evervault/HEAD/README.md) | Cliente do Evervault encapsulado — ⚠ parado desde 2024-05 |
| [`fastify-google-cloud-storage`](https://github.com/carlozamagni/fastify-google-cloud-storage) · [md](https://raw.githubusercontent.com/carlozamagni/fastify-google-cloud-storage/HEAD/README.md) | Cliente do Google Cloud Storage |
| [`fastify-hasura`](https://github.com/ManUtopiK/fastify-hasura) · [md](https://raw.githubusercontent.com/ManUtopiK/fastify-hasura/HEAD/README.md) | Integração com o Hasura |
| [`fastify-hl7`](https://github.com/Bugs5382/fastify-hl7) · [md](https://raw.githubusercontent.com/Bugs5382/fastify-hl7/HEAD/README.md) | Servidor e cliente de mensagem no formato HL7 |
| [`fastify-koa`](https://github.com/rozzilla/fastify-koa) · [md](https://raw.githubusercontent.com/rozzilla/fastify-koa/HEAD/README.md) | Converte middleware de Koa em plugin |
| [`fastify-lm`](https://github.com/galiprandi/fastify-lm) · [md](https://raw.githubusercontent.com/galiprandi/fastify-lm/HEAD/README.md) | Fala com OpenAI, Claude, Google e Deepseek por uma interface só |
| [`fastify-mailer`](https://github.com/coopflow/fastify-mailer) · [md](https://raw.githubusercontent.com/coopflow/fastify-mailer/HEAD/README.md) | Transporte do Nodemailer encapsulado — ⚠ parado desde 2023-03 |
| [`fastify-msgraph-webhook`](https://github.com/flower-of-the-bridges/fastify-msgraph-change-notifications-webhook) · [md](https://raw.githubusercontent.com/flower-of-the-bridges/fastify-msgraph-change-notifications-webhook/HEAD/README.md) | Webhook de notificação de mudança do MS Graph — ⚠ parado desde 2024-03 |
| [`fastify-osm`](https://github.com/gzileni/fastify-osm) · [md](https://raw.githubusercontent.com/gzileni/fastify-osm/HEAD/README.md) | Consulta Overpass do OpenStreetMap — ⚠ parado desde 2022-11 |
| [`fastify-passkit-webservice`](https://github.com/alexandercerutti/fastify-passkit-webservice) · [md](https://raw.githubusercontent.com/alexandercerutti/fastify-passkit-webservice/HEAD/README.md) | Serviço web da Apple Wallet — ⚠ arquivado |
| [`fastify-s3-buckets`](https://github.com/kibertoad/fastify-s3-buckets) · [md](https://raw.githubusercontent.com/kibertoad/fastify-s3-buckets/HEAD/README.md) | Garante que os buckets S3 existem no boot |
| [`fastify-ses-mailer`](https://github.com/KaranHotwani/fastify-ses-mailer) · [md](https://raw.githubusercontent.com/KaranHotwani/fastify-ses-mailer/HEAD/README.md) | E-mail pelo AWS SES, com SDK v3 |
| [`fastify-stripe`](https://github.com/coopflow/fastify-stripe) · [md](https://raw.githubusercontent.com/coopflow/fastify-stripe/HEAD/README.md) | Cliente do Stripe encapsulado — ⚠ parado desde 2023-03 |
| [`fastify-supabase`](https://github.com/coopflow/fastify-supabase) · [md](https://raw.githubusercontent.com/coopflow/fastify-supabase/HEAD/README.md) | Cliente do Supabase encapsulado — ⚠ parado desde 2023-03 |
| [`fastify-vhost`](https://github.com/patrickpissurno/fastify-vhost) · [md](https://raw.githubusercontent.com/patrickpissurno/fastify-vhost/HEAD/README.md) | Encaminha requisição de subdomínio para outro servidor |
| [`k-fastify-gateway`](https://github.com/jkyberneees/fastify-gateway) · [md](https://raw.githubusercontent.com/jkyberneees/fastify-gateway/HEAD/README.md) | Gateway de API sobre o `@fastify/reply-from` — ⚠ parado desde 2023-06 |

### Configuração e ambiente

| Plugin | O que resolve |
| --- | --- |
| [`fastify-envalid`](https://github.com/alemagio/fastify-envalid) · [md](https://raw.githubusercontent.com/alemagio/fastify-envalid/HEAD/README.md) | Validação de variável de ambiente pelo envalid |
| [`fastify-feature-flags`](https://gitlab.com/m03geek/fastify-feature-flags) · [md](https://gitlab.com/m03geek/fastify-feature-flags/-/raw/HEAD/README.md) | Feature flag com múltiplos provedores (env, config, Unleash) — ⚠ parado desde 2023-06 |
| [`fastify-rob-config`](https://github.com/jeromemacias/fastify-rob-config) · [md](https://raw.githubusercontent.com/jeromemacias/fastify-rob-config/HEAD/README.md) | Configuração pelo Rob-Config — ⚠ parado desde 2022-12 |

### Ferramentas (não são plugins)

| Plugin | O que resolve |
| --- | --- |
| [`fast-maker`](https://github.com/imjuni/fast-maker) · [md](https://raw.githubusercontent.com/imjuni/fast-maker/HEAD/README.md) | Gera configuração de rota a partir da estrutura de diretório — ⚠ parado desde 2024-02 |
| [`fastify-flux`](https://github.com/Jnig/fastify-flux) · [md](https://raw.githubusercontent.com/Jnig/fastify-flux/HEAD/README.md) | API por decorator, com JSON Schema derivado de interface TypeScript |
| [`fastify-intlayer`](https://intlayer.org/doc/environment/fastify) | Internacionalização de mensagem de erro e de template de e-mail |
| [`jeasx`](https://www.jeasx.dev/) | Framework de renderização no servidor com JSX assíncrono |
| [`simple-tjscli`](https://github.com/imjuni/simple-tjscli) · [md](https://raw.githubusercontent.com/imjuni/simple-tjscli/HEAD/README.md) | CLI que gera JSON Schema a partir de interface TypeScript — ⚠ parado desde 2023-03 |
| [`vite-plugin-fastify`](https://github.com/Vanilla-IceCream/vite-plugin-fastify) · [md](https://raw.githubusercontent.com/Vanilla-IceCream/vite-plugin-fastify/HEAD/README.md) | Fastify dentro do Vite, com HMR |
| [`vite-plugin-fastify-routes`](https://github.com/Vanilla-IceCream/vite-plugin-fastify-routes) · [md](https://raw.githubusercontent.com/Vanilla-IceCream/vite-plugin-fastify-routes/HEAD/README.md) | Roteamento por arquivo com o Vite |
