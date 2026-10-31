import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { basename, dirname, relative, resolve } from 'node:path'

import ts from 'typescript'

import type { DocumentedValidator, FeatureResponse } from '#core/openapi/types'
import HTTPException from '#exceptions/http.exception'
import { RESPONSES } from '#core/openapi/response'

/**
 * Lê o contrato que o código já declara.
 *
 * Esta é a diferença em relação ao `adonis-autoswagger`: lá a documentação vem
 * de JSDoc que alguém escreve no controller, então uma rota só aparece completa
 * se alguém lembrou de anotá-la - e cada rota vira um bloco de comentário para
 * manter. Aqui o controller já diz tudo:
 *
 * ```ts
 * const payload = await context.request.validateUsing(AdministratorNoticeCreateValidator)
 * const payload = await IdentifierValidator.validate(context.params)
 * const payload = await AdministratorNoticePaginationValidator.validate(context.request.qs())
 * return context.response.created(result.value)
 * ```
 *
 * Payload, origem do payload e status de sucesso estão ali, escritos pelo
 * mesmo código que roda em produção. Ler o AST em vez de pedir declaração faz o
 * documento não ter como divergir: mudar o validator do controller muda a
 * documentação no próximo `openapi:generate`, sem ninguém lembrar de nada.
 *
 * O use-case irmão fornece os erros do domínio, pelo mesmo raciocínio.
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
  /** Diretório da feature, para achar a entrada dela em `#core/response`. */
  directory: string
}

/**
 * Métodos de `response` que carregam o status no nome. Nenhum controller do
 * projeto usa `response.status(n)`, e se algum passar a usar o status fica
 * indefinido em vez de errado.
 */
const RESPONSE_STATUS: Record<string, number> = {
  ok: 200,
  created: 201,
  accepted: 202,
  noContent: 204,
}

/**
 * Status de cada fábrica do `HTTPException`, montado chamando as próprias
 * fábricas.
 *
 * Uma tabela escrita à mão aqui divergiria no dia em que alguém mudasse o
 * status de uma fábrica. Perguntar ao objeto não tem esse risco.
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
      // Fábrica com assinatura diferente do esperado: ignorada, não adivinhada.
    }
  }

  return statuses
}

const FACTORY_STATUS = factoryStatuses()

// ---------------------------------------------------------------------------
// Leitura do AST
// ---------------------------------------------------------------------------

async function parse(file: string): Promise<ts.SourceFile> {
  const source = await readFile(file, 'utf-8')

  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
}

function walk(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node)
  ts.forEachChild(node, (child) => walk(child, visit))
}

/** Mapa identificador -> especificador de import, para resolver o validator. */
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
 * De onde o payload vem, pelo argumento da chamada.
 *
 * `request.validateUsing(X)` sem opção valida o corpo; com `{ data: ... }` a
 * origem é a que a opção aponta (`context.request.qs()`, `context.params`).
 * `Validator.validate(...)` diz a origem no próprio argumento.
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

  // O argumento pode ser a origem direta (`context.params`) ou um objeto que a
  // espalha (`{ ...context.request.body() }`), que é como os controllers de
  // atualização juntam corpo e parâmetros. Procurar a origem dentro do texto
  // cobre as duas formas.
  if (text.includes('.body(')) return 'body'
  if (text.includes('.qs(')) return 'query'
  if (text.includes('.params')) return 'params'

  return undefined
}

/** O identificador do validator usado numa chamada. */
function validatorName(call: ts.CallExpression): string | undefined {
  const callee = calleeText(call)

  if (callee.endsWith('.validateUsing')) {
    const [argument] = call.arguments

    if (argument && ts.isIdentifier(argument)) return argument.text

    return undefined
  }

  // `XValidator.validate(...)` -> o nome está antes do ponto.
  const owner = callee.slice(0, -'.validate'.length)

  if (/^[A-Za-z_$][\w$]*$/.test(owner)) return owner

  return undefined
}

// ---------------------------------------------------------------------------
// Resolução do validator
// ---------------------------------------------------------------------------

function isValidator(value: unknown): value is DocumentedValidator {
  if (typeof value !== 'object' || value === null) return false

  return 'toJSONSchema' in value && typeof Reflect.get(value, 'toJSONSchema') === 'function'
}

