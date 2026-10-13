import { glob } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import * as core from '#core/validator'
import { FIELD_LABELS } from '#core/validator'

/**
 * As auditorias estáticas dos validators, todas pelo `toJSONSchema()`.
 *
 * A lista de campos sai dos próprios validators, e não de uma segunda lista
 * para manter em dia - campo novo em desacordo nasce vermelho.
 *
 * Ao lado de `validator.ts` porque é spec transversal: cobre todo validator do
 * projeto, e não uma ação (_padroes/backend.md §7).
 */

type Introspectable = { toJSONSchema: () => unknown }

function isValidator<T>(value: T): value is T & Introspectable {
  if (typeof value !== 'object' || value === null) return false
  if (!('toJSONSchema' in value)) return false

  return typeof value.toJSONSchema === 'function'
}

/** O filho de `node` em `key`, sempre como lista, para a recursão não ramificar. */
function branch(node: unknown, key: string): Array<unknown> {
  if (typeof node !== 'object' || node === null) return []

  // `Reflect.get` e não índice: `key in node` estreita `node`, mas não torna
  // válido indexá-lo por uma `string` qualquer - e a asserção que resolvia
  // isso é a regra 3 do `code-pattern`. Chave ausente devolve `undefined`,
  // que aqui significa o mesmo que ramo vazio.
  const value = Reflect.get(node, key)

  if (value === undefined) return []

  if (Array.isArray(value)) return value

  return [value]
}

/**
 * Todo validator do projeto: os globais de `#core/validator` e o
 * `<recurso>.validator.ts` de cada recurso em `app/features` (_padroes/backend.md
 * §4.4). O glob
 * é o que deixa quebrar o validator por recurso sem perder a rede.
 */
const modulos: Array<Record<string, unknown>> = [core]
for await (const arquivo of glob('app/features/**/*.validator.ts', { cwd: app.appRoot.pathname })) {
  modulos.push(await import(pathToFileURL(app.makePath(arquivo)).href))
}

const validators = modulos.flatMap((modulo) => Object.values(modulo)).filter(isValidator)

test.group('validator > varredura', () => {
  // Sem esta guarda, um glob que não casa nada deixaria as auditorias abaixo
  // verdes olhando só os validators globais.
  test('acha o validator de cada recurso', ({ assert }) => {
    assert.isAbove(modulos.length, 10)
  })
})

/** Todo caminho cujo nó é `type: 'string'`, com o nó junto. */
function strings(schema: unknown, prefix = ''): Array<[string, unknown]> {
  const found: Array<[string, unknown]> = []

  for (const each of branch(schema, 'anyOf')) found.push(...strings(each, prefix))
  for (const each of branch(schema, 'items')) found.push(...strings(each, `${prefix}[]`))

  for (const properties of branch(schema, 'properties')) {
    if (typeof properties !== 'object' || properties === null) continue

    for (const [name, child] of Object.entries(properties)) {
      const path = [prefix, name].filter(Boolean).join('.')

      if (branch(child, 'type').includes('string')) found.push([path, child])

      found.push(...strings(child, path))
    }
  }

  return found
}

/**
 * O teto de tamanho de todo campo de texto.
 *
 * As colunas de texto são `varchar(255)` - é o que `table.string()` do Knex
 * cria - quando a migration não diz outro tamanho. Campo sem teto no validator
 * deixa o valor grande atravessar a validação e estourar no Postgres: o que
 * deveria ser um 422 apontando o campo vira 500 com "erro interno" na tela, e o
 * log do servidor é o único lugar onde aparece o que houve.
 */
test.group('validator > tetos de texto', () => {
  test('todo campo de texto tem limite de tamanho', ({ assert }) => {
    // `format` e `pattern` cobrem quem já limita por outro caminho - `email()`,
    // `uuid()` -, e `enum` não é texto livre.
    const semTeto = validators
      .flatMap((each) => strings(each.toJSONSchema()))
      .filter(([, node]) => {
        if (typeof node !== 'object' || node === null) return false

        return !['maxLength', 'format', 'pattern', 'enum'].some((key) => key in node)
      })
      .map(([path]) => path)

    assert.deepEqual([...new Set(semTeto)].sort(), [])
  })
})

/** Todo caminho de campo do schema, incluindo os aninhados (`parts.etag`). */
function walk(schema: unknown, prefix = ''): Array<string> {
  const paths: Array<string> = []

  // `anyOf` é o que o `.optional()` de um objeto produz: o objeto e o nulo.
  for (const each of branch(schema, 'anyOf')) paths.push(...walk(each, prefix))
  for (const each of branch(schema, 'items')) paths.push(...walk(each, prefix))

  for (const properties of branch(schema, 'properties')) {
    if (typeof properties !== 'object' || properties === null) continue

    for (const [name, child] of Object.entries(properties)) {
      const path = [prefix, name].filter(Boolean).join('.')

      paths.push(path)
      paths.push(...walk(child, path))
    }
  }

  return paths
}

const fields = new Set(validators.flatMap((each) => walk(each.toJSONSchema())))

/**
 * Rótulo legítimo que nunca vai aparecer no `toJSONSchema()`.
 *
 * `passwordConfirmation` não é campo declarado: nasce de
 * `.confirmed({ as: 'passwordConfirmation' })` em `password()`, que é uma
 * regra. O erro é reportado nesse nome, então o rótulo precisa existir - mas o
 * schema não conhece a chave, e sem esta lista o teste de órfãos o acusaria.
 */
const SEM_CAMPO_NO_SCHEMA = ['passwordConfirmation']

/**
 * O nome amigável de todo campo, nos dois sentidos.
 *
 * Campo sem rótulo não quebra nada - só faz a resposta pedir "Informe avatarId"
 * em vez de "Informe o avatar". Por não quebrar, passa despercebido, e é
 * exatamente por isso que a cobrança precisa ser automática.
 */
test.group('validator > rótulos', () => {
  test('todo campo dos validators tem nome em português', ({ assert }) => {
    // O nome cru serve de fallback do VineJS, então basta o último segmento ter
    // rótulo - `parts.etag` cai em `etag` se o caminho completo não estiver
    // listado. Os dois valem, e o caminho completo ganha quando existe.
    const semRotulo = [...fields].filter((path) => {
      if (path in FIELD_LABELS) return false

      const leaf = path.slice(path.lastIndexOf('.') + 1)

      return !(leaf in FIELD_LABELS)
    })

    assert.deepEqual(semRotulo.sort(), [])
  })

  test('não sobra rótulo de campo que não existe mais', ({ assert }) => {
    // O contrário do teste acima: rótulo de campo que já saiu do validator não
    // avisa que está morto, e vai sendo copiado para o próximo recurso.
    const leaves = new Set([...fields].map((path) => path.slice(path.lastIndexOf('.') + 1)))

    const orfaos = Object.keys(FIELD_LABELS).filter((key) => {
      if (SEM_CAMPO_NO_SCHEMA.includes(key)) return false

      return !fields.has(key) && !leaves.has(key)
    })

    assert.deepEqual(orfaos.sort(), [])
  })
})
