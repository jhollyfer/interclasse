import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import ts from 'typescript'
import type { LucidModel } from '@adonisjs/lucid/types/model'
import type { ModelResource, RelationMap, SchemaObject } from './types.ts'

/**
 * Model do Lucid -> JSON Schema da resposta.
 *
 * O corpo de uma resposta é o model serializado com as relações que o use-case
 * precarregou. Descrevê-lo num segundo lugar - um schema VineJS por feature -
 * era manter o mesmo contrato escrito duas vezes, e a divergência aparecia como
 * documentação errada, nunca como erro de compilação.
 *
 * O que o Lucid entrega em runtime e o que ele não entrega:
 *
 * | Pergunta                                | Onde a resposta está         |
 * | --------------------------------------- | ---------------------------- |
 * | Quais campos saem no JSON               | `$columnsDefinitions`        |
 * | Qual campo é escondido                  | `serializeAs: null`          |
 * | Quais campos derivados existem          | `$computedDefinitions`       |
 * | Qual model está do outro lado da relação | `$relationsDefinitions`      |
 * | O **tipo** de cada campo                | em lugar nenhum - é TypeScript |
 *
 * A última linha é o motivo deste arquivo ler AST: o tipo só existe no código.
 * `database/schema.ts` é gerado das colunas e declara todas elas; os arquivos de
 * `app/models/` redeclaram o que o gerador tipa fraco (`tags` como `any`, `size`
 * como `bigint`) e declaram os getters computados - `url` de `Storage` é um.
 * A redeclaração vence quando o tipo dela é reconhecível.
 */

/** Onde o tipo de cada propriedade de cada classe mora, indexado por classe. */
export type TypeIndex = Map<string, Map<string, SchemaObject>>

const DATE_TIME: SchemaObject = { type: 'string', format: 'date-time' }

/** Os tipos primitivos que uma coluna pode declarar, e o que cada um vira. */
const PRIMITIVES: Record<string, SchemaObject> = {
  string: { type: 'string' },
  number: { type: 'number' },
  boolean: { type: 'boolean' },
  bigint: { type: 'number' },
  DateTime: DATE_TIME,
}

/**
 * O `null` de uma união.
 *
 * Não é `SyntaxKind.NullKeyword` solto: em posição de tipo, o TypeScript o
 * embrulha num `LiteralTypeNode`. Conferir o `kind` do nó direto passa por todo
 * `| null` sem ver, e o documento sai afirmando que `deletedAt` nunca é nulo.
 */
function isNull(node: ts.TypeNode): boolean {
  return ts.isLiteralTypeNode(node) && node.literal.kind === ts.SyntaxKind.NullKeyword
}

/**
 * O nó de tipo do TypeScript vira JSON Schema, ou `undefined` quando não é
 * reconhecível - um alias (`UploadStatus`), um genérico, um `any`.
 *
 * `undefined` não é falha: é o sinal de que quem chamou deve procurar o tipo na
 * outra fonte, e é o que faz a redeclaração do model só valer quando acrescenta
 * informação.
 */
function fromTypeNode(node: ts.TypeNode | undefined): SchemaObject | undefined {
  if (!node) return undefined

  if (ts.isUnionTypeNode(node)) {
    const nullable = node.types.some(isNull)
    const named = node.types.filter((member) => !isNull(member))

    // `bigint | number` e afins: o primeiro membro reconhecível manda, porque a
    // coluna só tem um formato no fio - quem normaliza é o `consume` do model.
    for (const member of named) {
      const schema = fromTypeNode(member)

      if (!schema) continue
      if (!nullable) return schema
      if (typeof schema.type !== 'string') return schema

      return { ...schema, type: [schema.type, 'null'] }
    }

    return undefined
  }

  if (ts.isArrayTypeNode(node)) {
    const items = fromTypeNode(node.elementType)

    if (!items) return undefined

    return { type: 'array', items }
  }

  if (ts.isTypeReferenceNode(node)) {
    const name = node.typeName.getText()

    if (name === 'Array') {
      const items = fromTypeNode(node.typeArguments?.[0])

      if (!items) return undefined

      return { type: 'array', items }
    }

    return PRIMITIVES[name]
  }

  return PRIMITIVES[node.getText()]
}

/**
 * As propriedades de cada classe de um arquivo, com o tipo de cada uma.
 *
 * Lê as duas formas que interessam: `declare campo: Tipo`, que é como coluna se
 * declara no Lucid, e `get campo(): Tipo`, que é como um `@computed` se declara.
 */
async function indexFile(file: string, index: TypeIndex): Promise<void> {
  const source = ts.createSourceFile(
    file,
    await readFile(file, 'utf-8'),
    ts.ScriptTarget.Latest,
    true
  )

  for (const statement of source.statements) {
    if (!ts.isClassDeclaration(statement) || !statement.name) continue

    const properties = index.get(statement.name.text) ?? new Map<string, SchemaObject>()

    for (const member of statement.members) {
      if (!member.name || !ts.isIdentifier(member.name)) continue

      let schema: SchemaObject | undefined

      if (ts.isPropertyDeclaration(member)) schema = fromTypeNode(member.type)
      if (ts.isGetAccessor(member)) schema = fromTypeNode(member.type)

      if (schema) properties.set(member.name.text, schema)
    }

    index.set(statement.name.text, properties)
  }
}

