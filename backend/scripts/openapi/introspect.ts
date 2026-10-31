import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { basename, dirname, relative, resolve } from 'node:path'

import ts from 'typescript'

import type { DocumentedValidator, FeatureResponse } from '#core/openapi/types'
import HTTPException from '#exceptions/http.exception'
import { RESPONSES } from '#core/openapi/response'

/**
 * Reads the contract the code already declares.
 *
 * This is the difference from `adonis-autoswagger`: there the documentation comes
 * from JSDoc someone writes on the controller, so a route only shows up complete
 * if someone remembered to annotate it - and every route becomes a comment block to
 * maintain. Here the controller already says everything:
 *
 * ```ts
 * const payload = await context.request.validateUsing(AdministratorNoticeCreateValidator)
 * const payload = await IdentifierValidator.validate(context.params)
 * const payload = await AdministratorNoticePaginationValidator.validate(context.request.qs())
 * return context.response.created(result.value)
 * ```
 *
 * Payload, payload origin and success status are there, written by the
 * same code that runs in production. Reading the AST instead of asking for a declaration makes the
 * document unable to diverge: changing the controller's validator changes the
 * documentation on the next `openapi:generate`, with nobody remembering anything.
 *
 * The sibling use case supplies the domain errors, by the same reasoning.
 */

type IntrospectedError = {
  status: number
  code: string
  message: string
}

export type Introspection = {
  body?: DocumentedValidator
  query?: DocumentedValidator
  params?: DocumentedValidator
  successStatus?: number
  errors: IntrospectedError[]
  /** `create`, `update`, `show`, `paginate`, `delete`... */
  action: string
  /** Feature directory, to find its entry in `#core/response`. */
  directory: string
}

/**
 * `response` methods that carry the status in the name. No controller in the
 * project uses `response.status(n)`, and if one starts to, the status becomes
 * undefined instead of wrong.
 */
const RESPONSE_STATUS: Record<string, number> = {
  ok: 200,
  created: 201,
  accepted: 202,
  noContent: 204,
}

/**
 * Status of each `HTTPException` factory, built by calling the factories
 * themselves.
 *
 * A hand-written table here would diverge the day someone changed the
 * status of a factory. Asking the object has no such risk.
 */
function factoryStatuses(): Record<string, number> {
  const statuses: Record<string, number> = {}

  for (const name of Object.getOwnPropertyNames(HTTPException)) {
    const factory = Reflect.get(HTTPException, name)

    if (typeof factory !== 'function') continue
    if (name === 'prototype' || name === 'length' || name === 'name') continue

    try {
      const instance = factory.call(HTTPException)

      if (instance instanceof HTTPException) statuses[name] = instance.status
    } catch {
      // Factory with a signature different from the expected: ignored, not guessed.
    }
  }

  return statuses
}

const FACTORY_STATUS = factoryStatuses()

// ---------------------------------------------------------------------------
// AST reading
// ---------------------------------------------------------------------------

async function parse(file: string): Promise<ts.SourceFile> {
  const source = await readFile(file, 'utf-8')

  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
}

function walk(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node)
  ts.forEachChild(node, (child) => walk(child, visit))
}

/** Identifier -> import specifier map, to resolve the validator. */
function collectImports(source: ts.SourceFile): Map<string, string> {
  const imports = new Map<string, string>()

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue

    const specifier = statement.moduleSpecifier.text
    const bindings = statement.importClause?.namedBindings

    if (statement.importClause?.name) {
      imports.set(statement.importClause.name.text, specifier)
    }

    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) imports.set(element.name.text, specifier)
    }
  }

  return imports
}

function calleeText(call: ts.CallExpression): string {
  return call.expression.getText()
}

/**
 * Where the payload comes from, by the call argument.
 *
 * `request.validateUsing(X)` with no option validates the body; with `{ data: ... }` the
 * origin is the one the option points to (`context.request.qs()`, `context.params`).
 * `Validator.validate(...)` states the origin in the argument itself.
 */
function sourceOf(call: ts.CallExpression): 'body' | 'query' | 'params' | undefined {
  const callee = calleeText(call)

  if (callee.endsWith('.validateUsing')) {
    const options = call.arguments[1]
    if (!options) return 'body'
    const text = options.getText()
    if (text.includes('.qs(')) return 'query'
    if (text.includes('.params')) return 'params'
    return 'body'
  }
  if (!callee.endsWith('.validate')) return undefined

  const [argument] = call.arguments

  if (!argument) return undefined

  const text = argument.getText()

  // The argument can be the direct origin (`context.params`) or an object that
  // spreads it (`{ ...context.request.body() }`), which is how the update controllers
  // join body and params. Searching for the origin inside the text
  // covers both forms.
  if (text.includes('.body(')) return 'body'
  if (text.includes('.qs(')) return 'query'
  if (text.includes('.params')) return 'params'

  return undefined
}

