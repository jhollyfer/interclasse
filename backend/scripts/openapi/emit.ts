import type { z } from '@interclasse/shared'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import { middlewareInfo } from '@adonisjs/core/http/helpers'

import { FIELD_PATCHES } from '#scripts/openapi/field-patches'
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
} from '#scripts/openapi/introspect'
import {
  AUTOMATIC_CODES,
  errorComponentName,
  errorResponse,
  errorSchema,
  forbiddenDescription,
} from '#scripts/openapi/errors'
import { VineSchema } from '#scripts/openapi/vine-schema'
import { ZodSchema } from '#scripts/openapi/zod-schema'
import type {
  DocumentedController,
  DocumentedValidator,
  OpenAPIDocument,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIResponse,
  OperationDocs,
  PaginatedResponse,
  ResponseBody,
  SchemaObject,
} from '#core/openapi/types'

/**
 * Builds the OpenAPI document from the real router.
 *
 * The rule behind everything here: **what the code already says, the generator reads;
 * what only a person knows, the controller declares.** Path, method, path
 * parameters, session requirement, accepted roles and the infrastructure
 * failures come from `router.toJSON()` and the middleware chain. Only the summary,
 * payload, response and the domain error codes need to be written.
 *
 * The response body comes from the `…Response` schema in `shared/src/responses/`, through
 * the `RESPONSES` registry (`_standards/openapi.md`): the same schema types the
 * use case, the presenter and the frontend, and the generator never reads the model.
 */

/** Token types that `router.parsePattern` returns for a segment. */
const TOKEN = {
  STATIC: 0,
  PARAM: 1,
  WILDCARD: 2,
  OPTIONAL_PARAM: 3,
} as const

const METHOD_ORDER: string[] = ['get', 'post', 'put', 'patch', 'delete']

const SUCCESS_DESCRIPTIONS: Record<number, string> = {
  200: 'Success',
  201: 'Resource created',
  204: 'Success, no body',
}

/** The status an operation not yet documented probably returns. */
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
// Controller resolution
// ---------------------------------------------------------------------------

type LazyController = () => Promise<{ default?: DocumentedController }>

/**
 * Classes have a `prototype`; arrow functions do not. That is what separates the already
 * loaded controller from the `() => import('#features/...')` the generated registry uses.
 */
function isController(target: unknown): target is DocumentedController {
  return typeof target === 'function' && 'prototype' in target
}

function isLazyController(target: unknown): target is LazyController {
  return typeof target === 'function' && !('prototype' in target)
}

/**
 * The controller source file of the route, to read its AST.
 *
 * The generated registry references the controller by `#features/...`, which maps
 * straight to `app/features/...`.
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
// Path, name and tag
// ---------------------------------------------------------------------------

/**
 * `/administrator/companies/:id` -> `/administrator/companies/{id}`.
 *
 * An optional parameter does not exist in OpenAPI: the path with and without it are two
 * paths. No route in the project uses one, so here it is only treated as
 * required, and a warning would point to the day one starts using it.
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
 * The payload content type, derived from the schema itself instead of declared.
 *
 * A `format: 'binary'` field only exists in an upload, and an upload does not travel as JSON.
 * Documenting `application/json` on a multipart route would make Scalar's "Test Request"
 * send the wrong body - and so would the client generated from the document.
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
 * The tag comes from the path, not from the route name. The panel removal subgroup is
 * `.as('destroy')`, so deleting a company is called `administrator.destroy.companies`
 * and would fall in the same group as deleting a category. The path does not confuse.
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
 * The summary of each operation, built from the controller file name plus the
 * group noun: `create.controller.ts` under a group whose `singular` is
 * "company" becomes "Create company".
 *
 * The noun pairs in `config/openapi.ts` cover the resource operations. The
 * alternative was a hand-written summary per operation, which is where the
 * documentation starts to age.
 *
 * Actions without a noun - the session ones and the upload ones - have a fixed summary:
 * what they do is not an operation on the group resource, so inflecting the
 * noun would give a wrong sentence. They do not depend on the group, and so they are the
 * only ones that answer even without a declared `singular`.
 *
 * The table is mechanism and holds in every project. A domain action - or one that
 * needs another phrase - goes to `ACTION_OVERRIDES` in `config/openapi.ts`,
 * which is the project file; here, a domain name would become a wrong summary in
 * another project.
 */
