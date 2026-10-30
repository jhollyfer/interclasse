# Zod

> Conferido em 2026-10-28 contra as 17 páginas da doc oficial (`packages/docs/content/`, commit
> `afdac65` do `colinhacks/zod`; cada `.mdx` abre no raw do GitHub com 200) e contra o tipo publicado
> de `zod@4.6.7` (`npm pack` + `.d.ts`, sem rodar código). O site `zod.dev` não respondeu do
> ambiente de conferência (sem resposta pelo proxy); o `[doc]` de cada entrada aponta para ele, e o
> `[markdown]` é o que foi lido. Com `fastify-type-provider-zod@7.0.0` (`_doc-lib/fastify-plugins.md#fastify-type-provider-zod`)
> e `@hookform/resolvers@6.0.1` (`zodResolver`, peer `zod ^3.25.0 || ^4.0.0`).
>
> **A doc do `main` é do `main`.** `z.compile`, `z.validate`, `z.xor`, `z.deepPartial`,
> `z.exactPartial`, `z.invertCodec` e `z.fromJSONSchema` estão no `.d.ts` da 4.6.7; confira no tipo
> instalado antes de usar API que a página descreve e o projeto ainda não atualizou.

Validação de dado com schema e tipo inferido, em TypeScript, para o Fastify, o `shared/` e o
frontend da casa.

**O que é:** biblioteca de schema sem dependência. `z.object({...})` declara a forma; `z.infer`,
`z.input` e `z.output` tiram o tipo dela; `.parse` lança `ZodError`, `.safeParse` devolve
`{ success, data | error }`. A versão 4 é a que o pacote `zod` exporta na raiz desde a 4.0.0
(`zod/v3` guarda a antiga). Vem com conversão para JSON Schema (`z.toJSONSchema`), metadados por
registry, locales de mensagem (inclusive `ptBR`, `es` e `en`), codecs (decode e encode) e a variante
`zod/mini`.

