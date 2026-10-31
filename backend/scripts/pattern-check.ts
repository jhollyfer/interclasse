/**
 * Cobra as convencoes de `_standards/backend.md` e `_standards/architecture.md` que o ESLint nao alcanca.
 *
 * O ESLint ja cobra as quatro regras de escrita (ternario, `any`, `as`,
 * `interface`) e a proibicao de `new` em servico. O que sobra e o que depende de
 * saber *onde* o arquivo esta e *como ele se chama* — nome de classe derivado do
 * caminho, camada que nao pode importar outra, envelope de paginacao, escopo de
 * soft delete. Regra de lint nao resolve isso sem inventar um plugin; um script
 * de 300 linhas resolve.
 *
 * Cada regra aponta a secao da regua que a origina, para que a mensagem de erro
 * leve a decisao junto e nao so ao sintoma. O que e deste projeto - isencoes
 * nomeadas, chaves de ambiente fora do leitor, arquivos de FORMA - mora em
 * `scripts/pattern-check.config.ts`.
 *
 * Uso:
 *   node --import @poppinss/ts-exec scripts/pattern-check.ts            # reprova
 *   node --import @poppinss/ts-exec scripts/pattern-check.ts --report   # so mede
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

/** Diretorios que a regua exige mesmo vazios. Secao 1.1. */
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
 * Remove comentario de linha e de bloco antes de casar padrao. Sem isto, todo
 * exemplo dentro de um JSDoc — e este projeto tem muitos — viraria violacao.
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
 * O singular provavel de um segmento de diretorio.
 *
 * Heuristica, e assumida como tal: e por isso que ela nao decide sozinha - a
 * regra aceita o segmento com e sem ela.
 */
function singular(segment: string): string {
  if (segment.endsWith('ies')) return `${segment.slice(0, -3)}y`
  if (/(sses|shes|ches)$/.test(segment)) return segment.slice(0, -2)
  if (segment.endsWith('s') && !segment.endsWith('ss')) return segment.slice(0, -1)
  return segment
}

/**
 * Os nomes que o caminho autoriza: um com o ultimo diretorio como esta no disco,
 * outro com ele no singular. Fora de `app/features/` nao ha caminho de onde
 * derivar, e a regra nao se aplica.
 */
function derivedNames(relativePath: string, suffix: string): string[] {
  const inside = relativePath.split('app/features/')[1]
  if (inside === undefined) return []

  const parts = inside.split('/')
  // A pasta da acao repete o verbo e nao entra no nome da classe:
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
  /** Casa no fonte ja sem comentarios. */
  pattern: RegExp
  message: string
  /** Quando presente, a regra so roda nos arquivos cujo caminho casa. */
  scope?: RegExp
}

