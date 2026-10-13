# OpenAPI

Gerador de documentação da API, próprio do repositório. Não é biblioteca de terceiro.

> **Padrão, não biblioteca.** Descreve o gerador de contrato de todo backend da casa. Os caminhos
> seguem `arquitetura.md`: o que roda em produção (tipos, registro, correções de schema) mora em
> `app/core/openapi/`; o que só roda em desenvolvimento e CI (introspecção, emissão, verificação)
> mora em `scripts/openapi/`. Os exemplos de código usam o adaptador Fastify (o `schema` da rota é
> consumido pelo framework); no Adonis os scripts são chamados por um comando ace
> (`commands/openapi-generate.ts`) e o documento é servido pela rota de documentação
> (`backend.md` §4.1 e §10). A regra vale nos dois: o contrato é **derivado** do código e conferido
> por `openapi:check` no CI, nunca redigido à mão.

**O que é:** um par de scripts que lê o AST dos controllers, dos use-cases e dos middlewares, mais as
definições de model em runtime, e escreve dois artefatos: `app/core/openapi/schema.generated.ts`
(os `schema` que cada rota registra no Fastify) e `openapi.json` (o documento completo, obtido
subindo o kernel e perguntando ao `@fastify/swagger`). A referência navegável é servida pelo Scalar
em `/documentation`.

**Para que serve:** ter o contrato da API — rota, payload, resposta e erros — como artefato
commitado e diffável, sem manter documentação em paralelo ao código. A alternativa — um `*.schema.ts` por rota mantido
à mão — redesenha o que model, validator, middleware e use-case já dizem, e envelhece separado deles.

**Como usar:**

```bash
pnpm openapi:generate           # reescreve os dois artefatos
pnpm openapi:check              # CI: sai 1 se algum estiver desatualizado
pnpm openapi:generate --strict  # trata aviso como erro
pnpm openapi:verify             # a resposta muda ao ser serializada?
pnpm check                      # tsc + os três acima + sync:check — o que o CI roda
```

Scripts fora da suite de teste precisam de `NODE_ENV=test` para achar o `.env.test`; sem isso morrem
com `Invalid environment variables` antes de chegar ao gerador.

**Quando mexer:** depois de qualquer mudança em rota, middleware, validator, use-case **ou model**.
Prefixo de rota novo pede uma tag em `config/openapi.ts`;
fatia nova pede uma entrada no registro de resposta. O resto sai sozinho.

**A ideia central, e a regra que decide onde cada informação mora:**

> O que o código já diz, o gerador lê; o que só uma pessoa sabe, o controller declara.

Isso é o oposto de um gerador dirigido por JSDoc, onde cada operação depende de alguém lembrar de
anotá-la e a anotação envelhece separada do código. Aqui mudar o validator do controller muda a
documentação na próxima geração.

**A pegadinha:** `additionalProperties: true` na raiz de toda resposta não é frouxidão. No Fastify o
`response` **não é documentação, é whitelist de serialização** — propriedade não declarada some da
resposta em produção. A derivação descreve o contrato; ela não tem autoridade para apagar um campo
que não enxergou.

**Links:** 14 (todos internos, apontando para arquivos do repositório).

---

## Uso

#### fluxo-de-trabalho
código: `scripts/openapi/generate.ts`

**O que é:** o script `openapi:generate`, com `--check` e `--strict`.
**Para que serve:** produzir os dois artefatos e recusar um contrato desatualizado no CI.
**Quando usar:** depois de qualquer mudança em rota, validator, use-case, middleware ou model.
**Sempre commite os dois artefatos junto com a mudança que os alterou** — é o que faz o contrato
aparecer no diff do PR.

```bash
NODE_ENV=test pnpm openapi:generate   # desenvolvimento
NODE_ENV=test pnpm openapi:check      # CI: falha se alguém esqueceu de regerar
```

A geração é determinística: rodar duas vezes produz bytes idênticos, e é isso que faz o `--check`
funcionar. O campo `servers` é normalizado para a variável `{APP_SERVER_URL}` — gravar o valor
concreto faria o `--check` acusar divergência só porque o `.env` de quem gerou é outro.

#### dois-artefatos
código: `app/core/openapi/schema.generated.ts`

**O que é:** por que a leitura de AST não basta e existe um segundo artefato.
**Para que serve:** pegar a mudança de contrato que o primeiro artefato não consegue mostrar.
**Quando usar:** ao se perguntar por que o `openapi.json` está commitado se o `schema.generated.ts`
já existe.

| Artefato | Como sai | Precisa de banco |
| --- | --- | --- |
| `app/core/openapi/schema.generated.ts` | leitura de AST | não |
| `openapi.json` (raiz do backend) | subindo o kernel e perguntando ao `@fastify/swagger` | sim |

