# VineJS

Biblioteca de validação de dados focada em requisição HTTP, com foco em velocidade.

**O que é:** o validador oficial do AdonisJS, também usável sozinho. Você declara um schema, chama
`validate`, e recebe de volta um objeto **tipado** ou uma exceção com os erros. A diferença técnica
para as alternativas é que ele **compila o schema para uma função JavaScript otimizada** na primeira
execução, em vez de interpretar a árvore de regras a cada validação, o que o torna bem mais rápido
em carga alta.

**Para que serve:** garantir que o payload é o que você espera **antes** de qualquer lógica. Depois
da validação, o resto do código pode confiar nos dados, o que elimina verificação defensiva
espalhada. E como o tipo é inferido do schema, você não mantém uma `type` paralela que dessincroniza.

**Como usar:**

```bash
node ace add @vinejs/vine     # em AdonisJS
```

```ts
import vine from '@vinejs/vine'

const createUserValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3),
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8),
    age: vine.number().min(18).optional(),
  })
)

// no controller: payload já vem tipado
const payload = await request.validateUsing(createUserValidator)
```

**Quando usar a biblioteca:** em **todo** schema da stack — um módulo de validator no servidor
(`app/core/validator.ts`, por exemplo) e outro no cliente (`src/lib/validator.ts`). Não é o arranjo
mais comum (fora do AdonisJS, Zod tem ecossistema maior), e a razão está em
[`../_doc-lib.md`](../_doc-lib.md), na seção "VineJS nos dois lados": com bibliotecas diferentes, as
regras do cliente viram tradução das do servidor, e a tradução dessincroniza em silêncio. Com a
mesma, um `cnpj()` do frontend é o `cnpj()` do backend copiado linha a linha.

Um ponto que ajuda no frontend: VineJS é feito para dados **vindos de HTTP**, ou seja, ele espera
strings e converte, enquanto Zod é estrito por padrão. Formulário HTML manda tudo como string, então
o comportamento "esquisito" do VineJS é justamente o que um formulário quer.

**No frontend, quatro coisas que não estão na doc oficial:**

| O quê | Onde |
|---|---|
| `vineResolver(Validator)` liga o validator ao react-hook-form | `@hookform/resolvers/vine`, já instalado |
| `vine.convertEmptyStringsToNull = true` | Espelha o `config/bodyparser.ts` do AdonisJS. O default do core é `false`, e sem isto o `''` de um `<input>` passa no cliente e é recusado pela API |
| `vine.messagesProvider` global | Não há mensagem inline por campo como no Zod. Chave é `campo.regra`, num `lib/validator-messages.ts` |
| **Não** troque `vine.errorReporter` | Vale para os **dois** lados, e contraria o exemplo da página `error_reporter` mais abaixo. No cliente, o `vineResolver` lê `error.messages` no formato do `SimpleErrorReporter`; no servidor, o achatamento feito no handler global de exceções lê o mesmo formato. Um `FieldMapReporter` faz os erros sumirem dos campos sem nenhum aviso |

As duas primeiras configurações valem sobre um **singleton**, então o módulo de validator do cliente
reexporta o `vine` já configurado. Importar `@vinejs/vine` direto num componente compila o schema com a flag
desligada e a mensagem em inglês, dependendo da ordem de carga dos módulos.

Custo a saber antes de discutir bundle: o VineJS arrasta `validator`, `dayjs` e `normalize-url`, e
compila schema com `new Function`. O chunk de validação do cliente ficou em ~49 KB gzip, contra
~15 KB do Zod que ele substituiu. O `new Function` também significa que a página quebraria sob CSP
sem `unsafe-eval` — hoje não há CSP.

**O detalhe que economiza horas:** formulário HTML manda tudo como string, e checkbox desmarcado
simplesmente **não aparece** no payload. VineJS trata isso de propósito, e a página
`html_forms_and_surprises` é a que explica por que `vine.boolean()` aceita `"on"` e `"true"`. Ler
essa página cedo evita muita confusão.

**Links:** 26.

---

## Fundamentos