**Para que serve:** na casa, é a **única biblioteca de schema**, exceto no validator de request do
backend Adonis, que é VineJS (`_doc-lib/vinejs.md`, `DECISIONS.md` #241). Três usos:

1. **`shared/`**: o validator de cada recurso, as mensagens pt-BR/es/en, os enums e o schema
   `…Response`. No Fastify o mesmo schema vale no backend e no frontend; no Adonis, o frontend usa o
   do `shared/` e o backend tem o par em VineJS.
2. **Backend Fastify**: `fastify-type-provider-zod` compila o schema da rota (validação e
   serialização) e o `@fastify/swagger` o converte em OpenAPI. `start/env.ts` valida
   `process.env` com `safeParse`, **síncrono**, no import.
3. **Formulário**: `zodResolver` do `@hookform/resolvers/zod` liga o schema do `shared/` ao
   React Hook Form.

**Como usar:**

```bash
pnpm add zod                         # shared/ (e backend Fastify, se importar zod direto em env.ts)
pnpm add fastify-type-provider-zod   # só no backend Fastify
pnpm add @hookform/resolvers         # só no frontend
```

1. Schema compartilhado no `shared/`: o `z` configurado sai de um arquivo só, e os validators
   importam dele, nunca de `zod` (`architecture.md` §9).

```ts
// shared/src/validator.ts
import * as z from 'zod'

z.config(z.locales.ptBR())

export { z }

export const CPF_REGEX = /^\d{11}$/
```

```ts
// shared/src/validators/authentication/sign-in.validator.ts
import { z } from '../../validator.js'

export const SignInPayload = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
})

export type SignInPayload = z.infer<typeof SignInPayload>
```

2. `env.ts` com `safeParse` síncrono: lista todas as falhas de uma vez e derruba o processo no boot.
   `z.coerce.*` serve para variável que chega como texto; `z.stringbool()` lê `"true"`, `"1"`, `"on"`.

```ts
// backend/start/env.ts
import { z } from '@acme/shared'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.url(),
  COOKIE_SECRET: z.string().min(32),
  MAIL_ENABLED: z.stringbool().default(false),
})

const result = EnvSchema.safeParse(process.env)

if (!result.success) {
  throw new Error(`ENV inválida:\n${z.prettifyError(result.error)}`)
}

export const env = result.data
```

3. `zodResolver` no formulário: o tipo do formulário vem do schema (`z.input` na entrada,
   `z.output` na saída do `handleSubmit`).

```tsx
// frontend/src/features/authentication/sign-in-form.tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { SignInPayload } from '@acme/shared'
import { useForm } from 'react-hook-form'

export function SignInForm({ onSubmit }: Readonly<{ onSubmit: (payload: SignInPayload) => void }>): React.JSX.Element {
  const form = useForm({
    resolver: zodResolver(SignInPayload),
    defaultValues: { email: '', password: '' },
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <input type="email" {...form.register('email')} />
      <input type="password" {...form.register('password')} />
      <button type="submit">Entrar</button>
    </form>
  )
}
```

**Quando adotar a biblioteca:** em todo projeto da casa. O schema do `shared/` é a fonte do tipo e
da regra; backend Adonis acrescenta o VineJS só no request do servidor, com spec de paridade de
campos entre os dois (`architecture.md` §9).

**O que muda a experiência:**

1. **`safeParse` é síncrono, até aparecer `async`.** Refinamento ou transform `async` obriga
   `parseAsync`/`safeParseAsync`; com `safeParse` o Zod lança. Isso vale para o `env.ts`, para o
   `validateSearch` do Router e para o `validatorCompiler` do Fastify (usa `safeParse`): nenhum
   desses aceita schema com `async`. Consulta a banco vai no use-case, não no schema.
2. **Mensagem em inglês por padrão.** O locale `en` carrega sozinho; a casa troca com
   `z.config(z.locales.ptBR())` num único `shared/src/validator.ts`. Mensagem por campo vai em
   `error` (`z.string().min(8, 'Mínimo de 8 caracteres')`); a precedência é check, schema, parse,
   `z.config({ customError })`, locale.
3. **`.parse` devolve cópia profunda e remove chave desconhecida.** `z.object` descarta o que não
   declarou; `z.strictObject` recusa; `z.looseObject` mantém. O `z.toJSONSchema` reflete isso em
   `additionalProperties`.
4. **`.default()` pula o parse; `.prefault()` não.** O valor de `default` tem o tipo da **saída**
   e volta como está; `prefault` entra no schema como se fosse a entrada. Em formulário, o
   `defaultValues` do RHF resolve o campo vazio; `default` do schema é para o servidor.
5. **Input e output podem divergir.** `z.coerce.*` tem input `unknown`; `transform`, `default` e
   `codec` separam `z.input` de `z.output`. O `zodResolver` e o `fastify-type-provider-zod@7`
   usam cada um o lado certo: o corpo da requisição é `z.output`, a resposta é serializada por
   `z.output` (encode).
6. **Import único.** `import * as z from 'zod'`. `zod/v4` e `zod/v4/core` continuam existindo
   para quem constrói biblioteca (`library-authors`); app não precisa deles.

**Links:** 17

**Skills:** `maiyu-typescript` (tipo inferido, `satisfies`, sem `as`), `maiyu-backend` (validator,
`env.ts`, schema de rota no Fastify), `maiyu-frontend` (formulário, `shared/`). Dispare junto com a
leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`).

---

## Começo

#### index
[doc](https://zod.dev/) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/index.mdx)
**O que é:** a introdução: o que é o Zod, instalação (`npm install zod`; no jsr, `@zod/zod`), requisito
de TypeScript 5.5 ou mais novo e `"strict": true` no `tsconfig.json`.
**Para que serve:** conferir requisito antes de adotar e achar o caminho do ecossistema (`/ecosystem`) e
do `llms.txt` oficial, que serve de fonte para agente.
**Quando usar:** ao subir um projeto ou ao conferir por que o editor não infere tipo (quase sempre
`strict` desligado).

#### basics
[doc](https://zod.dev/basics) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/basics.mdx)
**O que é:** o fluxo de todo usuário: definir schema, `.parse` (devolve cópia profunda tipada, lança
`ZodError`), `.safeParse` (resultado discriminado por `success`), `.validate` (só booleano, type guard
sobre o tipo de entrada, até 16 vezes mais rápido que `.safeParse().success` em entrada inválida),
`z.infer`, `z.input` e `z.output`. As variantes `*Async` valem para refinamento e transform `async`.
**Para que serve:** a base dos três usos da casa: `env.ts` (`safeParse` síncrono), validator do
`shared/` e formulário.
**Quando usar:** sempre que for validar dado de fora (ENV, `searchParams`, corpo, resposta de API).
`safeParse` na fronteira, `parse` onde falhar é bug.

```ts
const result = Player.safeParse(input)

if (!result.success) {
  return left(HTTPException.UnprocessableEntity(z.prettifyError(result.error)))
}

return right(result.data)
```

## Definição de schema

#### api
[doc](https://zod.dev/api) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/api.mdx)
**O que é:** a referência completa: primitivos e `z.coerce.*`, string e formatos de topo (`z.email()`,
`z.uuid()`, `z.url()`, `z.iso.datetime()`, `z.ipv4()`...), números e inteiros, datas, enums, `z.stringbool()`,
opcionais, nulos, objetos (`z.object`, `z.strictObject`, `z.looseObject`, `.extend`, `.safeExtend`,
`.pick`, `.omit`, `.partial`, `.exactPartial`, `z.deepPartial`, `.required`), recursão por getter, arrays,
tuplas, uniões, `z.xor`, união discriminada, interseção, record, map, set, `z.file`, `refine`, `check`,
`pipe`, `transform`, `preprocess`, `default`, `prefault`, `catch`, `brand`, `readonly`, `z.json()`, `z.custom`.
**Para que serve:** escolher o construtor certo; a página é longa de propósito, e se lê por seção.
**Quando usar:** ao escrever validator: formato de texto (`z.email()`, não `z.string().email()`, que é legado),
objeto que estende outro (`.extend`, ou spread de `.shape` para trocar a rigidez), refinamento entre
campos (`.refine` com `path`), união por campo discriminante (`z.discriminatedUnion`), enum a partir de
constante (`z.enum(POST_STATUSES)`).

```ts
export const ChangePasswordPayload = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((payload) => payload.password === payload.confirmPassword, {
    error: 'As senhas não conferem',
    path: ['confirmPassword'],
  })
```

#### codecs
[doc](https://zod.dev/codecs) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/codecs.mdx)
**O que é:** `z.codec(entrada, saída, { decode, encode })`: transformação nos dois sentidos. `decode`
vai de entrada para saída (igual ao `.parse`, com tipo de entrada estrito), `encode` volta. Todo schema
aceita `.encode`; `z.invertCodec` deriva o codec contrário. A página traz os codecs prontos
(`stringToNumber`, `isoDatetimeToDate`, `epochMillisToDate`, `json(schema)`, `base64ToBytes`, `hexToBytes`) e como pipe, refinamento,
default, catch e transform se comportam no sentido inverso. Desde a 4.1.
**Para que serve:** um schema só para o dado que atravessa a rede: texto ISO no JSON, `Date` no código.
É o que o `fastify-type-provider-zod@7` usa para serializar a resposta.
**Quando usar:** campo de data ou de valor que muda de forma entre JSON e domínio, no `shared/`, para
que cliente e servidor usem a mesma conversão. Para campo comum, `z.iso.datetime()` e `z.coerce.date()` bastam.

```ts
const stringToDate = z.codec(z.iso.datetime(), z.date(), {
  decode: (iso) => new Date(iso),
  encode: (date) => date.toISOString(),
})
```

## Erros

#### error-customization
[doc](https://zod.dev/error-customization) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/error-customization.mdx)
**O que é:** o parâmetro `error` (texto ou função que recebe a issue e devolve texto ou `undefined`
para ceder a vez), o erro por parse (`.parse(x, { error })`), o global (`z.config({ customError })`),
`reportInput` (inclui a entrada na issue; desligado por padrão para não logar dado sensível), os
locales (`z.config(z.locales.ptBR())`; a lista cobre `ptBR`, `pt`, `es`, `en` e mais de cinquenta) e a precedência:
check, schema, parse, global, locale.
**Para que serve:** mensagem em pt-BR/es/en sem escrever uma por campo, e exceções pontuais por regra.
**Quando usar:** ao montar o `shared/src/validator.ts` (locale da casa e mensagens das regras) e ao
traduzir em tempo de render (`t(iss.code, iss)`). `zod/mini` não carrega locale nenhum: sem
`z.config(en())` tudo sai `Invalid input`.

```ts
z.config({
  customError: (iss) => {
    if (iss.code === 'too_small') {
      return `Mínimo de ${iss.minimum}`
    }

    return undefined
  },
})
```

#### error-formatting
[doc](https://zod.dev/error-formatting) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/error-formatting.mdx)
**O que é:** `z.treeifyError(error)` (árvore que espelha o schema: `errors`, `properties`, `items`),
`z.flattenError(error)` (`{ formErrors, fieldErrors }`, para schema de um nível), `z.prettifyError(error)`
(texto legível, uma linha por problema com o caminho) e `z.formatError`, **deprecado**.
**Para que serve:** converter `ZodError` no formato que a borda precisa: resposta 422 com erro por
campo, log de boot, mensagem de teste.
**Quando usar:** `z.prettifyError` no erro de `env.ts`; `z.flattenError` para devolver `fieldErrors`
de um payload plano; `z.treeifyError` quando o payload tem objeto aninhado ou lista. O acesso à árvore
exige `?.`.

```ts
const { fieldErrors } = z.flattenError(result.error)
// { email: ['E-mail inválido'], password: ['Mínimo de 8 caracteres'] }
```

## JSON Schema e metadados

#### json-schema
[doc](https://zod.dev/json-schema) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/json-schema.mdx)
**O que é:** `z.toJSONSchema(schema, opções)` (nativo desde a 4.0) e `z.fromJSONSchema` (experimental).
Opções: `target` (`draft-2020-12` por padrão, `draft-07`, `draft-04`, `openapi-3.0`), `io` (`output` por
padrão, `input` para o lado de entrada), `metadata` (registry), `unrepresentable` (`throw` por padrão,
`any` ou função), `cycles`, `reused`, `override`, `uri`. Sem equivalente em JSON Schema: `bigint`, `int64`, `symbol`,
`undefined`, `void`, `date`, `map`, `set`, `transform`, `nan`, `custom`. `z.object` sai com
`additionalProperties: false` no modo de saída. Passar um registry gera um documento com todos os
schemas que têm `id`.
**Para que serve:** o OpenAPI do backend Fastify (via `fastify-type-provider-zod`, que chama a mesma
função) e qualquer contrato JSON derivado do schema.
**Quando usar:** ao configurar o `jsonSchemaTransform` e ao ver `Error` de tipo não representável no
`ready()`: `z.date()` na resposta vira `z.iso.datetime()` ou um `codec`, ou o `unrepresentable` trata
caso a caso. O alvo `openapi-3.0` existe para documento 3.0.x.

```ts
const openApiSchema = z.toJSONSchema(SignInPayload, { target: 'openapi-3.0', io: 'input' })
```

#### metadata
[doc](https://zod.dev/metadata) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/metadata.mdx)
**O que é:** registries (`z.registry<Meta>()`, com `add`, `get`, `has`, `remove`, `clear`),
`z.globalRegistry` (campos `id`, `title`, `description`, `deprecated` e os que a casa acrescentar por
declaration merging de `GlobalMeta`), `.meta()` (registra no global e devolve **nova** instância; sem
argumento, lê), `.describe()` (só `description`) e `.register()` (devolve o schema original). Dois
schemas com o mesmo `id` lançam erro. Metadado é de uma instância: `.refine()` cria outra, sem metadado.
**Para que serve:** título e descrição para o OpenAPI, `id` para `$ref` de componente, rótulo de campo
para a mensagem de erro (`iss.schema` junto de `z.globalRegistry`).
**Quando usar:** nos schemas `…Response` e nos payloads que viram documentação: `.meta({ id: 'User' })`
no schema de topo. Chame `.meta()` por último, depois de `.refine()`.

```ts
export const UserResponse = z
  .object({ id: z.uuid(), name: z.string() })
  .meta({ id: 'User', description: 'Usuário autenticado' })
```

## Desempenho

#### compile
[doc](https://zod.dev/compile) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/compile.mdx)
**O que é:** compilação antecipada: `z.compile(schema)` devolve um schema que valida por um caminho
plano gerado com `new Function`, de 2 a 10 vezes mais rápido em objeto e tupla; o erro é sempre o do
schema normal (falha cai no parser comum). `import 'zod/compile'` liga para todos os schemas criados
depois. Não compila: refinamento e transform `async`, `z.xor`, recursivo, `z.coerce.*`, check com
`when`, `.catch()` com função (esses voltam o schema original, ou lançam com `{ strict: true }`). Custa cerca de 7 KB gzip e exige `new Function`:
`z.config({ jitless: true })` o desliga no modo global (CSP sem `eval`).
**Para que serve:** caminho quente do servidor (validação de payload grande, lote).
**Quando usar:** só depois de medir. É página recente (a API existe na 4.6.7, confira o tipo). No
frontend com CSP restritiva não use. Compile o schema **final**: `.refine()` depois de `z.compile` devolve schema sem compilar.

## Pacotes

#### packages/zod
[doc](https://zod.dev/packages/zod) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/packages/zod.mdx)
**O que é:** a descrição do pacote `zod` (o "flagship"): API por métodos encadeáveis, todo schema
estende `z.ZodType`, que estende `z.$ZodType` de `zod/v4/core`. Lista os métodos de toda instância:
`parse`, `safeParse`, `parseAsync`, `safeParseAsync`, `refine`, `superRefine` (deprecado, use `.check`),
`optional`, `nullable`, `default`, `array`, `or`, `transform`, `catch`, `pipe`, `readonly`, `describe`, `meta`, `brand`, `clone`.
**Para que serve:** saber o que um schema do `zod` tem e o `zod/mini` não.
**Quando usar:** na dúvida entre método e função de topo. A casa usa o `zod` clássico.

#### packages/mini
[doc](https://zod.dev/packages/mini) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/packages/mini.mdx)
**O que é:** `zod/mini` (e o pacote `@zod/mini`): mesma funcionalidade, API funcional que o bundler
consegue podar (`z.string().check(z.minLength(5))` em vez de `.min(5)`). O núcleo cai de cerca de
5,9 KB para 2,1 KB gzip; um objeto simples, de 13,1 KB para 4,0 KB. Sem locale por padrão.
**Para que serve:** bundle de frontend sob restrição extrema de tamanho.
**Quando usar:** quase nunca na casa: no backend o tamanho não pesa (a própria doc mostra o cold start
de Lambda), e o `shared/` roda nos dois lados com a API de métodos. Adoção é decisão do projeto,
registrada em `docs/DECISIONS.md`.

#### packages/core
[doc](https://zod.dev/packages/core) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/packages/core.mdx)
**O que é:** `zod/v4/core`: as classes-base (`$ZodType`, `$ZodObject`, `$ZodCheck`, `$ZodError`), a
união `$ZodTypes`, os tipos de issue, as funções de parse de topo e o objeto `_zod` com as
internas (`def`, `input`, `output`). Pensado para ser estendido, não usado direto no app.
**Para que serve:** escrever ferramenta que percorre schema (gerador de código, conversor).
**Quando usar:** ao ler `schema._zod.def` num `unrepresentable` ou `override` do `toJSONSchema`. Código
de aplicação não importa daqui.

## Quem constrói sobre o Zod

#### library-authors
[doc](https://zod.dev/library-authors) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/library-authors.mdx)
**O que é:** o guia de quem faz biblioteca em cima do Zod: `zod` em `peerDependencies`
(`^4.0.0`), importar só de `zod/v4/core` (o "permalink" do Zod 4), aceitar schema do usuário com
genérico `<T extends z4.$ZodType>` (e não `$ZodType<T>`, que perde a subclasse), parsear com `z4.parse`,
suportar Zod e Zod Mini juntos, distinguir Zod 3 de 4 por `"_zod" in schema`, e o Standard Schema como saída
quando a biblioteca só valida em caixa-preta.
**Para que serve:** entender por que `fastify-type-provider-zod` e `@hookform/resolvers` aceitam o
schema sem depender de uma versão exata, e o que olhar ao avaliar plugin de terceiro.
**Quando usar:** ao escrever um helper de `core/` ou `shared/` que recebe schema como argumento.
Para isso o tipo certo é `T extends z.ZodType`, sem `as`.

#### ecosystem
[doc](https://zod.dev/ecosystem) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/ecosystem.mdx)
**O que é:** o índice de ferramentas que suportam Zod 4: integrações de API, de formulário, "Zod para X"
e "X para Zod", mock, utilitários. No `.mdx` as listas são componentes; o texto traz só os recursos
(tutorial do Total TypeScript, validação de ENV).
**Para que serve:** achar biblioteca pronta antes de escrever a sua.
**Quando usar:** ao precisar de gerador de mock ou conversor de schema. Pacote do ecossistema entra
com a regra da casa de dependência: instalado, na última versão, e com dono ativo.

## Zod 4

#### v4/index
[doc](https://zod.dev/v4) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/v4/index.mdx)
**O que é:** o anúncio da versão 4: desempenho (14 vezes em string, 7 em array, 6,5 em objeto), 100
vezes menos instanciações de `tsc`, núcleo 2 vezes menor, `zod/mini`, registries e `.meta()`,
`z.toJSONSchema`, objetos recursivos sem cast, `z.file`, `locales`, `z.prettifyError`, formatos de string
no topo (`z.email()`), entre outros.
**Para que serve:** o porquê de cada mudança; o guia de migração é a entrada `v4/changelog`.
**Quando usar:** ao justificar uma decisão de design do Zod; para o dia a dia, `api` basta.

#### v4/changelog
[doc](https://zod.dev/v4/changelog) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/v4/changelog.mdx)
**O que é:** o guia de migração do 3 para o 4, por impacto: `error` único no lugar de `message`,
`invalid_type_error`, `required_error` e `errorMap`; `.safeParse` devolve erro que **não** estende
`Error`; issues enxutas; `.format()` e `.flatten()` deprecados; `.strict()`, `.passthrough()` e `.merge()`
deprecados (use `z.strictObject`, `z.looseObject`, `.extend`); `.default()` agora curto-circuita e
`.prefault()` guarda o comportamento antigo; `z.nativeEnum` vira `z.enum`; `z.function()` não é mais schema;
`z.string().ip()` e `.cidr()` saem; `z.uuid()` mais estrito; `z.coerce.*` com input `unknown`;
`z.unknown()` e `z.any()` obrigatórios na chave (desde a 4.4.0, também no parse).
**Para que serve:** subir projeto antigo (Zod 3) e entender erro de tipo depois do upgrade.
**Quando usar:** ao migrar. Regra da casa: versão publicada mais nova, sem ficar em `zod/v3`.

#### v4/versioning
[doc](https://zod.dev/v4/versioning) | [markdown](https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/v4/versioning.mdx)
**O que é:** como o Zod 4 chegou ao npm: primeiro como subpath `zod/v4` junto da `3.25.0`, depois como
`zod@4.0.0` na raiz (2025-07-08). Os subpaths `zod/v4` e `zod/v4-mini` ficam para sempre; a raiz e
`zod/mini` são os nomes novos, e `zod/v3` guarda o Zod 3.
**Para que serve:** entender por que existem três formas de importar e qual não usar (`zod/v4` em
app novo é legado válido, mas a raiz é o nome da casa).
**Quando usar:** ao ver `zod/v4` em código ou README de terceiro (o README do `fastify-type-provider-zod`
importa dele): é o mesmo Zod 4. Troque por `zod` no código da casa.
