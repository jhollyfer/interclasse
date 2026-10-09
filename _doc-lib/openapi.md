# OpenAPI

Gerador de documentação da API, próprio do repositório. Não é biblioteca de terceiro.

> **Este é o único arquivo do pacote preso a um repositório.** Todos os outros descrevem
> bibliotecas públicas e servem a qualquer projeto React × Node. Este descreve um gerador que vive
> no repositório que hospeda estas docs, então os links apontam para arquivos locais (`../backend/…`)
> e quebram se o pacote for copiado sozinho. Quem estiver reusando as docs em outro projeto pode
> ignorá-lo — ou tratá-lo como planta de um gerador equivalente, adaptando os caminhos.

**O que é:** um comando ace que lê as rotas reais, os validators VineJS e o código dos controllers, e
escreve `backend/openapi.json`. A referência é servida pelo Scalar em `/documentation`.

**Para que serve:** ter o contrato da API — rota, payload, resposta e erros — como artefato
commitado e diffável, sem manter documentação em paralelo ao código. O mesmo documento serve para
leitura humana, para gerar cliente TypeScript tipado e para integração de terceiro.

**Como usar:**

```bash
node ace openapi:generate           # escreve backend/openapi.json
node ace openapi:generate --check   # não escreve; sai 1 se o arquivo estiver desatualizado
node ace openapi:generate --strict  # trata aviso como erro
node ace serve                      # → http://localhost:3333/documentation
```

**Quando mexer:** ao criar uma feature nova (precisa de `_shared.response.ts` e de uma entrada em
`config/openapi.ts`) ou quando o gerador emitir aviso. Rota nova dentro de feature existente não
exige nada — basta regerar.

**A ideia central:** o controller já declara o contrato inteiro, então o gerador lê o código em vez
de pedir declaração. Isso é o oposto de `adonis-autoswagger`, que é dirigido por JSDoc: lá cada
operação depende de alguém lembrar de anotá-la, e a anotação envelhece separada do código. Aqui
mudar o validator do controller muda a documentação na próxima geração.

**A pegadinha:** `toJSONSchema()` do VineJS tem quatro lacunas silenciosas — o schema sai válido e
errado. Estão todas corrigidas, mas quem for mexer no gerador precisa saber que existem. Ver
`schema.ts` e `_shared.docs.ts` abaixo.

**Links:** 13 (todos internos, apontando para arquivos do repositório).

---

## Uso

#### fluxo-de-trabalho
[código](../backend/commands/openapi_generate.ts)

**O que é:** o comando `openapi:generate`, com `--check` e `--strict`.
**Para que serve:** produzir `openapi.json` e recusar um documento desatualizado no CI.
**Quando usar:** depois de qualquer mudança em rota, validator, use-case ou schema de resposta.
**Sempre commite o `openapi.json` junto com a mudança que o alterou** — é o que faz o contrato
aparecer no diff do PR.

```bash
# desenvolvimento
node ace openapi:generate

# CI: falha se alguém mexeu num validator e esqueceu de regerar
node ace openapi:generate --check

# quando toda rota já estiver completa, promova aviso a erro
node ace openapi:generate --strict
```

O comando usa `static options = { startApp: true }`. Sem isso ele roda sem container, e não existem
router nem controllers para inspecionar.

#### rota-nova
[código](../backend/start/routes.ts)

**O que é:** o caso mais comum — acrescentar uma operação numa feature que já existe.
**Para que serve:** nada. É o ponto do desenho.
**Quando usar:** sempre que a rota nova usar os padrões que o gerador já reconhece.

```ts
// start/routes.ts — só isso
router.get(':id/historico', [controllers.company.products.Historico])
```

```bash
node ace openapi:generate   # a operação aparece completa
```

Payload, status, erros, resumo, tag e segurança saem sozinhos. O que **não** sai sozinho é o corpo
da resposta, se a feature ainda não tiver `_shared.response.ts`.

#### feature-nova
[código](../backend/app/features/company/products/_shared.response.ts)

