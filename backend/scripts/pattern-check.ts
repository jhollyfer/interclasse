/**
 * Enforces the conventions of `_standards/backend.md` and `_standards/architecture.md` that ESLint does not reach.
 *
 * ESLint already enforces the four writing rules (ternary, `any`, `as`,
 * `interface`) and the ban on `new` in a service. What remains is what depends on
 * knowing *where* the file is and *what it is called* - class name derived from the
 * path, a layer that cannot import another, pagination envelope, soft delete
 * scope. A lint rule does not solve this without inventing a plugin; a 300-line
 * script does.
 *
 * Each rule points to the section of the ruler that originates it, so that the error message
 * carries the decision along and not only the symptom. What belongs to this project - named
 * exemptions, environment keys outside the reader, SHAPE files - lives in
 * `scripts/pattern-check.config.ts`.
 *
 * Usage:
 *   node --import @poppinss/ts-exec scripts/pattern-check.ts            # fails
 *   node --import @poppinss/ts-exec scripts/pattern-check.ts --report   # only measures
 */

import { access, readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'

import { CONFIG } from './pattern-check.config.ts'

type Finding = {
  file: string
  line: number
  rule: string
  section: string
  message: string
}

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')

/** Directories the ruler requires even when empty. Section 1.1. */
const REQUIRED_DIRECTORIES = [
  'app/core',
  'app/features',
  'app/exceptions',
  'app/models',
  'app/services',
  'app/middleware',
  'app/guards',
  'app/policies',
]

const IGNORED = new Set(['node_modules', 'build', '.adonisjs', 'tmp', '.git', 'coverage'])

async function tsFiles(dir: string): Promise<string[]> {
  const found: string[] = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return found
  }

  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue
    const filePath = join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...(await tsFiles(filePath)))
      continue
    }
    if (entry.name.endsWith('.ts')) found.push(filePath)
  }

  return found
}

/**
 * Removes line and block comments before matching a pattern. Without this, every
 * example inside a JSDoc - and this project has many - would become a violation.
 */
function withoutComments(source: string): string {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, (chunk) => chunk.replace(/[^\n]/g, ' '))
  return withoutBlocks.replace(/(^|[^:])\/\/.*$/gm, (_match, prefix: string) => prefix)
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