/** The identifier of the validator used in a call. */
function validatorName(call: ts.CallExpression): string | undefined {
  const callee = calleeText(call)

  if (callee.endsWith('.validateUsing')) {
    const [argument] = call.arguments

    if (argument && ts.isIdentifier(argument)) return argument.text

    return undefined
  }

  // `XValidator.validate(...)` -> the name is before the dot.
  const owner = callee.slice(0, -'.validate'.length)

  if (/^[A-Za-z_$][\w$]*$/.test(owner)) return owner

  return undefined
}

// ---------------------------------------------------------------------------
// Validator resolution
// ---------------------------------------------------------------------------

function isValidator(value: unknown): value is DocumentedValidator {
  if (typeof value !== 'object' || value === null) return false

  return 'toJSONSchema' in value && typeof Reflect.get(value, 'toJSONSchema') === 'function'
}

/**
 * Imports the validator module and returns the exported instance.
 *
 * Relative specifiers are resolved against the controller file;
 * `#alias/...` is handed to Node, which already knows how to resolve it through the `imports` map
 * of `package.json`.
 */
async function loadValidator(
  name: string,
  specifier: string,
  from: string,
): Promise<DocumentedValidator | undefined> {
  let target = specifier

  if (specifier.startsWith('.')) {
    target = pathToFileURL(resolve(dirname(from), specifier)).href
  }

  try {
    const module = await import(target)
    const exported = Reflect.get(module, name)

    if (isValidator(exported)) return exported
  } catch {
    return undefined
  }

  return undefined
}

// ---------------------------------------------------------------------------
// Use case errors
// ---------------------------------------------------------------------------

/**
 * The business messages in pt-BR, the document language (`_standards/openapi.md`,
 * "erros-do-use-case"): the key is `<file>.<path>`, as Adonis's `i18n.t()`
 * resolves it (_doc-lib/adonisjs.md#guides/digging-deeper/i18n).
 */
const PT_BR_MESSAGES: ReadonlyMap<string, string> = (() => {
  const messages = new Map<string, string>()
  const root = resolve(dirname(new URL(import.meta.url).pathname), '../../resources/lang/pt-BR')

  const flatten = function (prefix: string, value: unknown): void {
    if (typeof value === 'string') {
      messages.set(prefix, value)
      return
    }
    if (typeof value !== 'object' || value === null) return
    for (const [key, nested] of Object.entries(value)) flatten(`${prefix}.${key}`, nested)
  }

  if (!existsSync(root)) return messages

  for (const file of readdirSync(root)) {
    if (!file.endsWith('.json')) continue
    flatten(file.replace('.json', ''), JSON.parse(readFileSync(resolve(root, file), 'utf8')))
  }

  return messages
})()

/**
 * The message text: a literal, or the key of `t('key')` / `this.i18n.t('key')`
 * resolved in pt-BR. A key built in a variable is not guessed.
 */
function messageText(node: ts.Expression): string | undefined {
  if (ts.isStringLiteralLike(node)) return node.text
  if (!ts.isCallExpression(node)) return undefined

  const callee = calleeText(node)
  if (callee !== 't' && !callee.endsWith('.t')) return undefined

  const [keyNode] = node.arguments
  if (!keyNode || !ts.isStringLiteralLike(keyNode)) return undefined

  return PT_BR_MESSAGES.get(keyNode.text)
}

/**
 * Collects `HTTPException.Factory(message, 'CODE')` under a node.
 *
 * Only literal arguments are read. A code built in a variable is not guessed -
 * it would be left out and `--strict` charges for it, which is better than documenting a guess.
 */
function collectErrors(root: ts.Node, errors: IntrospectedError[], seen: Set<string>): void {
  walk(root, function (node) {
    if (!ts.isCallExpression(node)) return

    const callee = calleeText(node)

    if (!callee.startsWith('HTTPException.')) return

    const factory = callee.slice('HTTPException.'.length)
    const status = FACTORY_STATUS[factory]

    if (!status) return

    const [messageNode, codeNode] = node.arguments

    const message = messageNode && messageText(messageNode)

    if (message === undefined) return
    if (!codeNode || !ts.isStringLiteralLike(codeNode)) return

    const key = `${status}:${codeNode.text}`

    if (seen.has(key)) return

    seen.add(key)
    errors.push({ status, code: codeNode.text, message })
  })
}