O registro guarda uma **chamada** — `detail('user/base')` —, não o schema expandido. Então
acrescentar um campo a uma definição de model muda o contrato de todas as rotas que a usam **sem alterar um byte**
do `schema.generated.ts`: o `--check` passaria e o diff do PR sairia vazio. O documento commitado é
o que fecha isso, e é também o que permite gerar cliente tipado sem subir o servidor.

Ele **não vai para o build**: `/openapi.json` é servido em memória pelo `@fastify/swagger`, e nada
lê o arquivo do disco.

#### rota-nova
código: `app/features/administrator/users/create/create.controller.ts`

**O que é:** o caso mais comum — acrescentar uma operação numa fatia que já existe.
**Para que serve:** nada. É o ponto do desenho.
**Quando usar:** sempre que a rota nova usar os padrões que o gerador já reconhece.

```ts
@Controller()
export default class {
  @POST({
    url: '/users',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS),
      ],
      schema: SCHEMAS['POST /users'],
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> { /* … */ }
}
```

O `@Controller()` aceita um `route` que prefixa as rotas da classe
(`@Controller({ route: 'users' })`); sem ele o `url` de cada método é o caminho inteiro. O gerador
lê as duas formas.

A linha que fecha o ciclo é o `schema: SCHEMAS['POST /users']`: o gerador escreve o
`schema.generated.ts`, e o controller **consome** o que foi gerado, indexado por `"MÉTODO /caminho"`.
Rota nova sem a entrada correspondente sai do gerador e volta ao controller na mesma rodada.

```bash
NODE_ENV=test pnpm openapi:generate   # a operação aparece completa
```

Método, caminho, payload, status, erros, resumo, tag e segurança saem sozinhos. O que **não** sai
sozinho é o corpo da resposta, se a fatia ainda não tiver entrada no registro.

---

## O que é derivado

#### introspeccao
código: `scripts/openapi/introspect.ts`

**O que é:** a leitura do AST do controller com o compilador do TypeScript, mais a do use-case irmão
e a dos services que ele chama.
**Para que serve:** extrair payload, origem do payload, status de sucesso e erros do domínio sem
nenhuma declaração.
**Quando usar:** ao entender por que uma rota apareceu do jeito que apareceu, ou ao ensinar um padrão
novo ao gerador. **É o coração do sistema** — se algo não foi derivado, é aqui que se olha.

| Informação | Fonte |
| --- | --- |
| método + caminho | `@Controller({route})` (opcional) + `@GET({url})` |
| `security` + 401 | `AuthenticationMiddleware` na cadeia `onRequest` |
| 403 + qual barreira | `PermissionMiddleware` · `RoleMiddleware` · middleware de domínio que barra por registro |
| `body` / `querystring` / `params` | `await XValidator.validate(request.body)` do handler |
| status e corpo vazio | `response.status(N).send(X)` |
| erros de domínio | `HTTPException.F('msg','CAUSE')` do use-case e dos services que **ele** chama |
| 400 / 500 | `app/exceptions/handler.ts` |
| envelope da resposta | `type Response = Either<HTTPException, X>` |
| corpo da resposta | o registro, pela chave do diretório do controller |
| `tags` + `summary` | `config/openapi.ts` + nome da pasta da ação |

Padrão que não estiver nessa lista não é adivinhado: a rota sai sem payload e o aviso aparece.

**O escopo de leitura muda conforme o arquivo, e tem motivo.** Service: arquivo inteiro, porque
um método público costuma delegar a métodos privados, e são eles que lançam. Use-case de uma ação:
arquivo inteiro, pelo mesmo motivo. Classe com várias operações públicas: só o método que o handler
chama, senão a listagem sai documentando os erros da remoção.

#### definicao-do-model
código: `app/core/openapi/model-schema.ts`

**O que é:** a conversão da definição de model (`defineModel`) em JSON Schema, **sem AST**.
**Para que serve:** descrever a entidade que a rota devolve sem reescrever os campos à mão.
**Quando usar:** ao acrescentar campo a um model. Não precisa fazer nada além de regerar.

O `FieldSpec` de cada model diz `kind`, `enum` e `ref` **em runtime**
(`app/core/model/define-model.ts`, adaptador Fastify; no Adonis, o schema gerado do Lucid), então a peça que em outros geradores parseia os
models com AST aqui não existe — e o registro não precisa de um campo `enums`.

**A travessia de tipos para em tipo de domínio.** `Result` e outros aliases que
descrevem uma resposta são abertos; sem isso dezenas de operações sairiam como objeto anônimo. Mas
`User` e as demais entidades de `app/core/entity.ts` **não** são: expandi-los estruturalmente dentro de um
`{ user: User }` publicava `password`. Entidade quem descreve é o registro, com o `omit`.