#### introduction
[doc](https://vinejs.dev/docs/introduction)

**O que é:** a apresentação da biblioteca, com o foco em validação de corpo de requisição e a
estratégia de compilar o schema.
**Para que serve:** entender o recorte e por que ele é rápido.
**Quando usar:** primeira leitura, e ao comparar com Zod, Yup ou Joi.

```ts
import vine from '@vinejs/vine'

// O ciclo inteiro da biblioteca: declarar, compilar uma vez, validar muitas.
const validator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8),
  })
)

const dados = await validator.validate({ email: 'a@b.com', password: 'segredo123' })
// dados: { email: string; password: string }  <- tipo inferido, sem type paralela
```

#### getting_started
[doc](https://vinejs.dev/docs/getting_started)

**O que é:** instalação, o primeiro schema, `validate`, `vine.compile` e o tratamento de erro.
**Para que serve:** sair do zero até uma validação funcionando.
**Quando usar:** no primeiro uso. **Compile o schema fora do handler**, uma vez, para aproveitar a
otimização; compilar a cada requisição joga fora a principal vantagem da biblioteca.

```ts
import vine, { errors } from '@vinejs/vine'

// CERTO: compilado uma vez, no topo do módulo
export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string(),
  })
)

async function login(body: unknown) {
  try {
    return await loginValidator.validate(body)
  } catch (error) {
    if (error instanceof errors.E_VALIDATION_ERROR) {
      console.log(error.messages)
      // [{ field: 'email', rule: 'email', message: 'The email field must be a valid email address' }]
    }
    throw error
  }
}

// ERRADO: vine.compile() dentro do handler recompila a cada requisição
```

#### schema_101
[doc](https://vinejs.dev/docs/schema_101)

**O que é:** os fundamentos da construção de schema: tipos, encadeamento de regras, campos
opcionais, valores nulos, `parse` e `transform`.
**Para que serve:** o vocabulário base, sobre o qual todo o resto se apoia.
**Quando usar:** **antes de escrever o segundo schema**. A distinção entre `optional`, `nullable` e
`nullish` é sutil e escolher a errada gera bug em edição parcial de registro.

```ts
import vine from '@vinejs/vine'

const schema = vine.object({
  // obrigatório
  name: vine.string().trim().minLength(3),

  // optional: a chave pode NÃO VIR. Tipo: string | undefined
  phone: vine.string().optional(),

  // nullable: a chave VEM, mas pode ser null. Tipo: string | null
  deletedReason: vine.string().nullable(),

  // nullish: pode não vir OU vir null. Tipo: string | null | undefined
  notes: vine.string().nullish(),

  // parse roda ANTES das regras: bom para valor padrão
  role: vine.string().parse((value) => value ?? 'user'),

  // transform roda DEPOIS das regras: muda o tipo de saída
  tags: vine
    .string()
    .transform((value) => value.split(',').map((t) => t.trim())),
})

// Em edição parcial (PATCH), optional é o certo: campo ausente = "não mexer".
// nullable seria "apagar o valor". Trocar os dois apaga dado sem querer.
```

#### html_forms_and_surprises
[doc](https://vinejs.dev/docs/html_forms_and_surprises)

**O que é:** as decisões de design que lidam com as esquisitices de formulário HTML: tudo chega como
string, checkbox desmarcado some, campo vazio vira `""` e não `undefined`.
**Para que serve:** entender por que VineJS converte tipos automaticamente, ao contrário de
validadores estritos.
**Quando usar:** **leia cedo**. É a página que explica o comportamento mais surpreendente da
biblioteca para quem vem do Zod, e evita "por que ele aceitou uma string onde eu pedi número?".

```ts
import vine from '@vinejs/vine'

const schema = vine.compile(
  vine.object({
    age: vine.number(), // aceita "25" (string) e devolve 25 (number)
    active: vine.boolean(), // aceita "on", "true", "1", 1
    // checkbox desmarcado NÃO chega no payload, então precisa de default
    newsletter: vine.boolean().optional(),
  })
)

// payload real de um <form> HTML: tudo string
const out = await schema.validate({ age: '25', active: 'on' })
console.log(out) // { age: 25, active: true }
console.log(typeof out.age) // "number"

// Outra surpresa: string vazia é tratada como null/ausente, então um <input>
// vazio não dispara minLength, e sim "obrigatório".
//
// Isso NÃO é o default do VineJS: o core vem com
// `convertEmptyStringsToNull = false`. Quem liga a flag é o bodyparser do
// AdonisJS (`config/bodyparser.ts`); no frontend, é o módulo de validator que
// liga à mão, para os dois lados recusarem as mesmas coisas.
```

#### conditional_validation
[doc](https://vinejs.dev/docs/conditional_validation)

**O que é:** validação condicional, com `requiredWhen`, `requiredIfExists` e a família de regras que
dependem de outro campo.
**Para que serve:** regras do tipo "se o tipo for pessoa jurídica, o CNPJ é obrigatório".
**Quando usar:** em formulário com campos que dependem uns dos outros. Resolve dentro do schema o que
normalmente viraria `if` no controller.

```ts
import vine from '@vinejs/vine'

const schema = vine.compile(
  vine.object({
    personType: vine.enum(['individual', 'company']),

    // obrigatório só quando personType === 'company'
    cnpj: vine
      .string()
      .fixedLength(14)
      .optional()
      .requiredWhen('personType', '=', 'company'),

    cpf: vine
      .string()
      .fixedLength(11)
      .optional()
      .requiredWhen('personType', '=', 'individual'),

    // obrigatório se outro campo veio no payload
    passwordConfirmation: vine.string().optional().requiredIfExists('password'),
    password: vine.string().minLength(8).optional(),
  })
)
```

#### field_context
[doc](https://vinejs.dev/docs/field_context)

**O que é:** o objeto de contexto que cada regra recebe, com o valor, o nome do campo, o caminho
completo e os dados irmãos.
**Para que serve:** escrever regras que enxergam além do próprio campo.
**Quando usar:** ao criar regra customizada que precisa comparar com outro campo, como confirmação
de senha.

```ts
import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'

// Regra que enxerga os campos irmãos através do contexto.
const priceLowerThan = vine.createRule(
  (value: unknown, otherField: string, field: FieldContext) => {
    if (typeof value !== 'number') return

    const other = field.parent[otherField] // campos irmãos no mesmo objeto

    if (typeof other === 'number' && value >= other) {
      field.report(
        'O campo {{ field }} deve ser menor que {{ other }}',
        'priceLowerThan',
        field,
        { other: otherField }
      )
    }
  }
)

const schema = vine.compile(
  vine.object({
    price: vine.number().positive(),
    discountedPrice: vine.number().positive().optional().use(priceLowerThan('price')),
  })
)

// field.name  -> "discountedPrice"
// field.wildCardPath -> "items.0.discountedPrice" dentro de arrays
```

## Mensagens e erros

#### custom_error_messages
[doc](https://vinejs.dev/docs/custom_error_messages)

**O que é:** customizar mensagens por regra, por campo e globalmente, com interpolação e nomes
amigáveis de campo.
**Para que serve:** erros em português, dizendo "O e-mail é obrigatório" em vez do texto padrão em
inglês.
**Quando usar:** **ao acrescentar campo ou regra**. Já está definido nos dois lados, e é onde a
mensagem nova entra:

| Lado | Onde declarar |
|---|---|
| Servidor | Um arquivo de boot (`start/…`), junto do `VineDate.transform`, registrado como preload no `adonisrc.ts` |
| Cliente | Um módulo de mensagens, atribuído no mesmo módulo que reexporta o `vine` |

São duas declarações do mesmo conteúdo, pelo mesmo motivo dos validators: o backend não publica os
seus como pacote. O servidor costuma ter um superconjunto de campos, porque valida coisas que nunca
passam por formulário (id de relação, id de arquivo, upload).

Duas armadilhas que custam tempo:

- O segundo mapa troca só o `{{ field }}` **exibido**. A chave do erro continua sendo o caminho do
  campo (`address.cep`), e é ela que o frontend usa para marcar o input. Renomear chave quebra o
  mapeamento de erro do wizard de cadastro.
- Os nomes amigáveis carregam artigo ("o preço"), o que funciona depois de um verbo — "Informe o
  preço" — e falha quando `{{ field }}` inicia a frase, saindo em minúscula. Por isso as regras cujo
  texto começaria pelo campo omitem o `{{ field }}`: o erro aparece sob o campo rotulado de qualquer
  jeito.

Uma limitação a conhecer antes de tentar: regras repetidas no mesmo campo compartilham a chave. Os
quatro `.regex()` de `password()` são todos `password.regex`, e o VineJS para na primeira que falha —
não há como dizer qual classe de caractere faltou, e a mensagem lista as quatro.

```ts
import vine, { SimpleMessagesProvider } from '@vinejs/vine'

// Uma vez, no boot da aplicação: vale para TODOS os schemas.
vine.messagesProvider = new SimpleMessagesProvider(
  {
    // por regra
    required: 'O campo {{ field }} é obrigatório',
    string: 'O campo {{ field }} deve ser um texto',
    email: 'Informe um e-mail válido',
    minLength: 'O campo {{ field }} deve ter no mínimo {{ min }} caracteres',

    // por campo específico, sobrescreve a regra
    'password.minLength': 'A senha precisa de ao menos 8 caracteres',
  },
  {
    // nomes amigáveis, para {{ field }} não sair "legalName"
    email: 'e-mail',
    legalName: 'razão social',
    password: 'senha',
  }
)
```

#### error_reporter
[doc](https://vinejs.dev/docs/error_reporter)

**O que é:** o repórter de erros, que define o **formato** da resposta de erro, com o formato simples
e o JSON API, além do repórter customizado.
**Para que serve:** padronizar o corpo do erro de validação em toda a API.
**Quando usar:** para **entender o mecanismo, e não para trocar o repórter**. O objetivo — um
formato único que o frontend trate num lugar só — se alcança de outro jeito: um `toFieldErrors` no
handler global de exceções (`app/exceptions/handler.ts`) que achata `{ field, rule, message }` em
`{ campo: mensagem }` depois da validação.

Trocar `vine.errorReporter` pelo exemplo abaixo quebraria os dois lados de uma vez, porque ambos leem
o formato do `SimpleErrorReporter`: o `toFieldErrors` no servidor e o `vineResolver` no cliente. O
sintoma é silencioso — erro que existe e campo que não fica vermelho.

```ts
import vine from '@vinejs/vine'
import type { ErrorReporterContract, FieldContext } from '@vinejs/vine/types'

// NÃO use nesta stack: veja o parágrafo acima. Está aqui porque é o exemplo
// canônico de repórter customizado, útil em projeto com outro arranjo.
class FieldMapReporter implements ErrorReporterContract {
  hasErrors = false
  errors: Record<string, string[]> = {}

  report(message: string, _rule: string, field: FieldContext) {
    this.hasErrors = true
    const key = field.wildCardPath
    this.errors[key] ??= []
    this.errors[key].push(message)
  }

  createError() {
    return new Error(JSON.stringify(this.errors))
  }
}

vine.errorReporter = () => new FieldMapReporter()
// saída: { "email": ["Informe um e-mail válido"], "password": ["..."] }
```

#### helpers
[doc](https://vinejs.dev/docs/helpers)

**O que é:** os utilitários de checagem expostos pela biblioteca, como verificações de tipo e de
formato reutilizáveis.
**Para que serve:** reaproveitar a lógica interna ao escrever regras próprias.
**Quando usar:** ao criar regra customizada, antes de escrever a verificação do zero.

```ts
import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'

// vine.helpers traz as mesmas checagens que as regras embutidas usam.
const cnpjRule = vine.createRule((value: unknown, _opts, field: FieldContext) => {
  if (typeof value !== 'string') return

  const digits = value.replace(/\D/g, '')

  // helpers em vez de regex própria
  if (!vine.helpers.isLength(digits, 14) || !vine.helpers.isNumeric(digits)) {
    field.report('CNPJ inválido', 'cnpj', field)
  }
})

// outros úteis:
// vine.helpers.isEmail(v)   vine.helpers.isURL(v)    vine.helpers.isUUID(v)
// vine.helpers.isMobilePhone(v, 'pt-BR')             vine.helpers.isDecimal(v)
// vine.helpers.exists(v)    vine.helpers.isMissing(v)
```

#### json-schema-generation
[doc](https://vinejs.dev/docs/json-schema-generation)

**O que é:** gerar JSON Schema a partir de um schema VineJS.
**Para que serve:** alimentar documentação OpenAPI ou compartilhar o contrato com outra linguagem.
**Quando usar:** ao gerar documentação de API automaticamente, sem manter o schema duas vezes.

```ts
import vine from '@vinejs/vine'

// `toJSONSchema` é método de INSTÂNCIA do validator compilado, não função
// estática de `vine`. `vine.toJSONSchema(schema)` não existe no v4 — todo
// `vine.create(...)` do projeto já traz o método.
const CreateUserValidator = vine.create({
  name: vine.string().minLength(3),
  email: vine.string().email(),
  age: vine.number().min(18).optional(),
})

// o mesmo schema que valida também documenta
const jsonSchema = CreateUserValidator.toJSONSchema()

console.log(JSON.stringify(jsonSchema, null, 2))
// {
//   "type": "object",
//   "properties": {
//     "name": { "type": "string", "minLength": 3 },
//     "email": { "type": "string", "format": "email" },
//     "age": { "type": "number", "minimum": 18 }
//   },
//   "required": ["name", "email"],
//   "additionalProperties": false
// }

// esse objeto entra direto no components.schemas de um documento OpenAPI
```

**Quatro lacunas medidas no 4.4.0**, todas silenciosas — o schema sai válido e
errado:

```ts
vine.date()                  // -> {}              (perde o tipo)
vine.date().nullable()       // -> {"type":"null"} (afirma que SÓ pode ser nulo)
vine.boolean()               // -> enum com as 9 representações que ele aceita,
                             //    o que vira união de 9 literais em cliente gerado

vine.string().regex(/[a-z]/).regex(/[A-Z]/)  // -> um `pattern` só, o último
vine.string().confirmed({ as: 'x' })         // -> `x` não aparece no schema
```

Quem gera documentação a partir disso precisa percorrer `validator.toJSON()`
em paralelo — é a árvore interna, e nela o `subtype` do campo sobrevive.

**Um gerador que leia as rotas e os validators reais resolve isso de uma vez**,
em vez de cada chamada de `toJSONSchema()` remendar as lacunas por conta.
[`openapi.md`](openapi.md) descreve um assim, e serve de planta: as seções
`correcoes-de-schema` e `correcoes-por-campo` listam as quatro correções antes
de você escrever conversão própria.

## Tipos

#### types/string
[doc](https://vinejs.dev/docs/types/string)

**O que é:** o tipo string e suas regras: `email`, `url`, `regex`, `minLength`, `maxLength`, `trim`,
`escape`, `confirmed`, `uuid`, `in` e outras.
**Para que serve:** de longe o tipo mais usado, e o que tem mais regras prontas.
**Quando usar:** o tempo todo. Vale ler a lista inteira uma vez: `confirmed` (confirmação de senha) e
`normalizeEmail` já resolvem casos que muita gente implementa na mão.

```ts
import vine from '@vinejs/vine'

const schema = vine.object({
  name: vine.string().trim().minLength(3).maxLength(120),

  // normalizeEmail deixa minúsculo e remove pontos do gmail antes de gravar
  email: vine.string().trim().email().normalizeEmail(),

  // confirmed exige um campo "password_confirmation" idêntico
  password: vine.string().minLength(8).confirmed(),

  slug: vine.string().regex(/^[a-z0-9-]+$/),
  website: vine.string().url().optional(),
  categoryId: vine.string().uuid(),

  // escape protege contra HTML injetado em campo exibido depois
  bio: vine.string().escape().maxLength(500).optional(),

  status: vine.string().in(['draft', 'published']),
})
```

#### types/boolean
[doc](https://vinejs.dev/docs/types/boolean)

**O que é:** o tipo booleano, que aceita as representações de formulário HTML (`"on"`, `"true"`,
`"1"`) e converte.
**Para que serve:** checkbox e switch que chegam como string.
**Quando usar:** em qualquer campo de sim ou não. Lembre que checkbox desmarcado **não chega no
payload**, então normalmente ele precisa ser opcional com valor padrão.

```ts
import vine from '@vinejs/vine'

const schema = vine.compile(
  vine.object({
    // padrão: aceita "on", "true", "1", 1, true
    chargeTax: vine.boolean().optional(),

    // checkbox desmarcado some do payload: parse garante o valor
    newsletter: vine.boolean().parse((value) => value ?? false),

    // strict(): só aceita booleano de verdade, útil em API JSON
    isAdmin: vine.boolean({ strict: true }).optional(),
  })
)

await schema.validate({ chargeTax: 'on' }) // { chargeTax: true, newsletter: false }
```

#### types/number
[doc](https://vinejs.dev/docs/types/number)

**O que é:** o tipo numérico, com `min`, `max`, `range`, `positive`, `decimal` e a conversão a partir
de string.
**Para que serve:** quantidade, preço, paginação.
**Quando usar:** em todo campo numérico. Para dinheiro, valide como inteiro em centavos, que evita
os erros de arredondamento de ponto flutuante.

```ts
import vine from '@vinejs/vine'

const schema = vine.object({
  // dinheiro em centavos: inteiro, sem ponto flutuante
  price: vine.number().withoutDecimals().positive(),

  stock: vine.number().withoutDecimals().min(0),
  rating: vine.number().range([0, 5]).decimal([0, 1]).optional(),

  // paginação com valor padrão
  page: vine.number().withoutDecimals().min(1).parse((v) => v ?? 1),
  perPage: vine.number().withoutDecimals().range([1, 100]).parse((v) => v ?? 20),
})

// "2499" (string da query) vira 2499 (number) automaticamente
```

#### types/date
[doc](https://vinejs.dev/docs/types/date)

**O que é:** o tipo data, com formatos aceitos e comparações (`after`, `before`, `afterField`).
**Para que serve:** datas validadas e comparadas entre si, como início antes do fim.
**Quando usar:** em campos de data e de período. Defina o formato esperado explicitamente, porque
depender do parse automático de data é fonte garantida de bug de fuso.

```ts
import vine from '@vinejs/vine'

const schema = vine.object({
  // formato explícito: sem adivinhação de fuso
  startsAt: vine.date({ formats: ['YYYY-MM-DD'] }).after('today'),

  // comparação com outro campo do payload
  endsAt: vine.date({ formats: ['YYYY-MM-DD'] }).afterField('startsAt'),

  birthDate: vine.date({ formats: ['YYYY-MM-DD'] }).before('today'),
})

// o valor de saída é um objeto Date, não string
```

#### types/accepted
[doc](https://vinejs.dev/docs/types/accepted)

**O que é:** o tipo que exige um valor de aceitação explícita, como `"on"` ou `true`.
**Para que serve:** o checkbox de "li e aceito os termos", que precisa ser obrigatoriamente marcado.
**Quando usar:** exatamente nesse caso. Mais claro que um booleano com regra de "tem que ser
verdadeiro".

```ts
import vine from '@vinejs/vine'

const signupSchema = vine.compile(
  vine.object({
    email: vine.string().email(),
    // falha se vier false, "off", ou não vier: aceitação tem que ser explícita
    acceptTerms: vine.accepted(),
  })
)

await signupSchema.validate({ email: 'a@b.com', acceptTerms: 'on' }) // ok
await signupSchema.validate({ email: 'a@b.com' }) // erro de validação
```

#### types/enum
[doc](https://vinejs.dev/docs/types/enum)

**O que é:** validação contra uma lista fixa de valores, aceitando array, enum nativo ou função.
**Para que serve:** campos de status, papel e categoria com valores fechados.
**Quando usar:** **sempre que houver conjunto fechado de valores**. Alimente o enum a partir do mesmo
objeto constante que o resto do código usa, e o banco, o tipo e a validação nunca divergem.

```ts
import vine from '@vinejs/vine'

// fonte única da verdade: a migration, o tipo e o validator leem daqui
export const UserRoles = {
  owner: 'owner',
  admin: 'admin',
  member: 'member',
} as const

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles]

const schema = vine.object({
  role: vine.enum(Object.values(UserRoles)),

  // enum dinâmico: a lista depende de outro campo do payload
  status: vine.enum((field) =>
    field.parent.role === 'member' ? ['active', 'inactive'] : ['active']
  ),
})
```

#### types/literal
[doc](https://vinejs.dev/docs/types/literal)

**O que é:** validação contra um único valor exato.
**Para que serve:** campos discriminadores em uniões, e valores fixos de contrato.
**Quando usar:** principalmente como discriminante dentro de `union`.

```ts
import vine from '@vinejs/vine'

const webhookSchema = vine.object({
  // o valor é fixo: qualquer outra coisa é erro de validação
  apiVersion: vine.literal('2026-01-01'),
  event: vine.literal('payment.succeeded'),
  data: vine.object({ id: vine.string() }),
})
```

#### types/object
[doc](https://vinejs.dev/docs/types/object)

**O que é:** objetos, com aninhamento, `allowUnknownProperties`, `merge`, `groups` e `toCamelCase`.
**Para que serve:** a raiz de praticamente todo schema de requisição.
**Quando usar:** em todo schema. Por padrão, **propriedades desconhecidas são removidas**, o que é
uma proteção contra mass assignment e uma das melhores decisões padrão da biblioteca.

```ts
import vine from '@vinejs/vine'

const schema = vine.compile(
  vine.object({
    name: vine.string(),
    // objeto aninhado
    address: vine.object({
      cep: vine.string().fixedLength(8),
      city: vine.string(),
      uf: vine.string().fixedLength(2),
    }),
  })
)

// role: 'owner' vem no payload mas NÃO está no schema:
// é descartado silenciosamente, e é isso que impede mass assignment
const out = await schema.validate({
  name: 'Acme',
  role: 'owner',
  address: { cep: '01001000', city: 'SP', uf: 'SP' },
})
console.log(out) // sem a chave role

// reuso entre criar e editar
const baseFields = { name: vine.string(), email: vine.string().email() }
const createSchema = vine.object({ ...baseFields, password: vine.string().minLength(8) })
```

#### types/record
[doc](https://vinejs.dev/docs/types/record)

**O que é:** objeto com chaves dinâmicas e valores de um mesmo tipo.
**Para que serve:** mapas do tipo "chave qualquer para valor conhecido", como um objeto de
traduções.
**Quando usar:** quando as chaves não são conhecidas de antemão. Se são, `object` é mais específico e
melhor.

```ts
import vine from '@vinejs/vine'

const schema = vine.object({
  // as chaves são desconhecidas (códigos de idioma), os valores não
  translations: vine.record(vine.string().minLength(1)),

  // atributos dinâmicos de post
  attributes: vine.record(vine.string()).optional(),
})

await schema.validate({
  translations: { 'pt-BR': 'Camiseta', en: 'T-shirt' },
  attributes: { cor: 'azul', tamanho: 'M' },
})
```

#### types/array
[doc](https://vinejs.dev/docs/types/array)

**O que é:** arrays, com tipo dos itens, `minLength`, `maxLength`, `distinct` e `compact`.
**Para que serve:** listas de ids, de tags e de itens de um pedido.
**Quando usar:** em campos de múltipla seleção. `distinct` evita o mesmo id enviado duas vezes, que é
um caso comum de formulário com checkboxes.

```ts
import vine from '@vinejs/vine'

const schema = vine.object({
  // checkboxes podem mandar o mesmo id duas vezes: distinct barra
  subcategoryIds: vine.array(vine.string().uuid()).distinct().maxLength(10).optional(),

  // compact remove nulos e strings vazias antes de validar
  tags: vine.array(vine.string().trim()).compact().optional(),

  // array de objetos
  items: vine
    .array(
      vine.object({
        postId: vine.string().uuid(),
        quantity: vine.number().withoutDecimals().min(1),
      })
    )
    .minLength(1),

  // distinct por campo, quando os itens são objetos
  images: vine.array(vine.object({ storageId: vine.string().uuid() })).distinct('storageId'),
})
```

#### types/tuple
[doc](https://vinejs.dev/docs/types/tuple)

**O que é:** array de tamanho fixo com tipo próprio em cada posição.
**Para que serve:** pares como coordenadas ou intervalos de dois valores.
**Quando usar:** raro em API. Um objeto nomeado costuma ser mais legível que uma tupla posicional.

```ts
import vine from '@vinejs/vine'

const schema = vine.object({
  // [longitude, latitude] no formato GeoJSON
  coordinates: vine.tuple([vine.number(), vine.number()]),

  // faixa de preço: [min, max]
  priceRange: vine.tuple([vine.number().min(0), vine.number().min(0)]),
})

// Compare com a alternativa mais legível, que costuma ser preferível:
// priceRange: vine.object({ min: vine.number(), max: vine.number() })
```

#### types/union
[doc](https://vinejs.dev/docs/types/union)

**O que é:** um campo que aceita mais de um formato, com uniões discriminadas por um campo.
**Para que serve:** payloads que variam de forma conforme um tipo, como pessoa física e pessoa
jurídica.
**Quando usar:** quando o corpo muda de estrutura conforme um campo. A união discriminada dá
mensagem de erro muito melhor que uma união solta.

```ts
import vine from '@vinejs/vine'

const schema = vine.object({
  // o campo "type" decide qual schema aplicar
  payer: vine.union([
    vine.union.if(
      (value) => vine.helpers.isObject(value) && value.type === 'individual',
      vine.object({
        type: vine.literal('individual'),
        cpf: vine.string().fixedLength(11),
        fullName: vine.string(),
      })
    ),
    vine.union.if(
      (value) => vine.helpers.isObject(value) && value.type === 'company',
      vine.object({
        type: vine.literal('company'),
        cnpj: vine.string().fixedLength(14),
        legalName: vine.string(),
      })
    ),
    vine.union.else(
      vine.object({}).parse(() => {
        throw new Error('Informe type: individual ou company')
      })
    ),
  ]),
})
```

#### types/any
[doc](https://vinejs.dev/docs/types/any)

**O que é:** o tipo que aceita qualquer valor, sem validar.
**Para que serve:** escapar da validação num campo específico.
**Quando usar:** **evite**. Cada `any` é um buraco na garantia que a validação deveria dar. Se
precisar, isole no menor campo possível.

```ts
import vine from '@vinejs/vine'

const schema = vine.object({
  event: vine.string(),
  // payload opaco de terceiro: a estrutura não é nossa e muda sem aviso
  rawPayload: vine.any(),
})

// Melhor que any sempre que der: validar o pouco que você realmente usa
const melhor = vine.object({
  event: vine.string(),
  rawPayload: vine.object({ id: vine.string() }).allowUnknownProperties(),
})
```

#### types/native_file
[doc](https://vinejs.dev/docs/types/native_file)

**O que é:** validação do `File` nativo da web, com tamanho e tipo.
**Para que serve:** validar upload fora do AdonisJS, em ambiente com a API `File` padrão.
**Quando usar:** em runtime com `File` nativo. Dentro do AdonisJS, a validação de upload multipart
tem uma regra própria, documentada na doc do framework.

```ts
import vine from '@vinejs/vine'

const schema = vine.compile(
  vine.object({
    avatar: vine.file({
      size: '2mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    }),
    documents: vine
      .array(vine.file({ size: '10mb', extnames: ['pdf'] }))
      .maxLength(5)
      .optional(),
  })
)

// vindo de um FormData do navegador ou de um runtime com File nativo
const form = new FormData()
const payload = await schema.validate(Object.fromEntries(form))
```

## Estender

#### extend/custom_rules
[doc](https://vinejs.dev/docs/extend/custom_rules)

**O que é:** criar regras próprias, síncronas ou assíncronas, e encaixá-las no encadeamento dos
tipos existentes.
**Para que serve:** validações de domínio, como CPF, CNPJ, ou "este e-mail já existe no banco".
**Quando usar:** **na primeira regra de negócio que se repetir**. Uma regra `unique` que consulta o
banco dentro do schema é muito melhor que a consulta espalhada no controller.

```ts
import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'

// Regra assíncrona que consulta o banco.
type UniqueOptions = { table: string; column: string; ignoreId?: string }

const uniqueRule = vine.createRule(
  async (value: unknown, options: UniqueOptions, field: FieldContext) => {
    if (typeof value !== 'string') return

    const query = db.from(options.table).where(options.column, value)
    if (options.ignoreId) query.whereNot('id', options.ignoreId) // edição: ignora o próprio

    const row = await query.first()
    if (row) {
      field.report('O campo {{ field }} já está em uso', 'unique', field)
    }
  }
)

export const unique = (options: UniqueOptions) => uniqueRule(options)

const createUser = vine.compile(
  vine.object({
    email: vine.string().email().use(unique({ table: 'users', column: 'email' })),
  })
)
```

#### extend/custom_schema_types
[doc](https://vinejs.dev/docs/extend/custom_schema_types)

**O que é:** criar um tipo de schema completamente novo, e não só uma regra sobre um tipo existente.
**Para que serve:** tipos de domínio com comportamento próprio de conversão e validação.
**Quando usar:** raro. Uma regra customizada resolve quase todos os casos com muito menos código.
Chegue aqui só se realmente precisar de um tipo com semântica própria.

```ts
import vine from '@vinejs/vine'
import { VineString } from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'

// Antes de criar um TIPO novo, veja se um macro sobre o tipo existente resolve.
// Macro: adiciona um método encadeável a VineString, com uma linha.
const cnpjRule = vine.createRule((value: unknown, _opts, field: FieldContext) => {
  const digits = String(value).replace(/\D/g, '')
  if (digits.length !== 14) field.report('CNPJ inválido', 'cnpj', field)
})

VineString.macro('cnpj', function (this: VineString) {
  return this.use(cnpjRule())
})

declare module '@vinejs/vine' {
  interface VineString {
    cnpj(): this
  }
}

// agora existe em qualquer string, encadeável como as regras nativas
const schema = vine.object({
  cnpj: vine.string().trim().cnpj(),
})
```