const ACTION_SUMMARY: Record<string, (rule: TagRule) => string> = {
  create: (rule) => `Create ${rule.singular}`,
  paginate: (rule) => `List ${rule.plural}`,
  show: (rule) => `Show ${rule.singular}`,
  update: (rule) => `Update ${rule.singular}`,
  archive: (rule) => `Archive ${rule.singular}`,
  unarchive: (rule) => `Restore ${rule.singular}`,
  delete: (rule) => `Remove ${rule.singular}`,
}

/**
 * The actions whose summary does not depend on the group, and so are the only ones that
 * answer even where `singular` was not declared.
 */
const FIXED_SUMMARY: Record<string, string> = {
  'sign-in': 'Sign in',
  'sign-out': 'Sign out',
  'refresh': 'Renew the session',
  'complete': 'Confirm the upload',
  'parts': 'Resume the upload',
  'download': 'Download the file',
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

/** What `route.middleware.all()` returns, without repeating the framework union. */
type MiddlewareEntry = Parameters<typeof middlewareInfo>[0]

function toRoles(args: unknown): string[] {
  if (!Array.isArray(args)) return []

  return args.filter(function (role): role is string {
    return typeof role === 'string'
  })
}

/**
 * Reads the route protection from the middleware chain itself. The roles come from the
 * arguments of `middleware.role([...])`, so the documentation cannot
 * diverge from who can actually call the endpoint.
 *
 * Role groups nest - deleting in the panel is inside
 * `role(['OWNER', 'ADMINISTRATOR'])` **and** `role(['OWNER'])`. Both checks
 * must pass, so who can call is the intersection of the lists, not the
 * last one.
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
// Contract
// ---------------------------------------------------------------------------

/**
 * What is known about an operation after merging the two sources.
 *
 * Code introspection is the base; `static docs` only comes on top, for
 * prose and for what the code cannot say. The order matters: if the
 * declaration were the base, a route without a declaration would be empty - which was
 * exactly the problem of the first version, with 5 of 46 operations complete.
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
  /** status -> code -> message. */
  errors: Map<number, Map<string, string>>
  overrides?: OperationDocs['overrides']
}

/** Success status assumed when the controller did not reveal its own. */
function impliedSuccess(method: string): number {
  return IMPLIED_SUCCESS[method] ?? 200
}

async function buildContract(
  docs: OperationDocs | undefined,
  intro: Introspection | undefined,
  method: string,
  rule: TagRule | undefined,
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
    // `[x].flat()` normalizes a value or a list into a list without branching.
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

  // No declaration: the status comes from the controller's `context.response.<method>()`,
  // and the body from the feature entry in `#core/response`. A listing gets the paginated
  // envelope, because `paginate` is the only case where it applies.
  const status = intro?.successStatus ?? impliedSuccess(method)

  if (status === 204) {
    contract.responses = { 204: 'no-content' }

    return contract
  }

  // Guard before the read: without a directory there is nothing to load, and the cut
  // the ternary made is the same the `if` right below already made again.
  if (!intro?.directory) return contract

  const schema = loadResponseSchema(intro.directory, app.makePath('.'), intro.action)

  if (!schema) return contract

  if (intro?.action === 'paginate') {
    contract.responses = { [status]: { kind: 'paginated', item: schema } }

    return contract
  }

  contract.responses = { [status]: schema }

  return contract
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

type Components = Record<string, SchemaObject>

function isPaginated(body: ResponseBody): body is PaginatedResponse {
  return typeof body === 'object' && 'kind' in body && body.kind === 'paginated'
}

/**
 * The body of a response as JSON Schema, whatever it is.
 *
 * Two origins: the `…Response` schema of `shared/` (Zod), which is the rule's source,
 * and the VineJS schema of whoever has no response in `shared/` - the multipart
 * upload plan.
 */
function bodySchema(
  body: DocumentedValidator | z.ZodType,
  context: string,
  warnings: string[],
): SchemaObject {
  // The rule's source: the `…Response` schema of `shared/` (`openapi.md`).
  if (ZodSchema.is(body)) return ZodSchema.toOpenAPI(body)

  return VineSchema.toSchema(body, context, warnings)
}

function buildSuccessResponses(
  contract: Contract,
  operationId: string,
  components: Components,
  warnings: string[],
): Record<string, OpenAPIResponse> {
  const responses: Record<string, OpenAPIResponse> = {}
  const prefix = pascalize(operationId)

  for (const [rawStatus, body] of Object.entries(contract.responses)) {
    const status = Number(rawStatus)
    const description = SUCCESS_DESCRIPTIONS[status] ?? 'Success'

    if (body === 'no-content') {
      responses[rawStatus] = { description }
      continue
    }

    const context = `${operationId} (resposta ${status})`

    if (isPaginated(body)) {
      const itemName = `${prefix}Item`
      components[itemName] = bodySchema(body.item, context, warnings)
      responses[rawStatus] = {
        description,
        content: {
          'application/json': {
            schema: VineSchema.paginatedSchema({ $ref: `#/components/schemas/${itemName}` }),
          },
        },
      }
      continue
    }

    const name = `${prefix}Response${status}`
    const derived = bodySchema(body, context, warnings)
    components[name] = VineSchema.mergeSchema(derived, contract.overrides?.responses?.[status])
    responses[rawStatus] = {
      description,
      content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } },
    }
  }

  return responses
}