#### erros-do-use-case
código: `scripts/openapi/introspect.ts` (coleta) + `app/exceptions/http.exception.ts` (fábricas)

**O que é:** a coleta de `HTTPException.Fabrica('mensagem', 'CAUSE')` do use-case irmão.
**Para que serve:** documentar status, código **e** mensagem de cada falha do domínio, sem declarar.
**Quando usar:** ao adicionar um `left(...)` novo. Não precisa fazer nada — mas só argumentos
literais são lidos. Código montado em variável fica de fora, de propósito: melhor faltar do que
documentar um palpite.

**O `cause` vira `enum`, a mensagem não.** O `cause` é o que o cliente usa para decidir, e sai
restrito aos valores que aquela operação devolve. Parte das mensagens é montada em template
(`Post ${id} não encontrado`) e não tem como ser enumerada.

Por isso o código é literal no use-case; catálogo central só nas condições de `backend.md` §3
(linha "código de erro de negócio").

**Componente de erro compartilhado** *(opinião da casa)*: operações que falham com o mesmo
status e o mesmo conjunto de `code` apontam para um componente só, nomeado
`Error<Status><Codes em PascalCase, ordenados>` (`Error404PostNotFound`) — não um schema anônimo
repetido por rota.

#### seguranca-e-papeis
código: `scripts/openapi/emit.ts`

**O que é:** a leitura da cadeia `onRequest` de cada rota.
**Para que serve:** `security`, 401, 403 e qual barreira barrou, sem declarar.
**Quando usar:** ao mover uma rota de grupo, ou ao trocar um middleware por outro.

O esquema de segurança é `apiKey` em cookie `accessToken`, não `bearer`: o middleware lê o cookie e
não tem fallback para o header `Authorization`. Documentar bearer faria o "Test Request" do Scalar
falhar sempre. `apiKey`/`in: cookie` é tipo real da spec OpenAPI 3
(swagger.io/docs/specification/authentication/api-keys/ — `securitySchemes` aceita
`type: apiKey` com `in: header | query | cookie`); não há `_doc-lib` de OpenAPI/Swagger nesta
casa, então a citação é direta à spec, não a um doc-lib.

**Auth opcional sai como `security: [{ cookieAuth: [] }, {}]`.** Não é detalhe: são rotas que se
comportam diferente com e sem cookie, e omitir o bloco faria o Scalar nunca mandá-lo.

---

## Escrito à mão

#### registro-de-resposta
código: `app/core/openapi/response.ts`

**O que é:** o registro de qual model responde por cada fatia da API.
**Para que serve:** a única parte que o código não consegue declarar sozinho — o contrato público é
a resposta da operação, não a tabela.
**Quando usar:** uma vez por fatia.

```ts
'administrator/users': { model: User, omit: ['password'], relations: { team: TEAM_FULL } },
'administrator/users/paginate': { model: User, omit: ['password'], relations: { team: TEAM_REF } },
```

A chave é o caminho da ação sob `app/features/` e a busca **sobe**:
`administrator/users/paginate` tenta a chave inteira, depois `administrator/users`, depois
`administrator`. Uma entrada cobre as operações da fatia; a operação que foge da
forma ganha a própria chave, sem caso especial no gerador.

#### prosa-no-controller
código: `app/core/openapi/types.ts`

**O que é:** o bloco opcional `docs`, com o helper `defineDocs`.
**Para que serve:** a prosa que explica a regra de negócio, e a correção de uma derivação errada.
**Quando usar:** só quando houver o que dizer. **Rota sem `docs` sai documentada do mesmo jeito.**

```ts
export const docs = defineDocs({
  handle: {
    description: 'Cria uma nova conta de usuário com nome, email e grupo.',
  },
});
```

É chaveado pelo nome do método porque o adaptador permite mais de uma rota por classe; com uma
pasta por ação (`arquitetura.md` §3), a chave é quase sempre `handle`.

`summary` só quando a ação não está na tabela de resumos derivados (`create`, `show`, `paginate`,
`update`, `delete`, `bulk-*`…); fora dela a rota cai no fallback `"MÉTODO /caminho"`, e é aí que vale
escrever um. `errors` é o escape para a falha que o gerador não alcança, e `body` para o payload que
o controller não declara — tipicamente rota multipart, cujo corpo o handler consome por
`request.file()`.

Se você está declarando `body` ou `responses` aqui, provavelmente o gerador deveria ter derivado e
vale investigar por quê.

#### tags
código: `config/openapi.ts`