**O que é:** os três passos para uma pasta de feature nova entrar no documento.
**Para que serve:** cobrir de uma vez todas as operações daquela feature.
**Quando usar:** ao criar `app/features/<modulo>/<recurso>/`. **São os únicos dois arquivos que
alguém escreve à mão em todo o sistema.**

```ts
// 1. app/features/company/products/_shared.response.ts
//    Regra: exportar algo cujo nome termine em `Response`.
import vine from '@vinejs/vine'
import { productFields } from '../../_shared.response.ts'

export const ProductResponse = vine.create(productFields())
```

```ts
// 2. config/openapi.ts — o rótulo e os dois substantivos
{
  prefix: '/company/products',
  name: 'Empresa · Produtos',
  description: 'Produtos da própria empresa. O dono é sempre a empresa da sessão.',
  singular: 'produto',
  plural: 'produtos',
}
```

```bash
# 3.
node ace openapi:generate
```

Os substantivos viram os resumos: `create` → "Criar produto", `paginate` → "Listar produtos".
Dezesseis pares cobrem as 66 operações do projeto.

#### avisos
[código](../backend/app/core/openapi/document.ts)

**O que é:** os três avisos que o gerador emite, cada um nomeando rota e campo.
**Para que serve:** o gerador nunca falha calado — o que ele não conseguiu derivar ele denuncia.
**Quando usar:** ao ler a saída do comando. **Aviso ignorado vira campo sem contrato no documento**,
e é por isso que `--strict` existe.

```
sem corpo de resposta          → falta `_shared.response.ts` na pasta da feature
nenhum prefixo casa            → falta a entrada em `config/openapi.ts` (cai em "Sem grupo")
saiu sem tipo do VineJS        → descreva o campo em `overrides` no `static docs`
```

---

## O que é derivado

#### introspeccao
[código](../backend/app/core/openapi/introspect.ts)

**O que é:** a leitura do AST do controller com o compilador do TypeScript, mais a do use-case irmão.
**Para que serve:** extrair payload, origem do payload, status de sucesso e erros do domínio sem
nenhuma declaração.
**Quando usar:** ao entender por que uma rota apareceu do jeito que apareceu, ou ao ensinar um padrão
novo ao gerador. **É o coração do sistema** — se algo não foi derivado, é aqui que se olha.

```ts
// O que o gerador reconhece hoje, lendo o corpo de `handle`:
context.request.validateUsing(ProductCreateValidator)      // → requestBody
Validator.validate({ ...context.request.body() })          // → requestBody
IdentifierValidator.validate(context.params)               // → parâmetros de caminho
IdentifierValidator.validate(context.request.params())     // → parâmetros de caminho
PaginationValidator.validate(context.request.qs())         // → query string
context.response.ok(...) / .created(...) / .noContent()    // → 200 / 201 / 204
```

Achado o identificador do validator, o gerador resolve o import dele e importa o módulo para chamar
`toJSONSchema()`. Padrão que não estiver nessa lista não é adivinhado: a rota sai sem payload e o
aviso aparece.

#### erros-do-use-case
[código](../backend/app/core/openapi/errors.ts)

**O que é:** a coleta de `HTTPException.Fabrica('mensagem', 'CODE')` do `*.use-case.ts` irmão.
**Para que serve:** documentar status, código **e mensagem** de cada falha do domínio, sem declarar.
**Quando usar:** ao adicionar um `left(...)` novo. Não precisa fazer nada — mas só argumentos
literais são lidos. Código montado em variável fica de fora, de propósito: melhor faltar do que
documentar um palpite.

```ts
// no use-case
return left(HTTPException.Conflict('Produto já existe', 'PRODUCT_ALREADY_EXISTS'))

// vira, no documento:
// 409 → schema com code restrito por enum a ['PRODUCT_ALREADY_EXISTS']
//       description: "Produto já existe"
```

A tabela de status de cada fábrica é montada **chamando as próprias fábricas** no boot do gerador,
em vez de escrita à mão. Se alguém mudar o status de `Conflict`, o documento acompanha.

