/**
 * Refuses an `.output/` in which a chunk **reads**, during its own evaluation,
 * a binding imported from another chunk that is in a cycle with it.
 *
 * Rolldown splits the app into chunks by content, and nothing guarantees the
 * resulting graph is acyclic. In a cycle, Node's ESM evaluates one chunk before
 * the other finishes, and every binding coming from the half-evaluated one is
 * `undefined` - Rolldown emits `var` for the declaration, so it hoists as
 * `undefined` instead of raising a TDZ error. A read at module scope blows up there:
 *
 *     TypeError: Cannot read properties of undefined (reading 'ONLY')
 *         at .output/server/_ssr/router-DvSsmf4q.mjs:38:21
 *
 * The build passes green, the container starts, and only the first request finds out.
 *
 * **A cycle alone is not a defect, which is why this script does not stop on it.**
 * Most edges of a cycle are read late - inside a `loader`, a component, a
 * re-export - and those never see a half-built binding. TanStack's router came
 * to ship as two chunks that re-export each other, and failing on that would be
 * a permanent red nobody can clear. What gets refused is the **early** read:
 * function calls, property access and spreads that run during module evaluation.
 *
 * Usage: `node scripts/check-chunk-cycles.mjs [dir]` - `dir` defaults to `.output/server`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, normalize, relative } from 'node:path'

const root = process.argv[2] ?? '.output/server'

/**
 * **Static** edges only: `from "..."` and the side-effect `import "..."`.
 *
 * `import()` is left out on purpose. It is resolved at call time, when every
 * module has already finished evaluating, so it never returns a half-built
 * binding - and that is how the router loads each route on demand. Counting it
 * would flag a cycle on every route of the app, which is noise, not a defect.
 */
const SPECIFIERS = [
  /\bfrom\s*["']([^"']+)["']/g,
  /(?:^|[\n;])\s*import\s*["']([^"']+)["']/g,
]

function collect(dir) {
  const files = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) files.push(...collect(path))
    else if (path.endsWith('.mjs')) files.push(path)
  }

  return files
}

function edges(file, source) {
  const found = new Set()

  for (const pattern of SPECIFIERS)
    for (const match of source.matchAll(pattern)) {
      // Only internal edges matter: `node:fs` and node_modules packages do not
      // take part in the chunk graph.
      if (!match[1].startsWith('.')) continue

      found.add(normalize(join(dirname(file), match[1])))
    }

  return [...found]
}

/** The local names that `file` imports from `target`, with `as` already resolved. */
function importedFrom(source, file, target) {
  const names = new Set()

  for (const match of source.matchAll(
    /\bimport\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g,
  )) {
    if (normalize(join(dirname(file), match[2])) !== target) continue

    for (const piece of match[1].split(','))
      if (piece.trim())
        names.add(
          piece
            .trim()
            .split(/\s+as\s+/)
            .pop(),
        )
  }

  return names
}

/**
 * The code that runs **during evaluation** of the module, with everything else erased.
 *
 * Returns a string of the same length as the original - every deferred
 * character becomes a space, and line breaks stay in place - so that the
 * finding's line number remains the file's line number.
 *
 * Erased here: string, template, comment, regular expression literal, function
 * body (`function`, block arrow and expression arrow) and class body. What is
 * left is what Node executes when it loads the file.
 */
function eagerOnly(source) {
  const out = new Array(source.length).fill(' ')
  const brackets = []
  // Depths where an arrow **without a block** started (`() => something`). Its
  // body ends at the comma, the semicolon or the closing of the enclosing
  // delimiter - there is no brace to mark the end.
  const looseArrows = []
  let deferred = 0
  // Depth at which `function`, `class` or `=> {` was seen. The body is the
  // first brace **at that same depth** - a deeper brace is parameter
  // destructuring (`function f({ a, ...b }) {`), and confusing the two makes
  // the whole body pass as evaluation code.
  let pendingAtDepth = null
  let i = 0

  const at = (offset) => source[i + offset]
  const keep = () => {
    if (deferred === 0) out[i] = source[i]
  }

  while (i < source.length) {
    const char = source[i]

    if (char === '\n') {
      out[i] = '\n'
      i++
      continue
    }

    // Comments.
    if (char === '/' && at(1) === '/') {
      while (i < source.length && source[i] !== '\n') i++
      continue
    }

    if (char === '/' && at(1) === '*') {
      i += 2
      while (i < source.length && !(source[i] === '*' && at(1) === '/')) {
        if (source[i] === '\n') out[i] = '\n'
        i++
      }
      i += 2
      continue
    }

    // Strings and templates. A template's `${}` can hold code, but all that
    // matters here is not confusing a template brace with a block brace -
    // and code inside a template is not a pattern in this bundle.
    if (char === '"' || char === "'" || char === '`') {
      const quote = char
      i++
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') i++
        else if (source[i] === '\n') out[i] = '\n'
        i++
      }
      i++
      continue
    }

    // Regular expression literal. Told apart from division by the previous
    // character: after a value comes division, after an operator comes a regex.
    if (char === '/') {
      let back = i - 1
      while (back >= 0 && /\s/.test(source[back])) back--
      if (back < 0 || '=(,:[!&|?{};+-*%~^'.includes(source[back])) {
        i++
        let inClass = false
        while (i < source.length) {
          if (source[i] === '\\') i += 2
          else if (source[i] === '[') ((inClass = true), i++)
          else if (source[i] === ']') ((inClass = false), i++)
          else if (source[i] === '/' && !inClass) break
          else i++
        }
        i++
        continue
      }
    }

    // `=>`: with a block, the body is the next brace; without one, it starts now.
    if (char === '=' && at(1) === '>') {
      keep()
      i += 2
      let ahead = i
      while (ahead < source.length && /\s/.test(source[ahead])) ahead++
      if (source[ahead] === '{') pendingAtDepth = brackets.length
      else {
        looseArrows.push(brackets.length)
        deferred++
      }
      continue
    }

    if (/[A-Za-z_$]/.test(char)) {
      let end = i
      while (end < source.length && /[\w$]/.test(source[end])) end++
      const word = source.slice(i, end)
      if (word === 'function' || word === 'class')
        pendingAtDepth = brackets.length
      while (i < end) (keep(), i++)
      continue
    }

    if (char === '{' || char === '(' || char === '[') {
      keep()
      const defers = char === '{' && pendingAtDepth === brackets.length
      if (defers) pendingAtDepth = null
      brackets.push(defers)
      if (defers) deferred++
      i++
      continue
    }

    if (char === '}' || char === ')' || char === ']') {
      // An expression arrow dies together with the delimiter that contains it.
      while (looseArrows.length && looseArrows.at(-1) >= brackets.length) {
        looseArrows.pop()
        deferred--
      }
      if (brackets.pop()) deferred--
      keep()
      i++
      continue
    }

    if (char === ',' || char === ';') {
      while (looseArrows.length && looseArrows.at(-1) === brackets.length) {
        looseArrows.pop()
        deferred--
      }
      keep()
      i++
      continue
    }

    keep()
    i++
  }

  return out.join('')
}