let cached: TypeIndex | undefined

/**
 * O índice de tipos, montado uma vez por execução do gerador.
 *
 * `database/schema.ts` entra primeiro e `app/models/` por cima: a redeclaração
 * do model é a que sabe que `features` é uma lista de texto e que `url` é
 * string.
 */
export async function typeIndex(appRoot: string): Promise<TypeIndex> {
  if (cached) return cached

  const index: TypeIndex = new Map()

  await indexFile(resolve(appRoot, 'database/schema.ts'), index)

  const models = resolve(appRoot, 'app/models')

  for (const entry of await readdir(models)) {
    if (entry.endsWith('.ts')) await indexFile(resolve(models, entry), index)
  }

  cached = index

  return index
}

/**
 * O tipo declarado para uma propriedade, procurando no model e no schema
 * gerado.
 *
 * `Notice` e `NoticeSchema` são a mesma tabela vista de dois arquivos, e é
 * por isso que as duas chaves são consultadas. `{}` vazio é a saída honesta
 * quando nenhuma das duas diz nada: melhor um campo sem contrato do que um
 * contrato inventado.
 */
function propertySchema(index: TypeIndex, model: LucidModel, property: string): SchemaObject {
  const own = index.get(model.name)?.get(property)

  if (own) return structuredClone(own)

  const generated = index.get(`${model.name}Schema`)?.get(property)

  if (generated) return structuredClone(generated)

  return {}
}

/**
 * O `enum` volta ao campo cujo tipo é um alias.
 *
 * `database/schema.ts` é gerado das colunas e tipa todo enum de banco como
 * `string`, então sem isto o documento diria "texto" onde o endpoint aceita
 * três valores. A lista vem de `#core/entity`, declarada no registro - é a
 * mesma constante que o validator de entrada usa.
 */
/**
 * O `format` volta a ser `date` na coluna que só guarda o dia.
 *
 * O AST vê `DateTime` e conclui `date-time` para `@column.date()` e
 * `@column.dateTime()` igualmente - mas o `@column.date()` serializa por
 * `toISODate()`, e o JSON sai `2026-09-10`. Quem gerasse cliente pelo documento
 * esperaria `2026-09-10T00:00:00.000-03:00` e trataria o valor como instante.
 * Quem sabe a diferença é o Lucid, em `meta.type`.
 */
function withDateFormat(schema: SchemaObject, isDateColumn: boolean): SchemaObject {
  if (!isDateColumn || schema.format !== 'date-time') return schema

  return { ...schema, format: 'date' }
}

function withEnum(schema: SchemaObject, values: readonly string[] | undefined): SchemaObject {
  if (!values) return schema

  const patched: SchemaObject = { ...schema, enum: [...values] }

  if (Array.isArray(schema.type)) patched.enum = [...values, null]

  return patched
}

/**
 * O schema de um recurso: as colunas visíveis, os campos computados declarados
 * e as relações que o `preload` do use-case traz.
 *
 * Relação **não** declarada em `relations` não entra: o contrato é o que o
 * endpoint devolve, e listar toda relação do model prometeria dado que ninguém
 * precarrega.
 */
export function modelSchema(index: TypeIndex, resource: ModelResource): SchemaObject {
  const { model, relations, enums, fields } = resource
  const properties: Record<string, SchemaObject> = {}
  const required: string[] = []

  for (const [name, column] of model.$columnsDefinitions) {
    // `serializeAs: null` é como o Lucid esconde um campo - é o que mantém
    // `password` fora de toda resposta. O documento respeita a mesma marca.
    if (column.serializeAs === null) continue

    properties[column.serializeAs] = withEnum(
      withDateFormat(propertySchema(index, model, name), column.meta?.type === 'date'),
      enums?.[name]
    )
    required.push(column.serializeAs)
  }

  // Computado sempre existe no JSON quando tem valor, mas `serializeComputed`
  // omite o que devolve `undefined` - é assim que a `url` de um `Storage` some
  // do JSON antes dos hooks de leitura. Por isso nenhum entra em `required`.
  for (const [name, computed] of model.$computedDefinitions) {
    properties[computed.serializeAs ?? name] = propertySchema(index, model, name)
  }

  // O que nem o AST nem o Lucid contam: coluna de pivô promovida, agregado com
  // apelido próprio. Entra como declarado, e sobrescreve o derivado.
  for (const [name, schema] of Object.entries(fields ?? {})) {
    properties[name] = schema
  }

  const declared: RelationMap = relations ?? {}

  for (const [name, relation] of Object.entries(declared)) {
    const definition = model.$relationsDefinitions.get(name)

    if (!definition) throw new Error(`${model.name} não tem a relação "${name}".`)

    if (Array.isArray(relation)) {
      properties[name] = { type: 'array', items: modelSchema(index, relation[0]) }
      continue
    }

    properties[name] = modelSchema(index, relation)
  }

  return { type: 'object', properties, required }
}
