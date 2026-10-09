import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import { middlewareInfo } from '@adonisjs/core/http/helpers'
import openapi, {
  ACTION_OVERRIDES,
  SECURITY_COOKIE,
  SECURITY_SCHEME,
  type TagRule,
} from '#config/openapi'
import {
  controllerPath,
  introspect,
  loadResponseSchema,
  type Introspection,
} from '#core/openapi/introspect'
import {
  AUTOMATIC_CODES,
  errorComponentName,
  errorResponse,
  errorSchema,
  forbiddenDescription,
} from '#core/openapi/errors'
import { FIELD_PATCHES } from './field-patches.ts'
import {
  PAGINATION_META_REF,
  PAGINATION_META_SCHEMA,
  applyFieldPatches,
  mergeSchema,
  paginatedSchema,
  toParameters,
  toSchema,
} from '#core/openapi/schema'
import { isListResource, isModelResource, paginated } from '#core/openapi/types'
import { modelSchema, typeIndex } from '#core/openapi/model-schema'
import type { TypeIndex } from '#core/openapi/model-schema'
import type {
  DocumentedController,
  DocumentedValidator,
  OpenAPIDocument,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIResponse,
  ListResource,
  ModelResource,
  OperationDocs,
  PaginatedResponse,
  ResponseBody,
  SchemaObject,
} from '#core/openapi/types'

/**
 * Monta o documento OpenAPI a partir do router de verdade.
 *
 * A regra que orienta tudo aqui: **o que o código já diz, o gerador lê; o que só
 * uma pessoa sabe, o controller declara.** Caminho, método, parâmetros de
 * caminho, exigência de sessão, papéis aceitos e as falhas de infraestrutura
 * saem de `router.toJSON()` e da cadeia de middleware. Só resumo, payload,
 * resposta e os códigos de erro do domínio precisam ser escritos.
 *
 * O corpo de resposta é a exceção que confirma a regra: ele **sai** do model,
 * porque a resposta É o model serializado. Declará-lo de novo em VineJS era
 * manter o mesmo contrato em dois lugares, e o segundo envelhecia calado.
 */

/** Tipos de token que `router.parsePattern` devolve para um segmento. */
const TOKEN = {
  STATIC: 0,
  PARAM: 1,
  WILDCARD: 2,
  OPTIONAL_PARAM: 3,
} as const

const METHOD_ORDER: string[] = ['get', 'post', 'put', 'patch', 'delete']

const SUCCESS_DESCRIPTIONS: Record<number, string> = {
  200: 'Sucesso',
  201: 'Recurso criado',
  204: 'Sucesso, sem corpo',
}

/** O status que uma operação ainda não documentada provavelmente devolve. */
const IMPLIED_SUCCESS: Record<string, number> = {
  post: 201,
  delete: 204,
}

type BuildResult = {
  document: OpenAPIDocument
  warnings: string[]
  documented: number
  total: number
}

// ---------------------------------------------------------------------------
// Resolução do controller
// ---------------------------------------------------------------------------

type LazyController = () => Promise<{ default?: DocumentedController }>

/**
 * Classes têm `prototype`; arrow functions, não. É o que separa o controller já
 * carregado do `() => import('#features/...')` que o registry gerado usa.
 */
function isController(target: unknown): target is DocumentedController {
  return typeof target === 'function' && 'prototype' in target
}

function isLazyController(target: unknown): target is LazyController {
  return typeof target === 'function' && !('prototype' in target)
}

/**
 * O arquivo-fonte do controller da rota, para ler o AST dele.
 *
 * O registry gerado referencia o controller por `#features/...`, que mapeia
 * direto para `app/features/...`.
 */
function controllerFile(handler: unknown): string | undefined {
  if (typeof handler !== 'object' || handler === null) return undefined
  if (!('importExpression' in handler)) return undefined

  const expression = handler.importExpression

  if (typeof expression !== 'string') return undefined

  return controllerPath(expression, app.makePath('.'))
}

async function resolveDocs(handler: unknown): Promise<OperationDocs | undefined> {
  if (typeof handler !== 'object' || handler === null) return undefined
  if (!('reference' in handler)) return undefined

  const { reference } = handler

  if (!Array.isArray(reference)) return undefined

  const [target] = reference

  if (isController(target)) return target.docs

  if (isLazyController(target)) {
    const module = await target()

    return module.default?.docs
  }

  return undefined
}