// `eagerOnly` carries all of this file's heuristic and is what fails silently:
// a function body read as evaluation code becomes a false positive that
// blocks CI, and the opposite lets the bug through. It is exported for
// `check-chunk-cycles.test.ts`.
export { eagerOnly }

// Under `import` - the test - this file is just the library above.
if (import.meta.main) main()

function main() {
  const files = collect(root)
  const sources = new Map(
    files.map((file) => [file, readFileSync(file, 'utf8')]),
  )
  const graph = new Map(
    files.map((file) => [file, edges(file, sources.get(file))]),
  )

  // DFS with three colors: unmarked, on the stack, closed. An edge to something on
  // the stack is the cycle, and its path is the stack slice starting at the target.
  const state = new Map()
  const stack = []
  const cycles = []

  function walk(file) {
    state.set(file, 'open')
    stack.push(file)

    for (const next of graph.get(file) ?? []) {
      if (!graph.has(next)) continue

      if (state.get(next) === 'open')
        cycles.push([...stack.slice(stack.indexOf(next)), next])
      else if (!state.has(next)) walk(next)
    }

    stack.pop()
    state.set(file, 'closed')
  }

  for (const file of files) if (!state.has(file)) walk(file)

  const show = (file) => relative(root, file)
  const hazards = []

  for (const cycle of cycles) {
    const members = new Set(cycle)

    for (const file of members) {
      const source = sources.get(file)
      const names = new Set()

      for (const other of members)
        if (other !== file)
          for (const name of importedFrom(source, file, other)) names.add(name)

      if (names.size === 0) continue

      const eager = eagerOnly(source).split('\n')
      const pattern = new RegExp(
        `\\b(${[...names].map((n) => n.replace(/\$/g, '\\$')).join('|')})\\b`,
      )

      const original = source.split('\n')

      eager.forEach((line, index) => {
        // The import declaration itself, and the `export { ... }` that Rolldown gathers
        // at the end of the file, name every identifier without reading any:
        // re-exporting a binding does not evaluate it.
        if (/^\s*(import\b|export\s*\{)/.test(original[index])) return

        const match = line.match(pattern)
        if (!match) return

        hazards.push({
          file,
          line: index + 1,
          name: match[1],
          code: original[index].trim().slice(0, 100),
        })
      })
    }
  }

  if (cycles.length > 0) {
    console.log(`${root}: ${cycles.length} ciclo(s) de chunk (informativo).\n`)
    for (const cycle of cycles)
      console.log(`  ${cycle.map(show).join('\n  -> ')}\n`)
  }

  if (hazards.length === 0) {
    console.log(
      `${root}: ${files.length} chunks, nenhuma leitura antecipada em ciclo.`,
    )
    process.exit(0)
  }

  console.error(
    `${root}: ${hazards.length} leitura(s) de binding em ciclo, durante a avaliação do módulo.\n`,
  )

  for (const hazard of hazards)
    console.error(
      `  ${show(hazard.file)}:${hazard.line}  [${hazard.name}]\n     ${hazard.code}\n`,
    )

  console.error(
    'O chunk que exporta esses nomes ainda não terminou de avaliar quando estas\n' +
      'linhas rodam, e o binding vale `undefined`. Adie a leitura: `import type` se\n' +
      'o import só existe pelo tipo, chamada dentro da função se é valor.',
  )

  process.exit(1)
}