/** `paginate.controller.ts` -> `Paginate`. */
function verbOf(file: string): string {
  const name = basename(file).replace(/\.(controller|use-case)\.ts$/, '')
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** `certification-grants` -> `certificationGrants`. */
function camel(segment: string): string {
  const parts = segment.split('-')
  return parts[0] + parts.slice(1).map(pascal).join('')
}

/** `course-modules` -> `CourseModules`. */
function pascal(segment: string): string {
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/**
 * The probable singular of a directory segment.
 *
 * A heuristic, and assumed as such: that is why it does not decide alone - the
 * rule accepts the segment with and without it.
 */
function singular(segment: string): string {
  if (segment.endsWith('ies')) return `${segment.slice(0, -3)}y`
  if (/(sses|shes|ches)$/.test(segment)) return segment.slice(0, -2)
  if (segment.endsWith('s') && !segment.endsWith('ss')) return segment.slice(0, -1)
  return segment
}

/**
 * The names the path authorizes: one with the last directory as it is on disk,
 * another with it in the singular. Outside `app/features/` there is no path to
 * derive from, and the rule does not apply.
 */
function derivedNames(relativePath: string, suffix: string): string[] {
  const inside = relativePath.split('app/features/')[1]
  if (inside === undefined) return []

  const parts = inside.split('/')
  // The action folder repeats the verb and does not enter the class name:
  // `administrator/users/archive/archive.controller.ts` -> `AdministratorUserArchiveController`.
  const folder = parts[parts.length - 2]
  const file = basename(relativePath).replace(/\.(controller|use-case)\.ts$/, '')
  let dirs = parts.slice(0, -1)
  if (folder === file) dirs = parts.slice(0, -2)
  if (dirs.length === 0) return []

  const verb = verbOf(relativePath)
  const literal = dirs.map(pascal).join('')
  const last = dirs.length - 1
  const withSingular = dirs
    .map((d, i) => {
      if (i === last) return pascal(singular(d))
      return pascal(d)
    })
    .join('')

  return [...new Set([`${literal}${verb}${suffix}`, `${withSingular}${verb}${suffix}`])]
}

type Rule = {
  name: string
  section: string
  /** Matches on the source already stripped of comments. */
  pattern: RegExp
  message: string
  /** When present, the rule only runs on files whose path matches. */
  scope?: RegExp
}

const RULES: Rule[] = [
  {
    name: 'policy-outside-bouncer',
    section: '4.6',
    // The policy is checked by the controller with `ctx.bouncer.with(Policy)`; the use
    // case receives the already authorized record and knows no policy at all.
    scope: /\.use-case\.ts$/,
    pattern: /from\s+'#policies\//,
    message:
      'a policy does not enter the use case: the controller checks with `ctx.bouncer.with(Policy).authorize(...)`',
  },
  {
    name: 'injected-policy',
    section: '4.6',
    scope: /app\/(?:features|services|middleware)\//,
    pattern: /\bprivate\s+readonly\s+\w+\s*:\s*\w+Policy\b/,
    message:
      'a policy is neither injected nor called directly; the only path is `ctx.bouncer` (authorize/allows/denies/execute)',
  },
  {
    name: 'vine-outside-core',
    section: '4.4',
    // The configured `vine` (pt-BR messages, date transform) comes from
    // `#core/validator`; importing the lib directly skips that configuration.
    scope: /^(?!app\/core\/validator\.ts$)(?:app|start|database|commands|tests)\//,
    pattern: /from\s+'@vinejs\/vine'/,
    message: 'import `vine` (and `Infer`) from `#core/validator`, never from `@vinejs/vine`',
  },
  {
    name: 'validator-outside-resource',
    section: '4.4',
    // `app/core/` is left out: `response.ts` declares in VineJS the response
    // contract that does not derive from a model, and that is not an input validator.
    scope: /^app\/(?!core\/).*(?<!\.validator)\.ts$/,
    pattern: /\bvine\.create\(/,
    message:
      'a validator lives in `app/features/<module>/<resource>/<resource>.validator.ts` (or is global in `app/core/validator.ts`)',
  },
  {
    name: 'context-serializer',
    section: '4.5',
    pattern: /\b(?:ctx|context)\.serialize\b/,
    message:
      '`context.serialize` was removed with `api_provider`; the envelope is `{ meta, data }` built in the use case',
  },
  {
    name: 'local-pagination-constant',
    section: '4.5',
    scope: /app\/features\//,
    pattern: /^\s*const\s+(?:PAGE|PER_PAGE)\s*=/m,
    message: 'the pagination default is not redeclared per use case',
  },
  {
    name: 'actor-as-id',
    section: '4.3',
    scope: /\.use-case\.ts$/,
    pattern: /\bactor\s*:\s*string\b/,
    message:
      '`actor` is the `Actor` object validated by the schema, not the id; the policy receives (actor, target)',
  },
  {
    name: 'throw-in-use-case-or-repository',
    section: '4.2',
    scope: /\.(?:use-case|lucid\.repository|memory\.repository)\.ts$/,
    // `throw error` rethrows what the `catch` received (the repository only recognizes the
    // unique violation and rethrows the rest); what the ruler forbids is creating the failure.
    pattern: /\bthrow\s+(?!error\b)/,
    message:
      'a business failure is `left(...)`, never `throw`; the repository returns `null` or the fact, and the use case decides',
  },
  {
    name: 'or-fail-in-use-case-or-repository',
    section: '4.2',
    scope: /\.(?:use-case|lucid\.repository|memory\.repository)\.ts$/,
    pattern: /\.\w*OrFail\s*\(/,
    message:
      '`*OrFail()` throws and becomes 500 where 404 belongs: use `.first()`/`.find()` and return `null`',
  },
  {
    name: 'shared-with-io',
    section: '4.9',
    // `_shared.<theme>.ts` is pure function only; the template method base
    // (`_shared.<theme>.base.ts`) injects what it needs and is left out.
    scope: /_shared\.[^/]*(?<!\.base)\.ts$/,
    // `import type` is left out: a type vanishes at compilation and does no I/O.
    pattern:
      /^(?!import type\b).*from\s+'(?:#models\/|#repositories\/|#services\/|@adonisjs\/lucid|@adonisjs\/drive|node:fs|@adonisjs\/core\/services\/db)/,
    message:
      '`_shared` is pure functions only: no model, repository, service, `db`, `drive` or file',
  },
  {
    name: 'core-imports-upper-layer',
    section: '1.3',
    scope: /app\/core\//,
    pattern: /from\s+'#(?:features|services)\//,
    message: '`app/core/` does not import from features or services',
  },
  {
    name: 'service-imports-feature',
    section: '1.3',
    scope: /app\/services\//,
    // `#features/_shared.<theme>` is left out: it is the declared place of the shared
    // pure function, and importing it couples the service to no feature. What the
    // rule refuses is depending on a module - `#features/administrator/...`.
    pattern: /from\s+'#features\/(?!_shared\.)/,
    message: '`app/services/` does not import from a features module (only from `_shared.<theme>`)',
  },
]

function applyRules(relativePath: string, source: string): Finding[] {
  const findings: Finding[] = []
  const clean = withoutComments(source)

  for (const rule of RULES) {
    if (rule.scope !== undefined && !rule.scope.test(relativePath)) continue
    const match = rule.pattern.exec(clean)
    if (match === null) continue
    findings.push({
      file: relativePath,
      line: lineOf(clean, match.index),
      rule: rule.name,
      section: rule.section,
      message: rule.message,
    })
  }

  return findings
}

/**
 * The exported class derives from the whole path, and not only from the verb.
 *
 * The suffix alone let through what appeared most: `EnrollmentUpdateController`
 * in a file of `administrator/enrollments/` ends in `UpdateController` and
 * still loses the module. Without the module the name does not say which route group the
 * class belongs to - and `administrator/enrollments` and `storefront/enrollments` are two
 * different use cases over the same table, with different authorization.
 *
 * Singularization remains a heuristic, and so it **does not decide**: the
 * rule accepts both the segment as it is on disk and its singular form.
 * Both derive from the path deterministically; which of the two the project uses
 * is a style choice, and neither lets the module be forgotten.
 */
function checkClassName(relativePath: string, source: string): Finding[] {
  const isController = relativePath.endsWith('.controller.ts')
  const isUseCase = relativePath.endsWith('.use-case.ts')
  if (!isController && !isUseCase) return []
  if (relativePath.includes('.spec.')) return []

  const clean = withoutComments(source)
  const declaration = /export\s+default\s+class\s+([A-Za-z0-9_]+)/.exec(clean)
  if (declaration === null) return []

  const name = declaration[1] ?? ''
  let suffix = 'UseCase'
  if (isController) suffix = 'Controller'

  const accepted = derivedNames(relativePath, suffix)
  if (accepted.length === 0) return []
  if (accepted.includes(name)) return []

  return [
    {
      file: relativePath,
      line: lineOf(clean, declaration.index),
      rule: 'class-name',
      section: '3',
      message: `class \`${name}\` should be \`${accepted.join('` or `')}\`, derived from the path`,
    },
  ]
}

/**
 * Action is a folder, always: `<resource>/<action>/<action>.{controller,use-case,spec}.ts`
 * (_standards/architecture.md §3). It is where the action spec lives and where whoever looks for
 * "archive user" finds everything.
 */
function checkActionFolder(relativePath: string): Finding[] {
  if (!relativePath.startsWith('app/features/')) return []
  // The liveness probe is pure infra, with no module or resource (architecture.md §7).
  if (relativePath === 'app/features/health-check.controller.ts') return []
  const match = /([a-z-]+)\.(?:controller|use-case)\.ts$/.exec(relativePath)
  if (match === null) return []
  if (basename(dirname(relativePath)) === match[1]) return []

  return [
    {
      file: relativePath,
      line: 1,
      rule: 'action-outside-folder',
      section: 'arquitetura 3',
      message: `move to \`${dirname(relativePath)}/${match[1]}/${basename(relativePath)}\``,
    },
  ]
}

/**
 * A feature does not import from another (section 1.3): what is shared goes to
 * `_shared.<theme>` or to a service. The owner of a file is the resource -
 * `administrator/users` -, or the module when it is the resource itself
 * (`account`, `storages`).
 */
function checkCrossFeatureImport(relativePath: string, source: string): Finding[] {
  if (!relativePath.startsWith('app/features/')) return []
  const parts = relativePath.slice('app/features/'.length).split('/')
  if (parts.length < 2) return []

  let owner = parts.slice(0, -1)
  const folder = owner[owner.length - 1]
  const file = basename(relativePath).replace(/\.(controller|use-case|validator|spec)\.ts$/, '')
  if (folder === file && !relativePath.endsWith('.validator.ts')) owner = owner.slice(0, -1)
  const prefix = `${owner.join('/')}/`

  const findings: Finding[] = []
  const clean = withoutComments(source)
  for (const match of clean.matchAll(/from\s+'#features\/([^']+)'/g)) {
    const target = match[1] ?? ''
    if (target.includes('_shared.')) continue
    if (`${target}/`.startsWith(prefix)) continue
    findings.push({
      file: relativePath,
      line: lineOf(clean, match.index),
      rule: 'feature-importa-feature',
      section: '1.3',
      message: `\`${owner.join('/')}\` imports \`#features/${target}\`; shared code goes to \`_shared.<theme>\` or a service`,
    })
  }
  return findings
}

/**
 * Resource validator: every `*Validator` export starts with the resource in the
 * singular and ends with the action - `UserCreateValidator` in `users/users.validator.ts`
 * (_standards/backend.md §3 and §4.4).
 */
function checkValidatorName(relativePath: string, source: string): Finding[] {
  const match = /^app\/features\/.*\/([a-z-]+)\/\1\.validator\.ts$/.exec(relativePath)
  if (match === null) return []
  const resource = pascal(singular(match[1] ?? ''))
  const clean = withoutComments(source)
  const findings: Finding[] = []
  for (const exported of clean.matchAll(/export\s+const\s+(\w+Validator)\b/g)) {
    const name = exported[1] ?? ''
    if (name.startsWith(resource)) continue
    findings.push({
      file: relativePath,
      line: lineOf(clean, exported.index),
      rule: 'validator-without-resource',
      section: '4.4',
      message: `\`${name}\` should be \`${resource}<Action>Validator\``,
    })
  }
  return findings
}

/**
 * VineJS x Zod parity (_standards/architecture.md §10): every validator in
 * `shared/src/validators/<module>/<resource>.validator.ts` has its pair in
 * `app/validators/<module>/<resource>.validator.ts`, with the same
 * `*Validator` names. Without the `shared/` next to it, the rule does not run.
 */
async function checkValidatorParity(sources: Map<string, string>): Promise<Finding[]> {
  const sharedRoot = resolve(ROOT, '../shared/src/validators')
  if (!(await exists(sharedRoot))) return []

  const findings: Finding[] = []
  for (const file of await tsFiles(sharedRoot)) {
    if (!file.endsWith('.validator.ts')) continue
    const logical = relative(sharedRoot, file)
    const pair = `app/validators/${logical}`
    const backSource = sources.get(pair)
    const sharedSource = withoutComments(await readFile(file, 'utf8'))
    // A schema that is not a request (the `ActorSchema`) has no VineJS pair.
    if (!/export\s+const\s+\w+Validator\b/.test(sharedSource)) continue
    if (backSource === undefined) {
      findings.push({
        file: `../shared/src/validators/${logical}`,
        line: 1,
        rule: 'validator-without-pair',
        section: 'arquitetura 10',
        message: `there is no \`${pair}\` in the backend`,
      })
      continue
    }
    for (const exported of sharedSource.matchAll(/export\s+const\s+(\w+Validator)\b/g)) {
      const name = exported[1] ?? ''
      if (new RegExp(`export\\s+const\\s+${name}\\b`).test(backSource)) continue
      findings.push({
        file: `../shared/src/validators/${logical}`,
        line: lineOf(sharedSource, exported.index),
        rule: 'validator-without-pair',
        section: 'arquitetura 10',
        message: `\`${name}\` does not exist in \`${pair}\``,
      })
    }
  }
  return findings
}

/** A model in `app/models/` uses kebab-case. Section 3. */
function checkModelName(relativePath: string): Finding[] {
  if (!relativePath.startsWith('app/models/')) return []
  if (!basename(relativePath).includes('_')) return []
  const suggested = basename(relativePath).replace(/_/g, '-')
  return [
    {
      file: relativePath,
      line: 1,
      rule: 'model-snake-case',
      section: '3',
      message: `model uses kebab-case: rename to \`${suggested}\``,
    },
  ]
}

/**
 * Every key read by `env.get()` is declared in the schema, and vice versa. Section 6.
 *
 * A declared key that no code reads is a dead key, and goes away. The exception is what
 * never goes through the reader - `PORT` and `HOST` (read by `@adonisjs/core`),
 * `NODE_ENV` and `TZ` -, listed in `envOutsideReader` of the config with `reason`.
 *
 * The reading ignores comments: a commented driver block in `config/` is not
 * a real key.
 */
async function checkEnv(files: string[]): Promise<Finding[]> {
  const schema = await readFile(join(ROOT, 'start/env.ts'), 'utf8').catch(() => '')
  if (schema === '') return []
  const cleanSchema = withoutComments(schema)

  const declared = new Set<string>()
  for (const match of cleanSchema.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*:/gm)) {
    const key = match[1]
    if (key !== undefined) declared.add(key)
  }

  const findings: Finding[] = []
  const readKeys = new Set<string>()

  for (const file of files) {
    const relativePath = relative(ROOT, file)
    if (relativePath === 'start/env.ts') continue
    const clean = withoutComments(await readFile(file, 'utf8'))

    for (const match of clean.matchAll(/env\.get\(\s*'([A-Z][A-Z0-9_]*)'/g)) {
      const key = match[1]
      if (key === undefined) continue
      if (!readKeys.has(key) && !declared.has(key)) {
        findings.push({
          file: relativePath,
          line: lineOf(clean, match.index),
          rule: 'env-without-schema',
          section: '6',
          message: `\`${key}\` is read here and not declared in \`start/env.ts\``,
        })
      }
      readKeys.add(key)
    }
  }

  for (const key of declared) {
    if (readKeys.has(key)) continue
    if (key in CONFIG.envOutsideReader) continue
    findings.push({
      file: 'start/env.ts',
      line: lineOf(cleanSchema, cleanSchema.indexOf(key)),
      rule: 'env-without-reader',
      section: '6',
      message: `\`${key}\` is not read by any \`env.get()\`; remove it, or register it in \`envOutsideReader\` with the reason`,
    })
  }

  return findings
}

async function checkDirectories(): Promise<Finding[]> {
  const findings: Finding[] = []
  for (const dir of REQUIRED_DIRECTORIES) {
    try {
      await readdir(join(ROOT, dir))
    } catch {
      findings.push({
        file: dir,
        line: 1,
        rule: 'required-directory',
        section: '1.1',
        message: 'a cross-cutting directory is born present, even when empty',
      })
    }
  }
  return findings
}

/**
 * A config path, like the `use-case` one under `app/features`, turned into an
 * expression.
 *
 * Two stars followed by a slash match any depth, including
 * none; a single star matches within one segment only. It is the minimum that the
 * three paths in the list ask for.
 */
function pathPattern(glob: string): RegExp {
  const body = glob
    .split('**/')
    .map((chunk) => chunk.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'))
    .join('(?:.*/)?')
  return new RegExp(`^${body}$`)
}

/**
 * Every `newAllowlist` entry describes a use that exists.
 *
 * ESLint already refuses `new X()` where `X` ends in Service, UseCase, Policy or
 * Controller (section 2.1). The config is where the exceptions stay named with the
 * `reason` beside them, and what is charged here is the other side of the list: an entry with no use.
 *
 * It exists because the list was dead letter - no function read it. An exception that
 * nobody exercises is not an exception, and it is a false statement about the code; and whoever reads
 * the ruler believes it. That is how `Bouncer` stayed years in the list describing
 * a call that no use case made.
 */
async function checkNewAllowlist(sources: Map<string, string>): Promise<Finding[]> {
  const findings: Finding[] = []

  for (const entry of CONFIG.newAllowlist) {
    const target = pathPattern(entry.file)
    const usage = new RegExp(`\\bnew\\s+${entry.symbol}\\s*\\(`)

    let used = false
    for (const [relativePath, source] of sources) {
      if (!target.test(relativePath)) continue
      if (!usage.test(source)) continue
      used = true
      break
    }

    if (used) continue
    findings.push({
      file: 'scripts/pattern-check.config.ts',
      line: 1,
      rule: 'unused-new-allowlist-entry',
      section: '2.1',
      message: `\`newAllowlist\` exempts \`new ${entry.symbol}\` in \`${entry.file}\`, and there is no such use; drop the entry or fix the path`,
    })
  }

  return findings
}

/**
 * Soft delete goes through `withScopes(notDeleted)`, never through a hand-written
 * `whereNull`.
 *
 * The rule of section 4.8, enforced. There were 273 repetitions across the three projects when
 * it was born, and their cost was not the keyboard: a hand-written filter depends on
 * someone remembering, and the query that forgets returns an archived record without
 * warning. Centralized, there is nothing to forget.
 *
 * `app/models/` is left out because that is where the scope lives - and it is its body that
 * writes the `whereNull`, once. The other exceptions are named in
 * `softDeleteExempt` in the config, and are always the same situation: a query over a
 * generic `LucidModel`, a type where a named scope does not exist.
 */
async function checkSoftDelete(sources: Map<string, string>): Promise<Finding[]> {
  const exempt = new Set(CONFIG.softDeleteExempt)
  const findings: Finding[] = []
  const pattern = /where(?:Not)?Null\(\s*'(?:\w+\.)?(?:deletedAt|deleted_at)'\s*\)/

  for (const [relativePath, source] of sources) {
    if (relativePath.startsWith('app/models/')) continue
    if (exempt.has(relativePath)) continue

    const match = pattern.exec(source)

    if (match === null) continue

    findings.push({
      file: relativePath,
      line: lineOf(source, match.index),
      rule: 'soft-delete-without-scope',
      section: '4.8',
      message:
        'replace with `withScopes((scopes) => scopes.notDeleted())`; if the query is over a generic `LucidModel`, name the file in `softDeleteExempt`',
    })
  }

  return findings
}

/**
 * The SHAPE paths of the config exist in this repository.
 *
 * SHAPE is the middle category of section 5: same public API and same structure,
 * content per domain. `sync:check` does not charge them by sha256 precisely because the
 * content differs - and for that reason nobody charged anything, and a project could lose the
 * whole file without failing.
 *
 * Presence is what can be charged without inventing: if `app/services/slug/slug.service.ts`
 * disappears from one of the three, the rule points at it instead of the difference showing up on the day
 * someone goes looking for the service the siblings have.
 */
async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function checkShape(): Promise<Finding[]> {
  const findings: Finding[] = []

  for (const filePath of CONFIG.shape) {
    if (await exists(join(ROOT, filePath))) continue

    findings.push({
      file: 'scripts/pattern-check.config.ts',
      line: 1,
      rule: 'missing-shape',
      section: '5',
      message: `\`${filePath}\` is SHAPE in the config and does not exist here; create the file or drop the path from \`shape\``,
    })
  }

  return findings
}

/**
 * The use case declares `type Payload` and `type Response = Either<...>`.
 *
 * It is not aesthetics: the two types are the contract of the use case, and they are what makes the
 * sibling controller and `openapi/introspect.ts` know what goes in and what comes out.
 * Using the validator type directly in the signature works until the day the use
 * case needs one more field - `actor`, almost always -, and then the change
 * happens in the signature instead of in the alias, where nobody looks.
 *
 * `type Payload` is only required when `execute` receives something: a use case
 * without input has no payload to declare, and requiring the empty alias would be
 * ceremony.
 *
 * Not covered by `_doc-lib/` - it is a convention of this standard, section 4.2.
 */
function checkUseCaseShape(relativePath: string, source: string): Finding[] {
  if (!relativePath.endsWith('.use-case.ts')) return []
  if (!relativePath.includes('app/features/')) return []

  const clean = withoutComments(source)
  const findings: Finding[] = []

  const execute = /async execute\(([^)]*)\)/.exec(clean)
  const receivesInput = execute !== null && (execute[1] ?? '').trim().length > 0

  if (receivesInput && !/^type Payload\b/m.test(clean)) {
    findings.push({
      file: relativePath,
      line: lineOf(clean, execute.index),
      rule: 'use-case-without-payload',
      section: '4.2',
      message:
        'declare `type Payload` at the top and use it in the signature; the validator type alone has nowhere to receive `actor`',
    })
  }

  const response = /^type Response = Either</m.exec(clean)

  if (response === null) {
    findings.push({
      file: relativePath,
      line: 1,
      rule: 'use-case-without-response',
      section: '4.2',
      message: 'declare `type Response = Either<HTTPException, T>` at the top',
    })
  }

  return findings
}

/** The resource singular that the 500 code uses (`matches` -> `MATCH`). */
function singularCode(resource: string): string {
  return singular(resource).toUpperCase().replaceAll('-', '_')
}

/**
 * The log tag and the use case's 500 code derive from the path (section 3):
 * `[<module>/<resource> > <action>][error]` and `<MODULE>_<RESOURCE>_<ACTION>_ERROR`,
 * always with the module.
 */
function checkUseCaseNames(relativePath: string, source: string): Finding[] {
  const match = /^app\/features\/([^/]+)\/([^/]+)\/([^/]+)\/\3\.use-case\.ts$/.exec(relativePath)
  if (match === null) return []

  const [, module = '', resource = '', action = ''] = match
  const clean = withoutComments(source)
  const tag = `[${module}/${resource} > ${action}]`
  const code = `${module.toUpperCase()}_${singularCode(resource)}_${action.toUpperCase().replaceAll('-', '_')}_ERROR`
  const findings: Finding[] = []

  for (const found of clean.matchAll(/'(\[[^\]']*> [^\]']*\](?:\[[a-z]+\])*)'/g)) {
    if ((found[1] ?? '').startsWith(tag)) continue
    findings.push({
      file: relativePath,
      line: lineOf(clean, found.index),
      rule: 'log-tag',
      section: '3',
      message: `the log tag derives from the path: \`${tag}[error]\``,
    })
  }

  for (const found of clean.matchAll(/'([A-Z][A-Z_]*_ERROR)'/g)) {
    if (found[1] === code) continue
    findings.push({
      file: relativePath,
      line: lineOf(clean, found.index),
      rule: 'internal-error-code',
      section: '3',
      message: `the 500 code derives from the path: \`${code}\``,
    })
  }

  return findings
}

/**
 * The `actor` in the payload has this name, and no other (section 4.3): `user`,
 * `userId`, `createdBy` and `ownerId` are the same data escaping the
 * `(actor, target)` policy.
 */
function checkActorName(relativePath: string, source: string): Finding[] {
  if (!relativePath.endsWith('.use-case.ts')) return []

  const clean = withoutComments(source)
  const payload = /^type Payload\b[^\n]*(?:\n(?!\n)[^\n]*)*/m.exec(clean)
  if (payload === null) return []

  const wrong = /\b(?:user|userId|createdBy|ownerId)\??\s*:/.exec(payload[0])
  if (wrong === null) return []

  return [
    {
      file: relativePath,
      line: lineOf(clean, payload.index),
      rule: 'actor-name',
      section: '4.3',
      message: `the payload calls \`${wrong[0].replace(/\W/g, '')}\` what is the \`actor\`; use \`actor: Actor\``,
    },
  ]
}

/**
 * A route with a per-record rule (beyond ownership) checks `ctx.bouncer` in the controller:
 * the `BOUNCER_REQUIRED` list is project data (section 4.6).
 */
function checkBouncerRequired(sources: Map<string, string>): Finding[] {
  const findings: Finding[] = []

  for (const file of CONFIG.BOUNCER_REQUIRED) {
    const source = sources.get(file)
    if (source === undefined) {
      findings.push({
        file: 'scripts/pattern-check.config.ts',
        line: 1,
        rule: 'bouncer-required-missing-file',
        section: '4.6',
        message: `\`BOUNCER_REQUIRED\` lists \`${file}\`, which does not exist`,
      })
      continue
    }
    if (/\bbouncer\s*\.with\(/.test(source)) continue
    findings.push({
      file,
      line: 1,
      rule: 'bouncer-required',
      section: '4.6',
      message:
        'per-record rule: the controller checks with `ctx.bouncer.with(Policy).authorize(...)`',
    })
  }

  return findings
}

/**
 * An action does not import another by relative path (section 1.3): what the two
 * use goes up to `_shared.<theme>`, to the resource presenter or to the domain.
 */
function checkRelativeImportBetweenActions(relativePath: string, source: string): Finding[] {
  const own = /^app\/features\/([^/]+)\/([^/]+)\/([^/]+)\//.exec(relativePath)
  if (own === null) return []

  const findings: Finding[] = []
  const clean = withoutComments(source)
  const fromDir = dirname(relativePath)

  for (const found of clean.matchAll(/from\s+'(\.\.?\/[^']+)'/g)) {
    const target = join(fromDir, found[1] ?? '')
    const theirs = /^app\/features\/([^/]+)\/([^/]+)\/([^/]+)\/[^/]+$/.exec(target)
    if (theirs === null) continue
    if (theirs[1] === own[1] && theirs[2] === own[2] && theirs[3] === own[3]) continue
    if ((theirs[3] ?? '').startsWith('_shared.')) continue

    findings.push({
      file: relativePath,
      line: lineOf(clean, found.index),
      rule: 'import-between-actions',
      section: '1.3',
      message: `imports \`${found[1]}\` from another action; move the shared code to \`_shared.<theme>\``,
    })
  }

  return findings
}

/**
 * Every controller is reachable by some route.
 *
 * The registry in `.adonisjs/server/controllers.ts` is derived from the **file
 * system**, and not from the routes: existing there does not mean being exposed. And the
 * other guards read `openapi.json`, which only has registered routes - so an
 * entire resource with no route passed through all of them.
 *
 * It happened: four controllers and four client-evaluation use cases, in a
 * project where the count still matched by coincidence (234 controllers, 234
 * operations, because four routed controllers served two routes each).
 *
 * Unreachable code is not neutral. That one had drifted from the standard while
 * nobody was looking - it used `userId: string` where section 4.3 asks for the `User` object -,
 * and one day it would resurface looking ready.
 */
async function checkRoute(files: string[]): Promise<Finding[]> {
  const routes = await readFile(join(ROOT, 'start/routes.ts'), 'utf8')
  const findings: Finding[] = []

  for (const file of files) {
    const relativePath = relative(ROOT, file)
    if (!relativePath.endsWith('.controller.ts')) continue

    const inside = relativePath.split('app/features/')[1]
    if (inside === undefined) continue

    const parts = inside.split('/')
    const verb = pascal((parts[parts.length - 1] ?? '').replace('.controller.ts', ''))
    const key = ['controllers', ...parts.slice(0, -1).map(camel), verb].join('.')

    // An identifier boundary, and not `includes`: `controllers.account.profile.Show`
    // would match inside `controllers.account.profile.ShowX`, and the rule would give green for
    // a controller that no route reaches. It is what the sensor caught in the
    // first version of this function.
    const reference = new RegExp(`${key.replace(/\./g, '\\.')}(?![A-Za-z0-9_])`)

    if (reference.test(routes)) continue

    findings.push({
      file: relativePath,
      line: 1,
      rule: 'controller-without-route',
      section: '1.2',
      message: `no route references \`${key}\`; register the route or delete the file and its sibling use case`,
    })
  }

  return findings
}

function report(findings: Finding[]): void {
  if (findings.length === 0) {
    console.log('pattern:check: no violations.')
    return
  }

  const bySection = new Map<string, Finding[]>()
  for (const finding of findings) {
    bySection.set(finding.section, [...(bySection.get(finding.section) ?? []), finding])
  }

  console.log(`pattern:check: ${findings.length} violations\n`)
  for (const [section, group] of [...bySection].sort((x, y) => y[1].length - x[1].length)) {
    console.log(`  _standards/backend.md ${section} (${group.length})`)
    for (const finding of group) {
      console.log(`    ${finding.file}:${finding.line}  [${finding.rule}] ${finding.message}`)
    }
  }
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2))
  const files = await tsFiles(ROOT)
  const findings: Finding[] = [...(await checkDirectories())]

  const sources = new Map<string, string>()

  for (const file of files) {
    const relativePath = relative(ROOT, file)
    if (relativePath.startsWith('scripts/')) continue
    const source = await readFile(file, 'utf8')
    sources.set(relativePath, withoutComments(source))
    findings.push(...applyRules(relativePath, source))
    findings.push(...checkClassName(relativePath, source))
    findings.push(...checkModelName(relativePath))
    findings.push(...checkActionFolder(relativePath))
    findings.push(...checkValidatorName(relativePath, source))
    findings.push(...checkCrossFeatureImport(relativePath, source))
    findings.push(...checkUseCaseShape(relativePath, source))
    findings.push(...checkUseCaseNames(relativePath, source))
    findings.push(...checkActorName(relativePath, source))
    findings.push(...checkRelativeImportBetweenActions(relativePath, source))
  }

  findings.push(...(await checkEnv(files)))
  findings.push(...(await checkNewAllowlist(sources)))
  findings.push(...(await checkSoftDelete(sources)))
  findings.push(...(await checkShape()))
  findings.push(...checkBouncerRequired(sources))
  findings.push(...(await checkRoute(files)))
  findings.push(...(await checkValidatorParity(sources)))
  report(findings)

  if (flags.has('--report')) return
  if (findings.length > 0) process.exitCode = 1
}

await main()