// ---------------------------------------------------------------------------
// Caminho, nome e tag
// ---------------------------------------------------------------------------

/**
 * `/administrator/companies/:id` → `/administrator/companies/{id}`.
 *
 * Parâmetro opcional não existe em OpenAPI: o caminho com e sem ele são dois
 * caminhos. Nenhuma rota do projeto usa, então aqui ele só é tratado como
 * obrigatório, e um aviso apontaria o dia em que passar a usar.
 */
function toOpenAPIPath(pattern: string): { path: string; params: string[] } {
  const params: string[] = []
  const segments: string[] = []

  for (const token of router.parsePattern(pattern)) {
    if (token.type === TOKEN.STATIC) {
      segments.push(token.val)
      continue
    }

    if (token.type === TOKEN.WILDCARD) {
      segments.push(`{${token.val}}`)
      params.push(token.val)
      continue
    }

    segments.push(`{${token.val}}`)
    params.push(token.val)
  }

  const path = `/${segments.join('/')}`

  if (path === '//') return { path: '/', params }

  return { path, params }
}

function camelize(value: string): string {
  const parts = value.split(/[._-]/).filter(Boolean)

  return parts
    .map(function (part, index) {
      if (index === 0) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join('')
}

function pascalize(value: string): string {
  const camel = camelize(value)

  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/**
 * O tipo de conteúdo do payload, derivado do próprio schema em vez de declarado.
 *
 * Um campo `format: 'binary'` só existe em upload, e upload não trafega em JSON.
 * Documentar `application/json` numa rota de multipart faria o "Test Request" do
 * Scalar enviar o corpo errado - e o cliente gerado a partir do documento, também.
 */
function requestContentType(schema: SchemaObject): string {
  const properties = Object.values(schema.properties ?? {})

  const binary = properties.some(function (property) {
    if (typeof property === 'boolean') return false

    return property.format === 'binary'
  })

  if (binary) return 'multipart/form-data'

  return 'application/json'
}

/**
 * A tag sai do caminho, não do nome da rota. O subgrupo de remoção do painel é
 * `.as('destroy')`, então apagar empresa se chama `administrator.destroy.companies`
 * e cairia no mesmo grupo que apagar categoria. O caminho não confunde.
 */
function resolveTagRule(path: string): TagRule | undefined {
  const matches = openapi.tags
    .filter(function (tag) {
      return path === tag.prefix || path.startsWith(`${tag.prefix}/`)
    })
    .sort(function (left, right) {
      return right.prefix.length - left.prefix.length
    })

  return matches[0]
}

/**
 * O resumo de cada operação, montado do nome do arquivo do controller mais o
 * substantivo do grupo: `create.controller.ts` sob um grupo cujo `singular` é
 * "empresa" vira "Criar empresa".
 *
 * Os pares de substantivos em `config/openapi.ts` cobrem as operações de
 * recurso. A alternativa era um resumo escrito à mão por operação, que é onde a
 * documentação começa a envelhecer.
 *
 * As ações sem substantivo - as de sessão e as de upload - têm resumo fixo: o
 * que elas fazem não é uma operação sobre o recurso do grupo, então flexionar o
 * substantivo daria frase errada. Elas não dependem do grupo, e por isso são as
 * únicas que respondem mesmo sem `singular` declarado.
 *
 * A tabela é de mecanismo e vale nos três backends. Ação que só existe num deles
 * - ou que precisa de outra frase - vai para `ACTION_OVERRIDES` em
 * `config/openapi.ts`, que é o arquivo do projeto; aqui, um nome de domínio
 * viraria resumo errado no repositório ao lado.
 */
const ACTION_SUMMARY: Record<string, (rule: TagRule) => string> = {
  create: (rule) => `Criar ${rule.singular}`,
  paginate: (rule) => `Listar ${rule.plural}`,
  show: (rule) => `Detalhar ${rule.singular}`,
  update: (rule) => `Atualizar ${rule.singular}`,
  archive: (rule) => `Arquivar ${rule.singular}`,
  unarchive: (rule) => `Restaurar ${rule.singular}`,
  delete: (rule) => `Remover ${rule.singular}`,
}

/**
 * As ações cujo resumo não depende do grupo, e por isso são as únicas que
 * respondem mesmo onde o `singular` não foi declarado.
 */
const FIXED_SUMMARY: Record<string, string> = {
  'sign-in': 'Entrar',
  'sign-out': 'Sair',
  'refresh': 'Renovar a sessão',
  'complete': 'Confirmar o upload',
  'parts': 'Retomar o upload',
  'download': 'Baixar o arquivo',
}

function deriveSummary(action: string, rule: TagRule | undefined): string | undefined {
  const override = ACTION_OVERRIDES[action]
  if (override !== undefined) return override

  const fixed = FIXED_SUMMARY[action]
  if (fixed !== undefined) return fixed

  const build = ACTION_SUMMARY[action]

  if (!build) return undefined
  if (!rule?.singular) return undefined

  return build(rule)
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

type Protection = {
  authenticated: boolean
  roles: string[]
}

/** O que `route.middleware.all()` entrega, sem repetir a união do framework. */
type MiddlewareEntry = Parameters<typeof middlewareInfo>[0]

function toRoles(args: unknown): string[] {
  if (!Array.isArray(args)) return []

  return args.filter(function (role): role is string {
    return typeof role === 'string'
  })
}

/**
 * Lê a proteção da rota da própria cadeia de middleware. Os papéis vêm dos
 * argumentos de `middleware.role([...])`, então a documentação não pode
 * divergir de quem realmente pode chamar o endpoint.
 *
 * Grupos de papel aninham - apagar no painel está dentro de
 * `role(['OWNER', 'ADMINISTRATOR'])` **e** de `role(['OWNER'])`. As duas checagens
 * precisam passar, então quem pode chamar é a interseção das listas, não a
 * última delas.
 */
async function readProtection(middleware: Iterable<MiddlewareEntry>): Promise<Protection> {
  const protection: Protection = { authenticated: false, roles: [] }

  let allowed: string[] | undefined

  for (const entry of middleware) {
    const info = await middlewareInfo(entry)

    if (info.type === 'global') continue
    if (info.name === 'auth') protection.authenticated = true
    if (info.name !== 'role') continue
    if (!('args' in info)) continue

    const roles = toRoles(info.args)

    if (!allowed) allowed = roles
    if (allowed)
      allowed = allowed.filter(function (role) {
        return roles.includes(role)
      })
  }

  protection.roles = allowed ?? []

  return protection
}

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

/**
 * O que se sabe sobre uma operação depois de juntar as duas fontes.
 *
 * A introspecção do código é a base; `static docs` só entra por cima, para
 * prosa e para o que o código não consegue dizer. A ordem importa: se a
 * declaração fosse a base, uma rota sem declaração ficaria vazia - que foi
 * exatamente o problema da primeira versão, com 5 de 46 operações completas.
 */
type Contract = {
  summary: string
  description?: string
  tag?: string
  deprecated?: boolean
  body?: DocumentedValidator
  query?: DocumentedValidator
  params?: DocumentedValidator
  responses: Record<number, ResponseBody>
  /** status → code → mensagem. */
  errors: Map<number, Map<string, string>>
  overrides?: OperationDocs['overrides']
}

/** Status de sucesso presumido quando o controller não revelou o seu. */
function impliedSuccess(method: string): number {
  return IMPLIED_SUCCESS[method] ?? 200
}

async function buildContract(
  docs: OperationDocs | undefined,
  intro: Introspection | undefined,
  method: string,
  rule: TagRule | undefined
): Promise<Contract> {
  const errors = new Map<number, Map<string, string>>()

  for (const error of intro?.errors ?? []) {
    const codes = errors.get(error.status) ?? new Map<string, string>()
    codes.set(error.code, error.message)
    errors.set(error.status, codes)
  }

  for (const [rawStatus, declared] of Object.entries(docs?.errors ?? {})) {
    const status = Number(rawStatus)
    const codes = errors.get(status) ?? new Map<string, string>()
    // `[x].flat()` normaliza um valor ou uma lista para lista sem ramificar.
    const list = [declared].flat()

    for (const code of list) {
      if (!codes.has(code)) codes.set(code, '')
    }

    errors.set(status, codes)
  }

  const contract: Contract = {
    summary:
      docs?.summary ??
      deriveSummary(intro?.action ?? '', rule) ??
      `${method.toUpperCase()} ${rule?.prefix ?? ''}`,
    description: docs?.description,
    tag: docs?.tag ?? rule?.name,
    deprecated: docs?.deprecated,
    body: docs?.body ?? intro?.body,
    query: docs?.query ?? intro?.query,
    params: docs?.params ?? intro?.params,
    responses: docs?.responses ?? {},
    errors,
    overrides: docs?.overrides,
  }

  if (docs?.responses) return contract

  // Sem declaração: o status vem do `context.response.<método>()` do controller,
  // e o corpo da entrada da feature em `#core/response`. Listagem ganha o envelope
  // paginado, porque `paginate` é o único caso em que ele se aplica.
  const status = intro?.successStatus ?? impliedSuccess(method)

  if (status === 204) {
    contract.responses = { 204: 'no-content' }

    return contract
  }

  // Guarda antes da leitura: sem diretório não há o que carregar, e o corte
  // que o ternário fazia é o mesmo que o `if` logo abaixo já fazia de novo.
  if (!intro?.directory) return contract

  const schema = loadResponseSchema(intro.directory, app.makePath('.'))

  if (!schema) return contract

  // Uma lista crua não ganha envelope: quem a devolve não pagina.
  if (intro?.action === 'paginate' && !isListResource(schema)) {
    contract.responses = { [status]: paginated(schema) }

    return contract
  }

  contract.responses = { [status]: schema }

  return contract
}

// ---------------------------------------------------------------------------
// Respostas
// ---------------------------------------------------------------------------

type Components = Record<string, SchemaObject>

function isPaginated(body: ResponseBody): body is PaginatedResponse {
  return typeof body === 'object' && 'kind' in body && body.kind === 'paginated'
}

/**
 * O corpo de uma resposta como JSON Schema, seja ele qual for.
 *
 * Três origens: o recurso derivado do model (`#core/response`), a lista crua
 * de um recurso, e o schema VineJS de quem não deriva de model - vitrine,
 * métricas, lookup e o plano de upload multipart.
 */
function bodySchema(
  body: DocumentedValidator | ModelResource | ListResource,
  types: TypeIndex,
  context: string,
  warnings: string[]
): SchemaObject {
  if (isModelResource(body)) return modelSchema(types, body)
  if (isListResource(body)) return { type: 'array', items: modelSchema(types, body.item) }

  return toSchema(body, context, warnings)
}

function buildSuccessResponses(
  contract: Contract,
  operationId: string,
  components: Components,
  types: TypeIndex,
  warnings: string[]
): Record<string, OpenAPIResponse> {
  const responses: Record<string, OpenAPIResponse> = {}
  const prefix = pascalize(operationId)

  for (const [rawStatus, body] of Object.entries(contract.responses)) {
    const status = Number(rawStatus)
    const description = SUCCESS_DESCRIPTIONS[status] ?? 'Sucesso'

    if (body === 'no-content') {
      responses[rawStatus] = { description }
      continue
    }

    const context = `${operationId} (resposta ${status})`

    if (isPaginated(body)) {
      const itemName = `${prefix}Item`
      components[itemName] = bodySchema(body.item, types, context, warnings)
      responses[rawStatus] = {
        description,
        content: {
          'application/json': {
            schema: paginatedSchema({ $ref: `#/components/schemas/${itemName}` }),
          },
        },
      }
      continue
    }

    const name = `${prefix}Response${status}`
    const derived = bodySchema(body, types, context, warnings)
    components[name] = mergeSchema(derived, contract.overrides?.responses?.[status])
    responses[rawStatus] = {
      description,
      content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } },
    }
  }

  return responses
}

/**
 * As falhas da operação: as automáticas, deduzidas da proteção e da presença de
 * validator, unidas às que o controller declarou.
 */
function buildErrorResponses(
  contract: Contract,
  protection: Protection,
  components: Components
): Record<string, OpenAPIResponse> {
  const codes = new Map<number, Map<string, string>>()

  const add = function (status: number, code?: string, message = '') {
    const current = codes.get(status) ?? new Map<string, string>()

    if (code && !current.get(code)) current.set(code, message)

    codes.set(status, current)
  }

  if (protection.authenticated) add(401, AUTOMATIC_CODES.unauthenticated, 'Não autorizado')
  if (protection.roles.length > 0) add(403, AUTOMATIC_CODES.forbidden, 'Acesso negado')
  if (contract.body || contract.query || contract.params) {
    add(422, AUTOMATIC_CODES.validation, 'Dados inválidos')
  }

  add(500)

  for (const [status, found] of contract.errors) {
    for (const [code, message] of found) add(status, code, message)
  }

  const responses: Record<string, OpenAPIResponse> = {}

  for (const [status, found] of [...codes.entries()].sort(function ([left], [right]) {
    return left - right
  })) {
    const declared = [...found.keys()]
    const name = errorComponentName(status, declared)

    components[name] = errorSchema(status, declared)

    let description
    if (status === 403) description = forbiddenDescription(protection.roles)

    // As mensagens vieram literalmente do `left(...)` do use-case, então servem
    // como descrição sem ninguém escrever nada.
    const messages = [...found.values()].filter(Boolean)
    if (!description && messages.length > 0) description = messages.join(' · ')

    responses[String(status)] = errorResponse(status, `#/components/schemas/${name}`, description)
  }

  return responses
}

// ---------------------------------------------------------------------------
// Operação
// ---------------------------------------------------------------------------

function buildParameters(
  contract: Contract,
  pathParams: string[],
  operationId: string,
  warnings: string[]
): OpenAPIParameter[] {
  const parameters: OpenAPIParameter[] = []

  const declared = new Map<string, OpenAPIParameter>()

  if (contract.params) {
    const schema = toSchema(contract.params, `${operationId} (parâmetros)`, warnings)

    for (const parameter of toParameters(schema, 'path')) {
      declared.set(parameter.name, parameter)
    }
  }

  for (const name of pathParams) {
    const known = declared.get(name)

    if (known) {
      parameters.push(known)
      continue
    }

    parameters.push({ name, in: 'path', required: true, schema: { type: 'string' } })
  }

  if (contract.query) {
    const schema = toSchema(contract.query, `${operationId} (query)`, warnings)
    parameters.push(...toParameters(schema, 'query'))
  }

  return parameters
}

function buildOperation(
  contract: Contract,
  input: {
    method: string
    operationId: string
    path: string
    pathParams: string[]
    protection: Protection
  },
  components: Components,
  types: TypeIndex,
  warnings: string[]
): OpenAPIOperation {
  const { method, operationId, path, pathParams, protection } = input

  if (!contract.tag) {
    warnings.push(
      `${method.toUpperCase()} ${path}: nenhum prefixo de \`config/openapi.ts\` casa com este ` +
        'caminho. A operação cai em "Sem grupo" na barra lateral.'
    )
  }

  const operation: OpenAPIOperation = {
    operationId,
    summary: contract.summary,
    tags: [contract.tag ?? 'Sem grupo'],
    responses: {},
  }

  if (contract.description) operation.description = contract.description
  if (contract.deprecated) operation.deprecated = true
  if (protection.authenticated) operation.security = [{ [SECURITY_SCHEME]: [] }]

  // Quem pode chamar, em campo próprio e não só na frase do 403. É o que
  // `authz:check` compara contra o baseline: abrir uma rota sem querer é uma
  // linha a menos aqui, e sem o campo essa linha se esconde numa descrição.
  if (protection.roles.length > 0) operation['x-roles'] = protection.roles

  const parameters = buildParameters(contract, pathParams, operationId, warnings)

  if (parameters.length > 0) operation.parameters = parameters

  if (contract.body) {
    const name = `${pascalize(operationId)}Body`
    const derived = toSchema(contract.body, `${operationId} (payload)`, warnings)
    const patched = applyFieldPatches(derived, FIELD_PATCHES)
    const schema = mergeSchema(patched, contract.overrides?.body)
    components[name] = schema
    operation.requestBody = {
      required: true,
      content: {
        [requestContentType(schema)]: { schema: { $ref: `#/components/schemas/${name}` } },
      },
    }
  }

  operation.responses = buildSuccessResponses(contract, operationId, components, types, warnings)

  if (Object.keys(operation.responses).length === 0) {
    const status = impliedSuccess(method)
    operation.responses[String(status)] = {
      description:
        'Sucesso. O corpo desta resposta não está descrito: a feature não está ' +
        'registrada em `app/core/response.ts`.',
    }
    warnings.push(
      `${method.toUpperCase()} ${path}: sem corpo de resposta. Registre a feature em ` +
        '`app/core/response.ts`, apontando o model e as relações que o use-case precarrega.'
    )
  }

  Object.assign(operation.responses, buildErrorResponses(contract, protection, components))

  return operation
}

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

export async function buildDocument(): Promise<BuildResult> {
  router.commit()

  const components: Components = { PaginationMeta: PAGINATION_META_SCHEMA }

  // O índice de tipos é lido uma vez: são 31 classes geradas mais 25 models, e
  // o corpo de toda resposta sai dele.
  const types = await typeIndex(app.makePath('.'))
  const paths: Record<string, Record<string, OpenAPIOperation>> = {}
  const warnings: string[] = []
  const usedTags = new Set<string>()

  let documented = 0
  let total = 0

  const routes = Object.values(router.toJSON()).flat()

  for (const route of routes) {
    const { path, params } = toOpenAPIPath(route.pattern)

    // Compara com as duas formas: o caminho já convertido para OpenAPI e o
    // padrão cru do Adonis. Sem a segunda, uma rota curinga só sairia do
    // documento se o config escrevesse `/uploads/{*}`, que é a forma de saída,
    // não a que a pessoa escreve.
    if (openapi.ignore.includes(path) || openapi.ignore.includes(route.pattern)) continue

    // `HEAD` é gerado pelo framework a partir de cada `GET`; documentá-lo só
    // duplicaria toda operação de leitura.
    const methods = route.methods.filter(function (method) {
      return method !== 'HEAD'
    })

    if (methods.length === 0) continue

    const docs = await resolveDocs(route.handler)
    const protection = await readProtection(route.middleware.all())
    const rule = resolveTagRule(path)

    // O contrato que o próprio código declara: validators usados, status
    // devolvido e erros lançados pelo use-case irmão.
    const source = controllerFile(route.handler)
    let intro: Introspection | undefined

    if (source) intro = await introspect(source)

    if (source && !intro) {
      warnings.push(`${path}: não foi possível ler \`${source}\`.`)
    }

    for (const method of methods) {
      total += 1

      const verb = method.toLowerCase()
      const contract = await buildContract(docs, intro, verb, rule)

      if (Object.keys(contract.responses).length > 0) documented += 1

      const operationId = camelize(route.name || `${verb}.${path}`)
      const operation = buildOperation(
        contract,
        { method: verb, operationId, path, pathParams: params, protection },
        components,
        types,
        warnings
      )

      usedTags.add(operation.tags[0])

      paths[path] = paths[path] ?? {}
      paths[path][verb] = operation
    }
  }

  return {
    document: {
      openapi: '3.1.0',
      info: openapi.info,
      servers: openapi.servers,
      tags: openapi.tags
        .filter(function (tag) {
          return usedTags.has(tag.name)
        })
        .map(function (tag) {
          return { name: tag.name, description: tag.description }
        }),
      paths: sortPaths(paths),
      components: {
        securitySchemes: {
          [SECURITY_SCHEME]: { type: 'apiKey', in: 'cookie', name: SECURITY_COOKIE },
        },
        schemas: sortKeys(components),
      },
    },
    warnings,
    documented,
    total,
  }
}

/**
 * Ordena caminhos e métodos.
 *
 * A ordem de iteração do router já é estável, mas ordenar aqui é o que faz uma
 * rota nova aparecer no diff como uma adição no lugar certo, em vez de deslocar
 * tudo que vem depois dela no arquivo.
 */
function sortPaths(
  paths: Record<string, Record<string, OpenAPIOperation>>
): Record<string, Record<string, OpenAPIOperation>> {
  const sorted: Record<string, Record<string, OpenAPIOperation>> = {}

  for (const path of Object.keys(paths).sort()) {
    const operations: Record<string, OpenAPIOperation> = {}
    const methods = Object.keys(paths[path]).sort(function (left, right) {
      return METHOD_ORDER.indexOf(left) - METHOD_ORDER.indexOf(right)
    })

    for (const method of methods) operations[method] = paths[path][method]

    sorted[path] = operations
  }

  return sorted
}

function sortKeys(components: Components): Components {
  const sorted: Components = {}

  for (const key of Object.keys(components).sort()) sorted[key] = components[key]

  return sorted
}

export { PAGINATION_META_REF }