/**
 * The failures of the operation: the automatic ones, deduced from the protection and the
 * presence of a validator, joined with the ones the controller declared.
 */
function buildErrorResponses(
  contract: Contract,
  protection: Protection,
  components: Components,
): Record<string, OpenAPIResponse> {
  const codes = new Map<number, Map<string, string>>()

  const add = function (status: number, code?: string, message = '') {
    const current = codes.get(status) ?? new Map<string, string>()

    if (code && !current.get(code)) current.set(code, message)

    codes.set(status, current)
  }

  if (protection.authenticated) add(401, AUTOMATIC_CODES.unauthenticated, 'Unauthorized')
  if (protection.roles.length > 0) add(403, AUTOMATIC_CODES.forbidden, 'Acesso negado')
  if (contract.body || contract.query || contract.params) {
    add(422, AUTOMATIC_CODES.validation, 'Invalid data')
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

    // The messages came literally from the use case's `left(...)`, so they serve
    // as description without anyone writing anything.
    const messages = [...found.values()].filter(Boolean)
    if (!description && messages.length > 0) description = messages.join(' · ')

    responses[String(status)] = errorResponse(status, `#/components/schemas/${name}`, description)
  }

  return responses
}

// ---------------------------------------------------------------------------
// Operation
// ---------------------------------------------------------------------------