#### seguranca-e-papeis
[código](../backend/app/core/openapi/document.ts)

**O que é:** a leitura da cadeia de middleware da rota.
**Para que serve:** `security`, 401, 403 e a lista exata de papéis aceitos, sem declarar.
**Quando usar:** ao mover uma rota de grupo. **Grupos de papel aninham, e o gerador faz interseção** —
apagar no painel está dentro de `role(['OWNER','ADMINISTRATOR'])` e de `role(['OWNER'])`, as duas
checagens precisam passar, então o documento diz `OWNER`.

```ts
// start/routes.ts
.use(middleware.auth())                          // → security + 401
.use(middleware.role(['OWNER','ADMINISTRATOR'])) // → 403
  .use(middleware.role(['OWNER']))               // → 403, papéis = interseção = OWNER
```

O esquema de segurança é `apiKey` em cookie `access-token`, não `bearer`: o guard lê de
`request.cookie()` e não tem fallback para o header `Authorization`. Documentar bearer faria o
"Test Request" do Scalar falhar sempre.

---

## Escrito à mão

#### schemas-de-resposta
[código](../backend/app/features/_shared.response.ts)

**O que é:** os campos que cada endpoint devolve, em VineJS, com helpers reaproveitáveis.
**Para que serve:** a única parte que o código não consegue declarar sozinho.
**Quando usar:** uma vez por feature. **São schemas que nunca validam nada** — só o `.toJSONSchema()`
é lido. E são escritos à mão de propósito: o contrato público é a resposta da operação, não a tabela.

```ts
// app/features/_shared.response.ts — helpers, funções e não constantes
export function productFields() {
  return {
    id: identifier(),
    companyId: identifier(),
    name: vine.string(),
    price: vine.number(),
    // precarregadas nas leituras, então fazem parte da resposta
    subcategories: vine.array(vine.object(subcategoryFields())).optional(),
    ...timestamps(),
  }
}
```

São funções, e não constantes, pelo mesmo motivo de `_shared.validator.ts`: reaproveitar o mesmo nó
de schema em dois validators compartilharia as opções entre eles.

O envelope o gerador escolhe pela ação: `paginate` ganha `{ meta, data[] }` com `PaginationMeta`
referenciado, `create` vai em 201, `delete` responde 204.

#### static-docs
[código](../backend/app/core/openapi/types.ts)

**O que é:** o bloco opcional `static docs` no controller, e o helper `defineDocs`.
**Para que serve:** a prosa que explica a regra de negócio, e a correção de uma derivação errada.
**Quando usar:** só quando houver o que dizer. **Todo campo é opcional e rota sem o bloco sai
completa** — se você está declarando `body` ou `responses` aqui, provavelmente o gerador deveria ter
derivado e vale investigar por quê.

```ts
@inject()
export default class CompanyCreateController {
  static docs = defineDocs({
    description:
      'Cria o usuário de papel `COMPANY` e o perfil em `companies` numa transação só (RF-15). ' +
      'O recurso não aceita `role`: oferecer a escolha seria oferecer algo que não existe.',
  })

  async handle(context: HttpContext) { /* inalterado */ }
}
```

Campos aceitos: `summary`, `description`, `tag`, `body`, `query`, `params`, `responses`, `errors`,
`overrides`, `deprecated`. O `handle()` nunca muda — os schemas de resposta documentam, não
serializam.

---

## Lacunas do VineJS

#### correcoes-de-schema
[código](../backend/app/core/openapi/schema.ts)

**O que é:** a travessia que conserta o que `toJSONSchema()` perde.
**Para que serve:** impedir que um campo entre no documento sem contrato.
**Quando usar:** ao ver um aviso de "saiu sem tipo", ou ao aparecer um tipo VineJS novo no projeto.
**As quatro lacunas são silenciosas** — o schema sai válido e errado, então nada denuncia sozinho
além desta camada.