**O que é:** os prefixos de rota, cada um com rótulo, descrição, singular e plural.
**Para que serve:** agrupar a barra lateral do Scalar e derivar os resumos.
**Quando usar:** quando um prefixo de rota novo aparece — sem a entrada ele cai em "Sem grupo".

Os substantivos viram os resumos: `create` → "Criar usuário", `paginate` → "Listar usuários".

---

## Lacunas do VineJS

#### correcoes-de-schema
código: `app/core/openapi/vine-schema.ts`

**O que é:** a travessia que conserta o que `toJSONSchema()` do VineJS perde.
**Para que serve:** impedir que um campo entre no documento sem contrato.
**Quando usar:** ao ver um aviso de campo sem tipo, ou ao aparecer um tipo VineJS novo no projeto.
**As lacunas são silenciosas** — o schema sai válido e errado, então nada denuncia sozinho além
desta camada.

| Escrito | O que `toJSONSchema()` devolve |
| --- | --- |
| `vine.date()` | `{}` — "qualquer coisa" |
| `vine.date().nullable()` | `{"type":"null"}` — "só pode ser nulo" |
| `vine.boolean()` | `enum` com as nove representações que ele aceita |
| `vine.string().regex(a).regex(b)` | um `pattern` só, o último |

A correção é possível porque o VineJS expõe **duas** saídas: `toJSONSchema()` produz o schema
publicável, e `toJSON()` abre a árvore interna, com a mesma forma — objeto tem `properties`, array
tem `each` — e nela o `subtype` do campo sobrevive. Percorrer as duas em paralelo devolve o tipo.

O booleano é o caso que mais engana: o tipo é `boolean`, e a tolerância a formulário HTML (`"on"`,
`"1"`, `"true"`…) vira **descrição**, não união de nove literais no cliente tipado.

Campo que continuar sem tipo vira aviso nomeando rota e caminho, e nunca sai silencioso.

#### correcoes-por-campo
código: `app/core/openapi/field-patches.ts`

**O que é:** correções aplicadas por **nome de campo**, em qualquer payload onde o campo apareça.
**Para que serve:** consertar de uma vez o que um helper compartilhado de validação quebra.
**Quando usar:** quando a divergência é do helper, e não da operação. **Vários validators usam o
mesmo helper de senha; declarar o conserto em cada controller era garantir que o próximo nascesse
errado.**

O caso clássico: os `.regex()` encadeados viram um `pattern` só na saída do VineJS, e o
`.confirmed()` lê o campo do input cru — então o companheiro `passwordConfirmation` não existe no
schema gerado e precisa ser reintroduzido aqui.

---

## A guarda contra coerção

#### verificacao-de-serializacao
código: `scripts/openapi/verify.ts`

**O que é:** pega um documento real de cada model, serializa pelo schema que a rota publica e
**compara com a entrada**.
**Para que serve:** pegar o campo que muda de tipo ou de valor no caminho.
**Quando usar:** sempre que o `pnpm check` reclamar. **O caminho é corrigir o registro, não silenciar
o teste.**

Existe porque o `fast-json-stringify` **coage em silêncio**: `type: 'string'` sobre um documento
populado vira `"[object Object]"`, `type: 'object'` sobre uma lista vira `{"0": …}`, `type: 'number'`
sobre `null` vira `0`. Nada disso falha — sai errado e ninguém vê.

E o model não é a verdade sobre a resposta em dois casos:

- **o use-case transforma o campo no caminho.** Um campo `String` no model que sai como lista,
  partida por `;`, quebra a tela que confiou no schema. Conserto: `fields` no registro.
- **a relação é populada em algumas ações do recurso e não em outras.** O `author` de `posts` vindo
  populado só no `paginate`; declará-lo no recurso inteiro faz o `show` prometer um objeto onde chega
  o id em texto. Conserto: uma chave por ação.

O mapa `TRANSFORMACOES` dentro do script reproduz o que o use-case faz; entrada nova ali é sinal de
que a resposta divergiu do model.

---

## Saída

#### documento-e-referencia
código: `start/kernel.ts`

**O que é:** o registro do `@fastify/swagger` e do `@scalar/fastify-api-reference` no kernel.
**Para que serve:** `/openapi.json` e a referência navegável em `/documentation`, montados a partir
dos mesmos schemas — o documento não é construído duas vezes.
**Quando usar:** ao mudar título, versão, tema ou o esquema de segurança.

```ts
components: {
  securitySchemes: {
    cookieAuth: { type: 'apiKey', in: 'cookie', name: 'accessToken' },
  },
},
```

As duas rotas são fechadas por uma guarda que casa pelo `request.routeOptions.url`, e não pela URL
crua — casar a URL deixava `/openapi%2Ejson` passar por fora.

Contagem de caminhos e operações não se escreve à mão: sai do `openapi.json` (`backend.md` §8).