/**
 * Importa o módulo do validator e devolve a instância exportada.
 *
 * Especificadores relativos são resolvidos contra o arquivo do controller;
 * `#alias/...` é entregue ao Node, que já sabe resolvê-lo pelo mapa `imports`
 * do `package.json`.
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
// Erros do use-case
// ---------------------------------------------------------------------------

/**
 * As mensagens de negócio em pt-BR, a língua do documento (`_standards/openapi.md`,
 * "erros-do-use-case"): a chave é `<arquivo>.<caminho>`, como o `i18n.t()` do
 * Adonis resolve (_doc-lib/adonisjs.md#guides/digging-deeper/i18n).
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
 * O texto da mensagem: literal, ou a chave de `t('chave')` / `this.i18n.t('chave')`
 * resolvida em pt-BR. Chave montada em variável não é adivinhada.
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
 * Coleta `HTTPException.Fábrica(mensagem, 'CODE')` sob um nó.
 *
 * Só argumentos literais são lidos. Code montado em variável não é adivinhado -
 * ficaria de fora e o `--strict` cobra, que é melhor que documentar um palpite.
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
// Tradutor `_shared.<recurso>-refusal.ts`
// ---------------------------------------------------------------------------

const BACKEND_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..')

const REFUSAL_IMPORT = /_shared\.[a-z-]+-refusal(\.ts)?$/

let featureProgramCache: ts.Program | undefined

/**
 * O programa com os use-cases como raiz, criado uma vez: o tipo do fato que
 * chega ao tradutor só o checador sabe, e ele precisa dos imports resolvidos.
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

/** Os `code` de cada fato que o argumento pode ser, lidos do tipo dele. */
function factCodes(argument: ts.Expression, checker: ts.TypeChecker): string[] {
  const codeSymbol = checker.getTypeAtLocation(argument).getProperty('code')

  if (!codeSymbol) return []

  const codeType = checker.getTypeOfSymbolAtLocation(codeSymbol, argument)
  let members = [codeType]

  if (codeType.isUnion()) members = codeType.types

  return members.filter((member) => member.isStringLiteral()).map((member) => member.value)
}

/** O nome de uma chave de objeto ou de método, quando é literal. */
function entryKey(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text
  return undefined
}

/**
 * Os erros que o use-case recusa por um `_shared.<recurso>-refusal.ts`: da
 * tabela, só as entradas dos fatos que ele pode receber (o tipo do argumento de
 * `Refusal.http(fato, i18n)`); de qualquer outro método estático do tradutor, o
 * corpo inteiro (`_standards/openapi.md`, "erros-do-use-case").
 */
async function readRefusalErrors(useCase: string): Promise<IntrospectedError[]> {
  const program = featureProgram()

  if (!program) return []

  const checker = program.getTypeChecker()
  // Caminho do tradutor -> o que se pede dele (`code` de fato ou `method:<nome>`).
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

/** O arquivo de `app/features` que o especificador (relativo ou `#features/`) aponta. */
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
 * O use-case e os `_shared.*` que ele importa, de forma transitiva: a base
 * `_shared.<tema>.base` que ele estende também chama o tradutor.
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

/** Os erros do use-case irmão: os que ele escreve e os que o tradutor dele devolve. */
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
// Entrada
// ---------------------------------------------------------------------------

/**
 * Do `importExpression` da rota para o arquivo-fonte do controller.
 *
 * O router guarda o texto da expressão inteira - `"()=>import('#features/...')"` -
 * e não só o especificador, então ele é extraído de dentro do `import()`.
 */
export function controllerPath(importExpression: string, appRoot: string): string | undefined {
  const specifier = importExpression.match(/import\(\s*['"]([^'"]+)['"]\s*\)/)?.[1]

  if (!specifier?.startsWith('#features/')) return undefined

  const feature = specifier.slice('#features/'.length)

  return resolve(appRoot, 'app/features', `${feature}.ts`)
}

/**
 * A resposta da feature, lida do registro central em `#core/response`.
 *
 * A chave é o caminho da pasta dentro de `app/features` - `administrator/sports`,
 * `storefront/photos`. Uma entrada por feature cobre as sete operações dela:
 * criar, listar, detalhar, atualizar, arquivar, restaurar e remover devolvem o
 * mesmo recurso, em envelopes que o gerador monta sozinho.
 *
 * Um arquivo de resposta por pasta repetiria o schema `…Response` do `shared/`:
 * o mesmo contrato escrito duas vezes, e a segunda cópia envelhecendo calada.
 */
export function loadResponseSchema(
  directory: string,
  appRoot: string,
  action?: string,
): FeatureResponse | undefined {
  const features = resolve(appRoot, 'app/features')
  const key = relative(features, directory)

  // A entrada da ação ganha da do recurso: `administrator/sports/paginate`
  // aponta o item da lista quando ele não é a forma do detalhe
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
  // A ação é uma pasta (`users/archive/archive.controller.ts`), e o recurso é
  // a pasta acima dela - é a chave de `RESPONSES`.
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
