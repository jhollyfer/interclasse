/**
 * Cobra os modulos congelados de `padrao.manifest.json`.
 *
 * Existe porque os tres backends AdonisJS foram copiados a mao, e por isso
 * derivaram: no dia em que este script nasceu, 18 dos 30 arquivos declarados
 * identicos ja divergiam entre si — quase sempre em comentario, algumas vezes em
 * comportamento. Revisao humana nao pega isso: o diff de um repositorio nao
 * mostra o que o irmao tem.
 *
 * Dois modos, e a distincao e o que faz o script servir na maquina e no CI:
 *
 * - **local** — os irmaos existem lado a lado (é o caso do Desktop e do
 *   `pre-commit`). Compara arquivo a arquivo entre os projetos e diz onde estao
 *   as diferencas.
 * - **CI** — so um repositorio esta clonado. Compara o sha256 de cada congelado
 *   com o valor gravado no manifesto. Como o manifesto e ele proprio congelado e
 *   identico nos tres, mexer num arquivo em um so repositorio reprova ali.
 *
 * Uso:
 *   node --import @poppinss/ts-exec scripts/sync-check.ts              # reprova
 *   node --import @poppinss/ts-exec scripts/sync-check.ts --report     # so mede
 *   node --import @poppinss/ts-exec scripts/sync-check.ts --propagate  # copia o canonico
 *   node --import @poppinss/ts-exec scripts/sync-check.ts --write      # regrava os hashes
 *
 * O fluxo de mudanca de um congelado esta em PADRAO-BACKEND.md, secao 11.
 */

