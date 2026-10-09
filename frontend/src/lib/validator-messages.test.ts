import { describe, expect, test } from 'vitest'

import * as validator from './validator'
import { FIELD_LABELS, RULE_MESSAGES } from './validator-messages'

/**
 * Campo sem rótulo não quebra nada - só faz a tela pedir "Selecione categoryId"
 * em vez de "Selecione a categoria". Foi exatamente assim que passou: o mapa
 * tinha `category` e o campo se chama `categoryId`, e ninguém viu até uma rodada
 * de QA manual tropeçar nele.
 *
 * O `toJSONSchema()` do VineJS devolve a forma compilada do validator, então a
 * lista de campos sai do próprio schema e não de uma segunda lista para manter
 * em dia. Campo novo sem rótulo nasce com o teste vermelho.
 */

type Introspectable = { toJSONSchema: () => unknown }

/**
 * O `toJSONSchema()` devolve um JSON Schema completo, e redeclarar essa forma
 * aqui seria uma segunda definição para manter em dia. A varredura é em tempo de
 * execução de qualquer jeito, então o nó entra como `unknown` e cada acesso é
 * provado ao descer.
 */
function branch(node: unknown, key: string): Array<unknown> {
  if (typeof node !== 'object' || node === null) return []
  if (!(key in node)) return []

  const value = node[key as keyof typeof node]

  if (Array.isArray(value)) return value

  return [value]
}

/**
 * Genérico e não `(value: unknown)`: `filter` só estreita quando o tipo provado
 * é subtipo do que entrou, e `Object.values` de um módulo devolve uma união
 * larga. `T & Introspectable` é subtipo de `T` por construção - e o `in` prova o
 * acesso, em vez de afirmá-lo com uma asserção.
 */
function isValidator<T>(value: T): value is T & Introspectable {
  if (typeof value !== 'object' || value === null) return false
  if (!('toJSONSchema' in value)) return false

  return typeof value.toJSONSchema === 'function'
}

/** Todo caminho de campo do schema, incluindo os aninhados (`address.cep`). */
function walk(schema: unknown, prefix = ''): Array<string> {
  const paths: Array<string> = []

  // `anyOf` é o que o `.optional()` de um objeto produz: o objeto e o nulo.
  for (const each of branch(schema, 'anyOf')) paths.push(...walk(each, prefix))
  for (const each of branch(schema, 'items')) paths.push(...walk(each, prefix))

  for (const properties of branch(schema, 'properties')) {
    if (typeof properties !== 'object' || properties === null) continue

    for (const [name, child] of Object.entries(properties)) {
      const path = prefix ? `${prefix}.${name}` : name

      paths.push(path)
      paths.push(...walk(child, path))
    }
  }

  return paths
}

/** Todo caminho de campo cujo nó é `type: 'string'`, com o nó junto. */
function strings(schema: unknown, prefix = ''): Array<[string, unknown]> {
  const found: Array<[string, unknown]> = []

  for (const each of branch(schema, 'anyOf'))
    found.push(...strings(each, prefix))
  for (const each of branch(schema, 'items'))
    found.push(...strings(each, `${prefix}[]`))

  for (const properties of branch(schema, 'properties')) {
    if (typeof properties !== 'object' || properties === null) continue

    for (const [name, child] of Object.entries(properties)) {
      const path = prefix ? `${prefix}.${name}` : name

      if (branch(child, 'type').includes('string')) found.push([path, child])

      found.push(...strings(child, path))
    }
  }

  return found
}

const validators = Object.values(validator).filter(isValidator)

const fields = new Set(validators.flatMap((each) => walk(each.toJSONSchema())))

describe('rótulos', () => {
  test('todo campo dos validators tem nome em português', () => {
    // O nome cru serve de fallback do VineJS, então basta o último segmento ter
    // rótulo - `address.cep` cai em `cep` se o caminho completo não estiver
    // listado. Os dois valem, e o caminho completo ganha quando existe.
    const semRotulo = [...fields]
      .filter((path) => {
        if (path in FIELD_LABELS) return false

        const leaf = path.slice(path.lastIndexOf('.') + 1)

        return !(leaf in FIELD_LABELS)
      })
      .sort()

    expect(semRotulo).toEqual([])
  })

  test('não sobra rótulo de campo que não existe mais', () => {
    // O contrário do teste acima: `category` ficou no mapa depois de o campo
    // virar `categoryId`, e um rótulo morto não avisa que está morto.
    const leaves = new Set(
      [...fields].map((path) => path.slice(path.lastIndexOf('.') + 1)),
    )

    const orfaos = Object.keys(FIELD_LABELS)
      .filter((key) => !fields.has(key) && !leaves.has(key))
      .sort()

    expect(orfaos).toEqual([])
  })
})

describe('mensagens', () => {
  test('as regras que os validators usam estão em português', () => {
    // `min` faltava, e o estoque negativo respondia "The stock field must be at
    // least 0" no meio de uma tela inteira em português.
    //
    // A lista é escrita à mão, e é isso que deixa a regra nova passar: ela só é
    // cobrada aqui depois que alguém a acrescenta. Foi assim que `url` e
    // `array.maxLength` sobreviveram até esta task. Regra nova em `validator.ts`
    // entra nesta lista no mesmo commit.
    //
    // `regex`, `checkDigits` e `confirmed` ficam de fora de propósito: todo uso
    // delas já tem chave `campo.regra`, e cobrar a genérica seria cobrar código
    // morto.
    const obrigatorias = [
      'required',
      'string',
      'enum',
      'email',
      'number',
      'boolean',
      'array',
      'object',
      'uuid',
      'minLength',
      'maxLength',
      'fixedLength',
      'min',
      'max',
      'withoutDecimals',
      'url',
      'array.maxLength',
    ]

    const faltando = obrigatorias.filter((rule) => !(rule in RULE_MESSAGES))

    expect(faltando).toEqual([])
  })

  test('nenhuma mensagem escapou em inglês', () => {
    // `{{ field }}` é o marcador do VineJS, e não texto exibido - sai antes da
    // busca, senão toda mensagem que nomeia o campo seria acusada de inglesa.
    const suspeitas = Object.entries(RULE_MESSAGES).filter(([, message]) =>
      /\b(the|must|field|should|at least|at most)\b/i.test(
        message.replace(/\{\{.*?\}\}/g, ''),
      ),
    )

    expect(suspeitas).toEqual([])
  })
})

describe('tetos', () => {
  test('todo campo de texto tem limite de tamanho', () => {
    // As colunas de texto são `varchar(255)` - `table.string()` do Knex - e o
    // slug é `varchar(254)`. Sem teto no validator, o valor grande atravessa a
    // validação e estoura no Postgres: o que deveria ser um 422 apontando o
    // campo vira 500 com "erro interno" na tela.
    //
    // `format` e `pattern` cobrem quem já limita por outro caminho - `email()`,
    // `uuid()`, `cnpj()` -, e `enum` não é texto livre.
    const semTeto = validators
      .flatMap((each) => strings(each.toJSONSchema()))
      .filter(([, node]) => {
        if (typeof node !== 'object' || node === null) return false

        return !['maxLength', 'format', 'pattern', 'enum'].some(
          (key) => key in node,
        )
      })
      .map(([path]) => path)
      .sort()

    expect([...new Set(semTeto)]).toEqual([])
  })
})