```ts
vine.date()                                  // → {}                 perde o tipo
vine.date().nullable()                       // → {"type":"null"}    diz que SÓ aceita nulo
vine.boolean()                               // → enum de 9 valores  vira união de 9 literais no client
vine.string().regex(/[a-z]/).regex(/[A-Z]/)  // → um `pattern` só, o último
```

As três primeiras são corrigidas na conversão. A correção é possível porque `toJSON()` expõe a
árvore interna do VineJS, com a mesma forma do schema gerado — objeto tem `properties`, array tem
`each` — e nela o `subtype` do campo sobrevive. Percorrer as duas em paralelo devolve o tipo.

Campo que continuar sem tipo vira aviso nomeando rota e caminho, e nunca sai silencioso.

#### correcoes-por-campo
[código](../backend/app/features/_shared.docs.ts)

**O que é:** correções aplicadas por **nome de campo**, em qualquer payload onde o campo apareça.
**Para que serve:** consertar de uma vez o que um helper compartilhado de validação quebra.
**Quando usar:** quando a divergência é do helper, e não da operação. **Cinco validators usam
`password()`; declarar o conserto em cinco controllers era garantir que o sexto nascesse errado.**

```ts
export const FIELD_PATCHES: Record<string, FieldPatch> = {
  password: {
    // os quatro `.regex()` viram um `pattern` só na saída do VineJS
    schema: { type: 'string', minLength: 8, maxLength: 32, allOf: [/* …4 patterns */] },
    // `.confirmed()` lê o campo do input cru, então ele não existe no schema gerado
    companion: {
      name: 'passwordConfirmation',
      schema: { type: 'string' },
      followsRequired: true, // opcional na atualização, obrigatório na criação
    },
  },
}
```

`followsRequired` existe porque `password` opcional numa atualização não pode arrastar um
`passwordConfirmation` obrigatório.

---

## Saída

#### documento-e-componentes
[código](../backend/app/core/openapi/document.ts)

**O que é:** a montagem do documento OpenAPI 3.1, com nomes de componente determinísticos.
**Para que serve:** um arquivo estável, cujo diff mostra a mudança real em vez de ruído.
**Quando usar:** ao investigar por que um `openapi.json` mudou. **A geração é determinística** — rodar
duas vezes produz bytes idênticos, e é isso que faz `--check` funcionar.

```
operationId       administratorCompaniesCreate      (nome da rota, camelizado)
requestBody       AdministratorCompaniesCreateBody
resposta          AdministratorCompaniesCreateResponse201
item paginado     AdministratorCompaniesPaginateItem
erro              Error409CompanyAlreadyExists      (status + códigos)
```

Operações que falham igual compartilham o mesmo componente de erro. O documento encolhe, e quem gera
cliente tipado ganha um tipo nomeado por falha em vez de um objeto anônimo repetido em cada endpoint.

Estado atual: 45 caminhos, 66 operações, 146 componentes.

#### pagina-scalar
[código](../backend/app/core/openapi/scalar.ts)

**O que é:** a página HTML servida em `/documentation`, com o bundle standalone do Scalar pinado por versão.
**Para que serve:** a referência navegável, com "Test Request" funcionando contra o servidor local.
**Quando usar:** ao mudar tema, locale ou versão do Scalar. **`hideModels: true` é deliberado** —
`components.schemas` existe para as operações referenciarem, não para virar seção de menu.

```ts
Scalar.createApiReference('#app', {
  url: '/openapi.json',
  theme: 'default',
  hideModels: true,
})
```

O bundle vem da CDN, pinado: `@latest` faria a documentação mudar de comportamento sem nenhum commit
no repositório. `metaFiles` em `adonisrc.ts` copia o `openapi.json` para o build — sem essa entrada a
rota funciona em desenvolvimento e responde 500 no servidor buildado.

O chrome da interface fica em inglês: o Scalar traduz para `en`, `ru`, `es`, `fr`, `de`, `zh-CN` e
`ar`, e português não está na lista. O conteúdo — resumo, descrição e mensagem de erro — é em
português.