const RULES: Rule[] = [
  {
    name: 'policy-outside-bouncer',
    section: '4.6',
    // A policy e checada pelo controller com `ctx.bouncer.with(Policy)`; o caso
    // de uso recebe o registro ja autorizado e nao conhece policy nenhuma.
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
    // O `vine` configurado (mensagens pt-BR, transform de data) sai de
    // `#core/validator`; importar a lib direto pula essa configuracao.
    scope: /^(?!app\/core\/validator\.ts$)(?:app|start|database|commands|tests)\//,
    pattern: /from\s+'@vinejs\/vine'/,
    message: 'import `vine` (and `Infer`) from `#core/validator`, never from `@vinejs/vine`',
  },
  {
    name: 'validator-outside-resource',
    section: '4.4',
    // `app/core/` fica de fora: `response.ts` declara em VineJS o contrato de
    // resposta que nao deriva de model, e isso nao e validator de entrada.
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
    // `throw error` relanca o que o `catch` recebeu (o repository so reconhece a
    // violacao de unique e relanca o resto); o que a regua proibe e criar a falha.
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
    // `_shared.<tema>.ts` e so funcao pura; a base de template method
    // (`_shared.<tema>.base.ts`) injeta o que precisa e fica de fora.
    scope: /_shared\.[^/]*(?<!\.base)\.ts$/,
    // `import type` fica de fora: tipo some na compilação e não faz I/O.
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
    // `#features/_shared.<tema>` fica de fora: e o lugar declarado da funcao pura
    // compartilhada, e importa-la nao acopla o service a nenhuma feature. O que a
    // regra recusa e depender de um modulo — `#features/administrator/...`.
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
 * A classe exportada deriva do caminho inteiro, e nao so do verbo.
 *
 * O sufixo sozinho deixava passar o que mais aparecia: `EnrollmentUpdateController`
 * num arquivo de `administrator/enrollments/` termina em `UpdateController` e
 * mesmo assim perde o modulo. Sem o modulo o nome nao diz de qual grupo de rota a
 * classe e - e `administrator/enrollments` e `storefront/enrollments` sao dois
 * casos de uso diferentes sobre a mesma tabela, com autorizacao diferente.
 *
 * A singularizacao continua sendo heuristica, e por isso ela **nao decide**: a
 * regra aceita tanto o segmento como esta no disco quanto a forma singular dele.
 * As duas derivam do caminho de forma deterministica; qual das duas o projeto usa
 * e escolha de estilo, e nenhuma delas permite esquecer o modulo.
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
 * Acao e pasta, sempre: `<recurso>/<acao>/<acao>.{controller,use-case,spec}.ts`
 * (_standards/architecture.md §3). E onde a spec da acao mora e onde quem procura
 * "arquivar usuario" encontra tudo.
 */
function checkActionFolder(relativePath: string): Finding[] {
  if (!relativePath.startsWith('app/features/')) return []
  // A sonda de vida e infra pura, sem modulo nem recurso (arquitetura.md §7).
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
 * Uma feature nao importa de outra (secao 1.3): o compartilhado vai para
 * `_shared.<tema>` ou para um service. O dono de um arquivo e o recurso -
 * `administrator/users` -, ou o modulo quando ele e o proprio recurso
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
 * Validator de recurso: todo export `*Validator` comeca pelo recurso no
 * singular e termina na acao - `UserCreateValidator` em `users/users.validator.ts`
 * (_standards/backend.md §3 e §4.4).
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
 * Paridade VineJS x Zod (_standards/architecture.md §10): todo validator de
 * `shared/src/validators/<modulo>/<recurso>.validator.ts` tem o par em
 * `app/validators/<modulo>/<recurso>.validator.ts`, com os mesmos nomes de
 * `*Validator`. Sem o `shared/` ao lado, a regra nao roda.
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
    // Schema que não é de request (o `ActorSchema`) não tem par VineJS.
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

/** Model em `app/models/` usa kebab-case. Secao 3. */
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
 * Toda chave lida por `env.get()` e declarada no schema, e vice-versa. Secao 6.
 *
 * Chave declarada que nenhum codigo le e chave morta, e sai. A excecao e o que
 * nunca passa pelo leitor - `PORT` e `HOST` (lidas por `@adonisjs/core`),
 * `NODE_ENV` e `TZ` -, listado em `envOutsideReader` da config com `reason`.
 *
 * A leitura ignora comentario: um bloco de driver comentado em `config/` nao e
 * uma chave de verdade.
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
 * Um caminho do config, como o de `use-case` sob `app/features`, virando
 * expressao.
 *
 * Duas estrelas seguidas de barra casam qualquer profundidade, inclusive
 * nenhuma; uma estrela sozinha casa dentro de um segmento so. E o minimo que os
 * tres caminhos da lista pedem.
 */
function pathPattern(glob: string): RegExp {
  const body = glob
    .split('**/')
    .map((chunk) => chunk.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'))
    .join('(?:.*/)?')
  return new RegExp(`^${body}$`)
}

/**
 * Toda entrada de `newAllowlist` descreve um uso que existe.
 *
 * O ESLint ja recusa `new X()` onde `X` termina em Service, UseCase, Policy ou
 * Controller (secao 2.1). O config e onde as excecoes ficam nomeadas com o
 * `reason` ao lado, e o que se cobra aqui e o outro lado da lista: entrada sem uso.
 *
 * Existe porque a lista era letra morta — nenhuma funcao a lia. Uma excecao que
 * ninguem exerce nao e excecao, e uma afirmacao falsa sobre o codigo; e quem le
 * a regua acredita nela. Foi assim que `Bouncer` ficou anos na lista descrevendo
 * uma chamada que nenhum caso de uso fazia.
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
 * Soft delete passa por `withScopes(notDeleted)`, nunca por `whereNull` escrito
 * a mao.
 *
 * A regra da secao 4.8, cobrada. Eram 273 repeticoes nos tres projetos quando
 * ela nasceu, e o custo delas nao era o teclado: filtro escrito a mao depende de
 * alguem lembrar, e a consulta que esquece devolve registro arquivado sem
 * avisar. Centralizado, nao ha o que esquecer.
 *
 * `app/models/` fica de fora porque e la que o scope mora - e o corpo dele que
 * escreve o `whereNull`, uma vez. As demais excecoes sao nomeadas em
 * `softDeleteExempt` no config, e sao sempre a mesma situacao: consulta sobre
 * `LucidModel` generico, tipo em que scope nomeado nao existe.
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
 * Os caminhos FORMA do config existem neste repositorio.
 *
 * FORMA e a categoria do meio da secao 5: mesma API publica e mesma estrutura,
 * conteudo por dominio. `sync:check` nao os cobra por sha256 justamente porque o
 * conteudo difere - e por isso ninguem cobrava nada, e um projeto podia perder o
 * arquivo inteiro sem reprovar.
 *
 * Presenca e o que da para cobrar sem inventar: se `app/services/slug/slug.service.ts`
 * sumir de um dos tres, a regra aponta em vez de a diferenca aparecer no dia em
 * que alguem for procurar o service que os irmaos tem.
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
 * O caso de uso declara `type Payload` e `type Response = Either<...>`.
 *
 * Nao e estetica: os dois tipos sao o contrato do caso de uso, e sao o que faz o
 * controller irmao e o `openapi/introspect.ts` saberem o que entra e o que sai.
 * Usar o tipo do validator direto na assinatura funciona ate o dia em que o caso
 * de uso precisa de um campo a mais - `actor`, quase sempre -, e ai a mudanca
 * acontece na assinatura em vez de no alias, onde ninguem procura.
 *
 * `type Payload` so e exigido quando `execute` recebe alguma coisa: um caso de
 * uso sem entrada nao tem payload que declarar, e exigir o alias vazio seria
 * cerimonia.
 *
 * Nao coberto por `_doc-lib/` - e convencao deste padrao, secao 4.2.
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

/** O singular de recurso que o codigo de 500 usa (`matches` -> `MATCH`). */
function singularCode(resource: string): string {
  return singular(resource).toUpperCase().replaceAll('-', '_')
}

/**
 * A tag de log e o codigo de 500 do caso de uso derivam do caminho (secao 3):
 * `[<modulo>/<recurso> > <acao>][error]` e `<MODULO>_<RECURSO>_<ACAO>_ERROR`,
 * sempre com o modulo.
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
 * O `actor` no payload tem esse nome, e nenhum outro (secao 4.3): `user`,
 * `userId`, `createdBy` e `ownerId` sao o mesmo dado escapando da policy
 * `(actor, target)`.
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
 * Rota com regra por registro (alem de posse) checa `ctx.bouncer` no controller:
 * a lista `BOUNCER_REQUIRED` e dado do projeto (secao 4.6).
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
 * Uma acao nao importa outra por caminho relativo (secao 1.3): o que as duas
 * usam sobe para `_shared.<tema>`, para o presenter do recurso ou para o dominio.
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
 * Todo controller e alcancavel por alguma rota.
 *
 * O registro em `.adonisjs/server/controllers.ts` e derivado do **sistema de
 * arquivos**, e nao das rotas: existir ali nao quer dizer estar exposto. E os
 * outros guardas leem o `openapi.json`, que so tem rota registrada - entao um
 * recurso inteiro sem rota passava por todos eles.
 *
 * Passou: quatro controllers e quatro casos de uso de avaliacao de cliente, num
 * projeto onde a contagem ainda fechava por coincidencia (234 controllers, 234
 * operacoes, porque quatro controllers roteados serviam duas rotas cada).
 *
 * Codigo inalcancavel nao e neutro. Aquele tinha derivado do padrao enquanto
 * ninguem via - usava `userId: string` onde a secao 4.3 pede o objeto `User` -,
 * e um dia ressurgiria parecendo pronto.
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

    // Limite de identificador, e nao `includes`: `controllers.account.profile.Show`
    // casaria dentro de `controllers.account.profile.ShowX`, e a regra daria verde para
    // um controller que nenhuma rota alcanca. Foi o que o sensor pegou na
    // primeira versao desta funcao.
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