// ---------------------------------------------------------------------------
// Translator `_shared.<resource>-refusal.ts`
// ---------------------------------------------------------------------------

const BACKEND_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..')

const REFUSAL_IMPORT = /_shared\.[a-z-]+-refusal(\.ts)?$/

let featureProgramCache: ts.Program | undefined

/**
 * The program with the use cases as root, created once: the type of the fact that
 * reaches the translator is only known to the checker, and it needs the imports resolved.
 */
function featureProgram(): ts.Program | undefined {
  if (featureProgramCache) return featureProgramCache

  const parsed = ts.getParsedCommandLineOfConfigFile(
    resolve(BACKEND_ROOT, 'tsconfig.json'),
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
  )

  if (!parsed) return undefined

  featureProgramCache = ts.createProgram({
    rootNames: parsed.fileNames.filter((name) => name.endsWith('.use-case.ts')),
    options: parsed.options,
  })

  return featureProgramCache
}

/** The `code` of each fact the argument can be, read from its type. */
function factCodes(argument: ts.Expression, checker: ts.TypeChecker): string[] {
  const codeSymbol = checker.getTypeAtLocation(argument).getProperty('code')

  if (!codeSymbol) return []

  const codeType = checker.getTypeOfSymbolAtLocation(codeSymbol, argument)
  let members = [codeType]

  if (codeType.isUnion()) members = codeType.types

  return members.filter((member) => member.isStringLiteral()).map((member) => member.value)
}

/** The name of an object key or method, when it is a literal. */
function entryKey(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text
  return undefined
}

/**
 * The errors the use case refuses through a `_shared.<resource>-refusal.ts`: from the
 * table, only the entries of the facts it can receive (the type of the argument of
 * `Refusal.http(fact, i18n)`); from any other static method of the translator, the
 * whole body (`_standards/openapi.md`, "erros-do-use-case").
 */
async function readRefusalErrors(useCase: string): Promise<IntrospectedError[]> {
  const program = featureProgram()

  if (!program) return []

  const checker = program.getTypeChecker()
  // Translator path -> what is asked of it (a fact `code` or `method:<name>`).
  const wanted = new Map<string, Set<string>>()

  for (const sourceFile of sharedChain(program, useCase)) {
    const refusals = new Map<string, string>()

    for (const [name, specifier] of collectImports(sourceFile)) {
      const path = featurePath(specifier, sourceFile.fileName)

      if (path && REFUSAL_IMPORT.test(specifier)) refusals.set(name, path)
    }

    walk(sourceFile, function (node) {
      if (!ts.isCallExpression(node)) return
      if (!ts.isPropertyAccessExpression(node.expression)) return
      if (!ts.isIdentifier(node.expression.expression)) return

      const path = refusals.get(node.expression.expression.text)

      if (!path) return

      const entries = wanted.get(path) ?? new Set<string>()
      const [argument] = node.arguments

      if (node.expression.name.text === 'http' && argument) {
        for (const code of factCodes(argument, checker)) entries.add(code)
      } else {
        entries.add(`method:${node.expression.name.text}`)
      }

      wanted.set(path, entries)
    })
  }

  const errors: IntrospectedError[] = []
  const seen = new Set<string>()

  for (const [path, entries] of wanted) {
    let translator

    try {
      translator = await parse(path)
    } catch {
      continue
    }

    walk(translator, function (node) {
      if (ts.isPropertyAssignment(node)) {
        const key = entryKey(node.name)

        if (key && entries.has(key)) collectErrors(node.initializer, errors, seen)
      }

      if (ts.isMethodDeclaration(node)) {
        const key = entryKey(node.name)

        if (key && entries.has(`method:${key}`)) collectErrors(node, errors, seen)
      }
    })
  }

  return errors
}

/** The `app/features` file the specifier (relative or `#features/`) points to. */
function featurePath(specifier: string, from: string): string | undefined {
  let base: string | undefined

  if (specifier.startsWith('#features/')) {
    base = resolve(BACKEND_ROOT, 'app/features', specifier.slice('#features/'.length))
  }

  if (specifier.startsWith('.')) base = resolve(dirname(from), specifier)

  if (!base) return undefined

  if (base.endsWith('.ts')) return base

  return `${base}.ts`
}