import { createHash } from 'node:crypto'
import { access, copyFile, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

type Entrada = {
  sha256: string | null
  canonico?: string
  motivo?: string
}

type Manifesto = {
  versao: number
  descricao: string
  irmaos: string[]
  congelados: {
    todos: Record<string, Entrada>
    adonis: Record<string, Entrada>
  }
  pendentes: Record<string, Entrada>
  forma: string[]
  newAllowlist: Array<{ simbolo: string; arquivo: string; motivo: string }>
  softDeleteExempt: string[]
}

type Divergencia = {
  caminho: string
  canonico: string
  /** Projetos cujo conteudo difere do canonico. Vazio no modo CI. */
  projetos: string[]
  /** Verdadeiro quando o proprio repositorio corrente esta fora. */
  aqui: boolean
}

const RAIZ = resolve(dirname(new URL(import.meta.url).pathname), '..')
const PROJETO = basename(resolve(RAIZ, '..'))
const MANIFESTO = join(RAIZ, 'padrao.manifest.json')

async function existe(caminho: string): Promise<boolean> {
  try {
    await access(caminho)
    return true
  } catch {
    return false
  }
}

async function hashDe(caminho: string): Promise<string | null> {
  if (!(await existe(caminho))) return null
  const conteudo = await readFile(caminho)
  return createHash('sha256').update(conteudo).digest('hex')
}

/**
 * Raiz do `backend/` de cada repositorio a conferir: os irmaos declarados no
 * manifesto **e o proprio**.
 *
 * O proprio entra porque faltava, e a falta era um buraco: a comparacao
 * percorria so a lista `irmaos`, entao o repositorio de onde o comando roda
 * nunca era hasheado. Quem nao estivesse na lista ficava invisivel ao proprio
 * guarda - foi o caso do lowcodejs, que divergia num congelado e recebia
 * `nenhuma divergencia`.
 */
async function irmaosPresentes(manifesto: Manifesto): Promise<Map<string, string>> {
  const encontrados = new Map<string, string>()
  encontrados.set(PROJETO, RAIZ)
  for (const relativo of manifesto.irmaos) {
    const caminho = resolve(RAIZ, relativo)
    if (!(await existe(caminho))) continue
    encontrados.set(basename(resolve(caminho, '..')), caminho)
  }
  return encontrados
}

function ehAdonis(raiz: string): Promise<boolean> {
  return existe(join(raiz, 'adonisrc.ts'))
}

/**
 * Quais repositorios presentes sao Adonis, resolvido uma vez.
 *
 * A aplicabilidade e **por repositorio**, e nao pelo repositorio de onde o
 * comando roda: `congelados.adonis` cobra caminhos que o lowcodejs nao tem, e
 * medi-los la acusaria `ausente` em toda a lista.
 */
async function adonisPorProjeto(irmaos: Map<string, string>): Promise<Map<string, boolean>> {
  const mapa = new Map<string, boolean>()
  for (const [nome, raiz] of irmaos) mapa.set(nome, await ehAdonis(raiz))
  return mapa
}

/** Os dois grupos de congelados, com a marca de quem so vale em Adonis. */
function grupos(manifesto: Manifesto): Array<[Record<string, Entrada>, boolean]> {
  return [
    [manifesto.congelados.todos, false],
    [manifesto.congelados.adonis, true],
  ]
}

/**
 * Os congelados que valem neste repositorio. `todos` vale nos quatro; `adonis`
 * so onde existe `adonisrc.ts`, porque o lowcodejs e Fastify e nao tem essas
 * camadas.
 */
async function congeladosAplicaveis(manifesto: Manifesto): Promise<Record<string, Entrada>> {
  const aplicaveis = { ...manifesto.congelados.todos }
  if (await ehAdonis(RAIZ)) Object.assign(aplicaveis, manifesto.congelados.adonis)
  return aplicaveis
}

async function verificarLocal(
  manifesto: Manifesto,
  irmaos: Map<string, string>
): Promise<Divergencia[]> {
  const divergencias: Divergencia[] = []
  const ehAdonisPorNome = await adonisPorProjeto(irmaos)

  for (const [grupo, soAdonis] of grupos(manifesto)) {
    for (const [caminho, entrada] of Object.entries(grupo)) {
      if (entrada.sha256 === null) continue
      const canonico = entrada.canonico ?? PROJETO
      const fora: string[] = []

      for (const [nome, raizIrmao] of irmaos) {
        if (soAdonis && !ehAdonisPorNome.get(nome)) continue
        const hash = await hashDe(join(raizIrmao, caminho))
        if (hash === null) {
          fora.push(`${nome} (ausente)`)
          continue
        }
        if (hash !== entrada.sha256) fora.push(nome)
      }

      if (fora.length === 0) continue
      divergencias.push({
        caminho,
        canonico,
        projetos: fora,
        aqui: fora.some((nome) => nome.startsWith(PROJETO)),
      })
    }
  }

  return divergencias
}

async function verificarIsolado(congelados: Record<string, Entrada>): Promise<Divergencia[]> {
  const divergencias: Divergencia[] = []

  for (const [caminho, entrada] of Object.entries(congelados)) {
    if (entrada.sha256 === null) continue
    const hash = await hashDe(join(RAIZ, caminho))
    if (hash === entrada.sha256) continue
    divergencias.push({
      caminho,
      canonico: entrada.canonico ?? PROJETO,
      projetos: [],
      aqui: true,
    })
  }

  return divergencias
}

async function propagar(manifesto: Manifesto, irmaos: Map<string, string>): Promise<number> {
  let copiados = 0
  const ehAdonisPorNome = await adonisPorProjeto(irmaos)

  for (const [grupo, soAdonis] of grupos(manifesto)) {
    for (const [caminho, entrada] of Object.entries(grupo)) {
      if (entrada.sha256 === null) continue
      const origem = irmaos.get(entrada.canonico ?? '')
      if (origem === undefined) continue

      const arquivoOrigem = join(origem, caminho)
      if (!(await existe(arquivoOrigem))) continue

      // Compara com o hash do proprio canonico, e nao com o do manifesto: o
      // fluxo da secao 11 e editar o canonico, propagar e so entao regravar,
      // entao no momento do `--propagate` o manifesto ainda carrega o hash
      // antigo. Comparar com ele fazia o irmao desatualizado casar com o valor
      // velho e ser pulado - o arquivo editado nunca saia do canonico.
      const hashOrigem = await hashDe(arquivoOrigem)

      for (const [nome, destino] of irmaos) {
        if (nome === entrada.canonico) continue
        if (soAdonis && !ehAdonisPorNome.get(nome)) continue
        const arquivoDestino = join(destino, caminho)
        if ((await hashDe(arquivoDestino)) === hashOrigem) continue
        await copyFile(arquivoOrigem, arquivoDestino)
        console.log(`  copiado  ${caminho}  ${entrada.canonico} -> ${nome}`)
        copiados += 1
      }
    }
  }

  return copiados
}

/**
 * Recalcula o sha256 de cada congelado a partir do seu canonico e regrava o
 * manifesto em todos os irmaos presentes. Um congelado pendente (`sha256: null`)
 * so ganha hash quando sai de `pendentes` para `congelados` a mao.
 */
async function regravar(manifesto: Manifesto, irmaos: Map<string, string>): Promise<number> {
  let atualizados = 0

  for (const grupo of [manifesto.congelados.todos, manifesto.congelados.adonis]) {
    for (const [caminho, entrada] of Object.entries(grupo)) {
      const origem = irmaos.get(entrada.canonico ?? '')
      if (origem === undefined) continue
      const hash = await hashDe(join(origem, caminho))
      if (hash === null || hash === entrada.sha256) continue
      entrada.sha256 = hash
      atualizados += 1
    }
  }

  const json = `${JSON.stringify(manifesto, null, 2)}\n`
  for (const raizIrmao of irmaos.values()) {
    await writeFile(join(raizIrmao, 'padrao.manifest.json'), json)
  }

  return atualizados
}

function relatar(divergencias: Divergencia[], modo: string, pendentes: number): void {
  if (divergencias.length === 0) {
    console.log(`sync:check (${modo}): ${pendentes} pendentes, nenhuma divergencia.`)
    return
  }

  console.log(`sync:check (${modo}): ${divergencias.length} modulos congelados divergentes\n`)
  for (const d of divergencias) {
    let onde = 'diverge do manifesto'
    if (d.projetos.length > 0) onde = `diverge em ${d.projetos.join(', ')}`
    console.log(`  ${d.caminho}`)
    console.log(`      ${onde}  (canonico: ${d.canonico})`)
  }
  console.log(
    `\n  Para alinhar: sync:check --propagate, depois sync:check --write.` +
      `\n  Ver PADRAO-BACKEND.md secao 11.`
  )
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2))
  const manifesto: Manifesto = JSON.parse(await readFile(MANIFESTO, 'utf8'))
  const irmaos = await irmaosPresentes(manifesto)
  const congelados = await congeladosAplicaveis(manifesto)
  const pendentes = Object.keys(manifesto.pendentes).length

  if (flags.has('--propagate')) {
    if (irmaos.size < 2) {
      console.error('sync:check --propagate exige os repositorios irmaos lado a lado.')
      process.exitCode = 1
      return
    }
    const copiados = await propagar(manifesto, irmaos)
    console.log(`sync:check --propagate: ${copiados} arquivos copiados.`)
    return
  }

  if (flags.has('--write')) {
    if (irmaos.size < 2) {
      console.error('sync:check --write exige os repositorios irmaos lado a lado.')
      process.exitCode = 1
      return
    }
    const atualizados = await regravar(manifesto, irmaos)
    console.log(
      `sync:check --write: ${atualizados} hashes atualizados em ${irmaos.size} repositorios.`
    )
    return
  }

  const local = irmaos.size >= 2
  let divergencias: Divergencia[] = []
  if (local) divergencias = await verificarLocal(manifesto, irmaos)
  if (!local) divergencias = await verificarIsolado(congelados)

  let modo = 'isolado'
  if (local) modo = 'local'
  relatar(divergencias, modo, pendentes)

  if (flags.has('--report')) return
  if (divergencias.length > 0) process.exitCode = 1
}

await main()