function buildParameters(
  contract: Contract,
  pathParams: string[],
  operationId: string,
  warnings: string[],
): OpenAPIParameter[] {
  const parameters: OpenAPIParameter[] = []

  const declared = new Map<string, OpenAPIParameter>()

  if (contract.params) {
    const schema = VineSchema.toSchema(contract.params, `${operationId} (parameters)`, warnings)

    for (const parameter of VineSchema.toParameters(schema, 'path')) {
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
    const schema = VineSchema.toSchema(contract.query, `${operationId} (query)`, warnings)
    parameters.push(...VineSchema.toParameters(schema, 'query'))
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
  warnings: string[],
): OpenAPIOperation {
  const { method, operationId, path, pathParams, protection } = input

  if (!contract.tag) {
    warnings.push(
      `${method.toUpperCase()} ${path}: no prefix of \`config/openapi.ts\` matches this ` +
        'path. The operation falls in "No group" in the sidebar.',
    )
  }

  const operation: OpenAPIOperation = {
    operationId,
    summary: contract.summary,
    tags: [contract.tag ?? 'No group'],
    responses: {},
  }

  if (contract.description) operation.description = contract.description
  if (contract.deprecated) operation.deprecated = true
  if (protection.authenticated) operation.security = [{ [SECURITY_SCHEME]: [] }]

  // Who can call, in its own field and not only in the 403 sentence. It is what
  // `authz:check` compares against the baseline: opening a route by accident is one
  // line less here, and without the field that line hides in a description.
  if (protection.roles.length > 0) operation['x-roles'] = protection.roles

  const parameters = buildParameters(contract, pathParams, operationId, warnings)

  if (parameters.length > 0) operation.parameters = parameters

  if (contract.body) {
    const name = `${pascalize(operationId)}Body`
    const derived = VineSchema.toSchema(contract.body, `${operationId} (payload)`, warnings)
    const patched = VineSchema.applyFieldPatches(derived, FIELD_PATCHES)
    const schema = VineSchema.mergeSchema(patched, contract.overrides?.body)
    components[name] = schema
    operation.requestBody = {
      required: true,
      content: {
        [requestContentType(schema)]: { schema: { $ref: `#/components/schemas/${name}` } },
      },
    }
  }

  operation.responses = buildSuccessResponses(contract, operationId, components, warnings)

  if (Object.keys(operation.responses).length === 0) {
    const status = impliedSuccess(method)
    operation.responses[String(status)] = {
      description:
        'Success. The body of this response is not described: the feature is not ' +
        'registered in `app/core/response.ts`.',
    }
    warnings.push(
      `${method.toUpperCase()} ${path}: no response body. Register the feature in ` +
        '`app/core/response.ts`, pointing to the `…Response` schema of `shared/`.',
    )
  }

  Object.assign(operation.responses, buildErrorResponses(contract, protection, components))

  return operation
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export async function buildDocument(): Promise<BuildResult> {
  router.commit()

  const components: Components = { PaginationMeta: VineSchema.PAGINATION_META_SCHEMA }

  const paths: Record<string, Record<string, OpenAPIOperation>> = {}
  const warnings: string[] = []
  const usedTags = new Set<string>()

  let documented = 0
  let total = 0

  const routes = Object.values(router.toJSON()).flat()

  for (const route of routes) {
    const { path, params } = toOpenAPIPath(route.pattern)

    // Compare with both forms: the path already converted to OpenAPI and the
    // raw Adonis pattern. Without the second, a wildcard route would only leave the
    // document if the config wrote `/uploads/{*}`, which is the output form,
    // not the one a person writes.
    if (openapi.ignore.includes(path) || openapi.ignore.includes(route.pattern)) continue

    // `HEAD` is generated by the framework from each `GET`; documenting it would only
    // duplicate every read operation.
    const methods = route.methods.filter(function (method) {
      return method !== 'HEAD'
    })

    if (methods.length === 0) continue

    const docs = await resolveDocs(route.handler)
    const protection = await readProtection(route.middleware.all())
    const rule = resolveTagRule(path)

    // The contract the code itself declares: validators used, status
    // returned and errors thrown by the sibling use case.
    const source = controllerFile(route.handler)
    let intro: Introspection | undefined

    if (source) intro = await introspect(source)

    if (source && !intro) {
      warnings.push(`${path}: could not read \`${source}\`.`)
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
        warnings,
      )

      const tag = operation.tags[0]
      if (tag !== undefined) usedTags.add(tag)

      const operations = paths[path] ?? {}
      operations[verb] = operation
      paths[path] = operations
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
 * Sorts paths and methods.
 *
 * The router iteration order is already stable, but sorting here is what makes a new
 * route show up in the diff as an addition in the right place, instead of shifting
 * everything that comes after it in the file.
 */
function sortPaths(
  paths: Record<string, Record<string, OpenAPIOperation>>,
): Record<string, Record<string, OpenAPIOperation>> {
  const sorted: Record<string, Record<string, OpenAPIOperation>> = {}

  for (const [path, byMethod] of Object.entries(paths).sort(
    ([left], [right]) => Number(left > right) - Number(left < right),
  )) {
    const operations: Record<string, OpenAPIOperation> = {}
    const methods = Object.entries(byMethod).sort(function ([left], [right]) {
      return METHOD_ORDER.indexOf(left) - METHOD_ORDER.indexOf(right)
    })

    for (const [method, operation] of methods) operations[method] = operation

    sorted[path] = operations
  }

  return sorted
}

function sortKeys(components: Components): Components {
  const sorted: Components = {}

  for (const [key, schema] of Object.entries(components).sort(
    ([left], [right]) => Number(left > right) - Number(left < right),
  )) {
    sorted[key] = schema
  }

  return sorted
}
