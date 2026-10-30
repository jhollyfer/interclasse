import type { JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema'

import type { FieldPatch } from '#scripts/openapi/field-patches'
import type { DocumentedValidator, OpenAPIParameter, SchemaObject } from '#core/openapi/types'

/**
 * VineJS -> JSON Schema publicável.
 *
 * `validator.toJSONSchema()` faz o trabalho pesado, mas tem lacunas medidas: um
 * `vine.date()` sai como `{}` vazio, e um `{}` vazio num documento OpenAPI
 * significa "qualquer coisa" - ou seja, o campo passaria a existir na
 * documentação sem contrato nenhum. Aqui esse buraco é tapado onde dá e
 * denunciado onde não dá.
 *
 * A correção é possível porque `toJSON()` expõe a árvore interna do VineJS, com
 * a mesma forma do schema gerado: objeto tem `properties`, array tem `each`, e a
 * folha guarda o `subtype` que o JSON Schema perdeu. Percorrer as duas em
 * paralelo devolve o tipo ao campo.
 */

/** Nó da árvore interna do VineJS, só com o que a travessia usa. */
type VineNode = {
  type?: string
  subtype?: string
  fieldName?: string
  allowNull?: boolean
  properties?: VineNode[]
  each?: VineNode
  schema?: VineNode
}

export class VineSchema {
  /**
   * Subtipos que o VineJS não sabe expressar em JSON Schema.
   *
   * `date`: `vine.date()` produz `{}`, e `vine.date().nullable()` produz
   * `{ "type": "null" }` - que é pior, porque afirma que o campo *só* pode ser
   * nulo. O valor sai serializado como ISO 8601 pelo `DateTime` do Luxon, então
   * `date-time` é o formato honesto.
   *
   * `multipartFile`: `vine.file()` é uma extensão do bodyparser do AdonisJS
   * (`VineMultipartFile`), e o VineJS não tem como representar um binário em JSON
   * Schema - sai `{}`. O nome do subtipo é o que a classe declara. `string` com
   * `format: 'binary'` é como OpenAPI 3.1 descreve upload, e é também o que faz o
   * gerador documentar a operação como `multipart/form-data` em vez de JSON
   * (`requestContentType` em `document.ts`).
   */
  private static readonly SUBTYPE_FALLBACKS: Record<
    string,
    { type: JSONSchema7TypeName; format?: string }
  > = {
    date: { type: 'string', format: 'date-time' },
    multipartFile: { type: 'string', format: 'binary' },
  }

  /**
   * O schema que substitui o que o VineJS não soube gerar, preservando a
   * nulidade declarada no próprio nó.
   */
  private static fallbackFor(node: VineNode | undefined): SchemaObject | undefined {
    const fallback = VineSchema.SUBTYPE_FALLBACKS[node?.subtype ?? '']

    if (!fallback) return undefined

    const schema: SchemaObject = { type: fallback.type }

    if (node?.allowNull) schema.type = [fallback.type, 'null']
    if (fallback.format) schema.format = fallback.format

    return schema
  }

  /**
   * Um schema é inútil quando não diz nada (`{}`) ou quando só diz `null` - os dois
   * casos que `vine.date()` produz.
   */
  private static isUninformative(schema: SchemaObject): boolean {
    if (Object.keys(schema).length === 0) return true

    return Object.keys(schema).length === 1 && schema.type === 'null'
  }

  /**
   * `vine.boolean()` vira um `enum` com as nove representações que ele aceita -
   * `["1", 1, "true", true, "on", "0", 0, "false", false]`.
   *
   * É verdade e é inútil: quem lê a documentação vê uma lista de nove valores no
   * lugar de "booleano", e quem gera cliente tipado recebe uma união dessas nove
   * literais em vez de `boolean`. O tipo é `boolean`; a tolerância a formulário
   * HTML vira descrição.
   */
  private static readonly BOOLEAN_COERCIONS = new Set<unknown>([
    '1',
    1,
    'true',
    true,
    'on',
    '0',
    0,
    'false',
    false,
  ])

  private static isCoercedBoolean(schema: SchemaObject): boolean {
    if (!Array.isArray(schema.enum)) return false
    if (schema.enum.length !== VineSchema.BOOLEAN_COERCIONS.size) return false

    return schema.enum.every(function (value) {
      return VineSchema.BOOLEAN_COERCIONS.has(value)
    })
  }

  private static isVineNode(value: unknown): value is VineNode {
    return typeof value === 'object' && value !== null
  }

  private static isSchemaObject(value: JSONSchema7Definition | undefined): value is SchemaObject {
    return typeof value === 'object' && value !== null
  }

  /**
   * A raiz da árvore interna. `toJSON().schema` é um nó `root` que embrulha o
   * objeto de verdade.
   */
  private static rootNode(validator: DocumentedValidator): VineNode | undefined {
    const { schema } = validator.toJSON()

    if (!VineSchema.isVineNode(schema)) return undefined
    if (VineSchema.isVineNode(schema.schema)) return schema.schema

    return schema
  }

  /** Indexa os filhos de um nó objeto por nome de campo. */
  private static childrenByField(node: VineNode | undefined): Map<string, VineNode> {
    const children = new Map<string, VineNode>()

    if (!node?.properties) return children

    for (const child of node.properties) {
      if (!child.fieldName) continue

      children.set(child.fieldName, child)
    }

    return children
  }

  /**
   * Percorre schema e árvore interna juntos, devolvendo um schema novo com os
   * campos sem tipo resolvidos. Todo campo que continuar sem tipo vira aviso
   * nomeando rota e caminho - em `--strict`, o comando falha por causa dele.
   */
  private static patch(
    schema: SchemaObject,
    node: VineNode | undefined,
    context: string,
    path: string,
    warnings: string[],
  ): SchemaObject {
    if (VineSchema.isUninformative(schema)) {
      const fallback = VineSchema.fallbackFor(node)

      if (fallback) return fallback

      warnings.push(
        `${context}: o campo \`${path || '(raiz)'}\` saiu sem tipo do VineJS. ` +
          'Descreva-o em `overrides` para ele não ir ao documento como "qualquer coisa".',
      )

      return schema
    }

    if (VineSchema.isCoercedBoolean(schema)) {
      return {
        type: 'boolean',
        description:
          'Aceita também as representações de formulário HTML: `"1"`, `"true"`, `"on"`, `"0"` e `"false"`.',
      }
    }

    const patched: SchemaObject = { ...schema }

    if (schema.properties) {
      const children = VineSchema.childrenByField(node)
      const properties: Record<string, SchemaObject> = {}

      for (const [field, definition] of Object.entries(schema.properties)) {
        if (!VineSchema.isSchemaObject(definition)) continue

        const childPath = [path, field].filter(Boolean).join('.')
        properties[field] = VineSchema.patch(
          definition,
          children.get(field),
          context,
          childPath,
          warnings,
        )
      }

      patched.properties = properties
    }

    // `items` como tupla (array de schemas) não é gerado pelo VineJS hoje; a
    // travessia ignora esse formato em vez de fingir que o entende.
    if (!Array.isArray(schema.items) && VineSchema.isSchemaObject(schema.items)) {
      patched.items = VineSchema.patch(schema.items, node?.each, context, `${path}[]`, warnings)
    }

    return patched
  }

  /** O schema publicável de um validator, já corrigido. */
  static toSchema(
    validator: DocumentedValidator,
    context: string,
    warnings: string[],
  ): SchemaObject {
    return VineSchema.patch(
      validator.toJSONSchema(),
      VineSchema.rootNode(validator),
      context,
      '',
      warnings,
    )
  }

  /**
   * Sobrepõe o schema declarado em `overrides` ao derivado.
   *
   * `properties` combina chave a chave e `required` faz união, para um override
   * poder acrescentar um campo sem reescrever o objeto inteiro - que é
   * exatamente o caso do `passwordConfirmation`.
   */
  static mergeSchema(base: SchemaObject, override: SchemaObject | undefined): SchemaObject {
    if (!override) return base

    const merged: SchemaObject = { ...base, ...override }

    if (base.properties || override.properties) {
      merged.properties = { ...base.properties, ...override.properties }
    }

    if (base.required || override.required) {
      merged.required = [...new Set([...(base.required ?? []), ...(override.required ?? [])])]
    }

    return merged
  }

  /**
   * Aplica as correções por nome de campo sobre um payload já derivado.
   *
   * É o conserto do que o VineJS não expressa, mas aplicado onde o campo estiver,
   * em vez de repetido em cada controller que use a regra. O campo companheiro
   * herda a obrigatoriedade do original: `password` opcional numa atualização não
   * pode arrastar um `passwordConfirmation` obrigatório.
   */
  static applyFieldPatches(
    schema: SchemaObject,
    patches: Record<string, FieldPatch>,
  ): SchemaObject {
    if (!schema.properties) return schema

    const properties: Record<string, JSONSchema7Definition> = { ...schema.properties }
    const required = new Set(schema.required ?? [])
    let touched = false

    for (const [field, correction] of Object.entries(patches)) {
      if (!(field in properties)) continue

      touched = true

      if (correction.schema) properties[field] = correction.schema

      if (!correction.companion) continue

      properties[correction.companion.name] = correction.companion.schema

      if (correction.companion.followsRequired && required.has(field)) {
        required.add(correction.companion.name)
      }
    }

    if (!touched) return schema

    return { ...schema, properties, required: [...required] }
  }

  // ---------------------------------------------------------------------------
  // Parâmetros
  // ---------------------------------------------------------------------------

  /**
   * Quebra o schema de um objeto nos parâmetros correspondentes.
   *
   * Query string e parâmetros de caminho são declarados como um validator só - do
   * mesmo jeito que o controller os valida - mas o OpenAPI os quer achatados, um
   * por campo.
   */
  static toParameters(schema: SchemaObject, location: 'path' | 'query'): OpenAPIParameter[] {
    const parameters: OpenAPIParameter[] = []
    const required = schema.required ?? []

    for (const [name, definition] of Object.entries(schema.properties ?? {})) {
      if (!VineSchema.isSchemaObject(definition)) continue

      parameters.push({
        name,
        in: location,
        // Parâmetro de caminho é sempre obrigatório: sem ele a rota nem casa.
        required: location === 'path' || required.includes(name),
        schema: definition,
      })
    }

    return parameters
  }

  // ---------------------------------------------------------------------------
  // Paginação
  // ---------------------------------------------------------------------------

  /**
   * Espelha `PaginationMeta` de `app/core/entity.ts`. Entra uma vez em
   * `components.schemas` e é referenciado por toda listagem.
   */
  static readonly PAGINATION_META_SCHEMA: SchemaObject = {
    type: 'object',
    description: 'Metadados da página, como o paginator do Lucid os devolve.',
    properties: {
      total: { type: 'integer' },
      perPage: { type: 'integer' },
      currentPage: { type: 'integer' },
      lastPage: { type: 'integer' },
      firstPage: { type: 'integer' },
      firstPageUrl: { type: 'string' },
      lastPageUrl: { type: 'string' },
      nextPageUrl: { type: ['string', 'null'] },
      previousPageUrl: { type: ['string', 'null'] },
    },
    required: [
      'total',
      'perPage',
      'currentPage',
      'lastPage',
      'firstPage',
      'firstPageUrl',
      'lastPageUrl',
      'nextPageUrl',
      'previousPageUrl',
    ],
  }

  static readonly PAGINATION_META_REF = '#/components/schemas/PaginationMeta'

  /** O envelope `{ meta, data }` em volta do schema do item. */
  static paginatedSchema(item: SchemaObject): SchemaObject {
    return {
      type: 'object',
      properties: {
        meta: { $ref: VineSchema.PAGINATION_META_REF },
        data: { type: 'array', items: item },
      },
      required: ['meta', 'data'],
    }
  }
}