/**
 * The use case and the `_shared.*` it imports, transitively: the
 * `_shared.<theme>.base` it extends also calls the translator.
 */
function sharedChain(program: ts.Program, useCase: string): ts.SourceFile[] {
  const visited = new Map<string, ts.SourceFile>()
  const queue = [useCase]

  for (const next of queue) {
    const sourceFile = program.getSourceFile(next)

    if (!sourceFile || visited.has(next)) continue

    visited.set(next, sourceFile)

    for (const specifier of collectImports(sourceFile).values()) {
      const path = featurePath(specifier, next)

      if (path && basename(path).startsWith('_shared.') && !REFUSAL_IMPORT.test(specifier)) {
        queue.push(path)
      }
    }
  }

  return [...visited.values()]
}

/** The errors of the sibling use case: the ones it writes and the ones its translator returns. */
async function readErrors(file: string): Promise<IntrospectedError[]> {
  let source

  try {
    source = await parse(file)
  } catch {
    return []
  }

  const errors: IntrospectedError[] = []
  const seen = new Set<string>()

  collectErrors(source, errors, seen)

  for (const error of await readRefusalErrors(file)) {
    const key = `${error.status}:${error.code}`

    if (seen.has(key)) continue

    seen.add(key)
    errors.push(error)
  }

  return errors
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

/**
 * From the route's `importExpression` to the controller source file.
 *
 * The router stores the text of the whole expression - `"()=>import('#features/...')"` -
 * and not only the specifier, so it is extracted from inside the `import()`.
 */
export function controllerPath(importExpression: string, appRoot: string): string | undefined {
  const specifier = importExpression.match(/import\(\s*['"]([^'"]+)['"]\s*\)/)?.[1]

  if (!specifier?.startsWith('#features/')) return undefined

  const feature = specifier.slice('#features/'.length)

  return resolve(appRoot, 'app/features', `${feature}.ts`)
}

/**
 * The feature response, read from the central registry in `#core/response`.
 *
 * The key is the folder path inside `app/features` - `administrator/sports`,
 * `storefront/photos`. One entry per feature covers its seven operations:
 * create, list, show, update, archive, restore and remove return the
 * same resource, in envelopes the generator builds by itself.
 *
 * One response file per folder would repeat the `…Response` schema of `shared/`:
 * the same contract written twice, and the second copy aging silently.
 */
export function loadResponseSchema(
  directory: string,
  appRoot: string,
  action?: string,
): FeatureResponse | undefined {
  const features = resolve(appRoot, 'app/features')
  const key = relative(features, directory)

  // The action entry beats the resource one: `administrator/sports/paginate`
  // points to the list item when it is not the shape of the detail
  // (`_standards/openapi.md`, "registro-de-resposta").
  if (action) {
    const specific = RESPONSES[`${key}/${action}`]
    if (specific) return specific
  }

  return RESPONSES[key]
}

export async function introspect(file: string): Promise<Introspection | undefined> {
  let source

  try {
    source = await parse(file)
  } catch {
    return undefined
  }

  const imports = collectImports(source)
  // The action is a folder (`users/archive/archive.controller.ts`), and the resource is
  // the folder above it - it is the key of `RESPONSES`.
  const action = file.split('/').pop()?.replace('.controller.ts', '') ?? ''
  let directory = dirname(file)
  if (basename(directory) === action) directory = dirname(directory)

  const found: Introspection = { errors: [], action, directory }

  const pending: Array<{ slot: 'body' | 'query' | 'params'; name: string }> = []

  walk(source, function (node) {
    if (!ts.isCallExpression(node)) return

    const callee = calleeText(node)

    // `context.response.created(...)` -> 201
    const method = callee.match(/response\.([a-zA-Z]+)$/)?.[1]

    if (method && RESPONSE_STATUS[method]) found.successStatus = RESPONSE_STATUS[method]

    const slot = sourceOf(node)

    if (!slot) return

    const name = validatorName(node)

    if (name) pending.push({ slot, name })
  })

  for (const { slot, name } of pending) {
    const specifier = imports.get(name)

    if (!specifier) continue

    const validator = await loadValidator(name, specifier, file)

    if (validator) found[slot] = validator
  }

  found.errors = await readErrors(file.replace('.controller.ts', '.use-case.ts'))

  return found
}
