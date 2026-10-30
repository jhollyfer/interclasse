/**
 * Recusa um `.output/` em que um chunk **lê**, durante a própria avaliação, um
 * binding importado de outro chunk que está em ciclo com ele.
 *
 * O Rolldown parte o app em chunks por conteúdo, e nada garante que o grafo
 * resultante seja acíclico. Num ciclo, o ESM do Node avalia um dos chunks antes
 * do outro terminar, e todo binding vindo do que ficou pela metade vale
 * `undefined` - o Rolldown emite `var` para a declaração, então hoista como
 * `undefined` em vez de dar TDZ. Uma leitura em escopo de módulo estoura ali:
 *
 *     TypeError: Cannot read properties of undefined (reading 'ONLY')
 *         at .output/server/_ssr/router-DvSsmf4q.mjs:38:21
 *
 * O build passa verde, o container sobe, e só a primeira requisição descobre.
 *
 * **Ciclo sozinho não é defeito, e é por isso que este script não para nele.**
 * A maior parte das arestas de um ciclo é lida tarde - dentro de `loader`, de
 * componente, de re-export - e essas nunca veem binding pela metade. O router do
 * TanStack passou a sair em dois chunks que se reexportam mutuamente, e falhar
 * nisso seria um vermelho permanente que ninguém consegue apagar. O que se
 * recusa é a leitura **antecipada**: chamada de função, acesso a propriedade e
 * spread que rodam na avaliação do módulo.
 *
 * Uso: `node scripts/check-chunk-cycles.mjs [dir]` - `dir` default `.output/server`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, normalize, relative } from 'node:path'

const root = process.argv[2] ?? '.output/server'

/**
 * Só aresta **estática**: `from "..."` e o `import "..."` de efeito colateral.
 *
 * `import()` fica de fora de propósito. Ele é resolvido na chamada, quando todo
 * módulo já terminou de avaliar, então nunca devolve binding pela metade - e é
 * assim que o router carrega cada rota sob demanda. Contá-lo apontaria um ciclo
 * em toda rota do app, que é ruído, não defeito.
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
      // Só aresta interna interessa: `node:fs` e pacote do node_modules não
      // participam do grafo de chunks.
      if (!match[1].startsWith('.')) continue

      found.add(normalize(join(dirname(file), match[1])))
    }

  return [...found]
}

/** Os nomes locais que `file` importa de `target`, já com o `as` resolvido. */
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
 * O código que roda **na avaliação** do módulo, com todo o resto apagado.
 *
 * Devolve uma string do mesmo comprimento da original - cada caractere adiado
 * vira espaço, e as quebras de linha ficam de pé - para que o número de linha
 * do achado continue sendo o número de linha do arquivo.
 *
 * Some daqui: string, template, comentário, literal de expressão regular, corpo
 * de função (`function`, arrow com bloco e arrow de expressão) e corpo de
 * classe. Sobra o que o Node executa ao carregar o arquivo.
 */
function eagerOnly(source) {
  const out = new Array(source.length).fill(' ')
  const brackets = []
  // Profundidades onde começou uma arrow **sem bloco** (`() => algo`). O corpo
  // dela acaba na vírgula, no ponto e vírgula ou no fechamento do delimitador
  // que a contém - não há chave para marcar o fim.
  const looseArrows = []
  let deferred = 0
  // Profundidade em que se viu `function`, `class` ou `=> {`. O corpo é a
  // primeira chave **nessa mesma profundidade** - a chave que aparece mais
  // fundo é desestruturação de parâmetro (`function f({ a, ...b }) {`), e
  // confundir as duas deixa o corpo inteiro passando por código de avaliação.
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

    // Comentários.
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

    // Strings e templates. O `${}` de template pode conter código, mas o que
    // interessa aqui é só não confundir chave de template com chave de bloco -
    // e código dentro de template não é padrão neste bundle.
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

    // Literal de expressão regular. Distinguir de divisão pelo caractere
    // anterior: depois de valor vem divisão, depois de operador vem regex.
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

    // `=>`: com bloco, o corpo é a próxima chave; sem bloco, começa agora.
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
      // Uma arrow de expressão morre junto com o delimitador que a contém.
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

// `eagerOnly` carrega toda a heurística deste arquivo e é o que erra em silêncio:
// um corpo de função lido como código de avaliação vira falso-positivo que
// trava o CI, e o inverso deixa o bug passar. Está exportado para
// `check-chunk-cycles.test.ts`.
export { eagerOnly }

// Sob `import` - o teste - este arquivo é só a biblioteca acima.
if (import.meta.main) main()

function main() {
  const files = collect(root)
  const sources = new Map(
    files.map((file) => [file, readFileSync(file, 'utf8')]),
  )
  const graph = new Map(
    files.map((file) => [file, edges(file, sources.get(file))]),
  )

  // DFS com três cores: sem marca, na pilha, fechado. Aresta para quem está na
  // pilha é o ciclo, e o caminho dele é o pedaço da pilha a partir do alvo.
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
        // A própria declaração de import, e o `export { ... }` que o Rolldown junta
        // no fim do arquivo, citam todo nome sem ler nenhum: reexportar um binding
        // não o avalia.
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
