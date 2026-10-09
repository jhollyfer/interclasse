/**
 * O que o upload precisa lembrar para sobreviver a um reload.
 *
 * Sem isto, a retomada só cobre a queda de rede: o `storageId` fica numa
 * variável de componente, e recarregar a página o perde. O upload continuaria
 * existindo no servidor, aberto e invisível, e o usuário recomeçaria do zero um
 * arquivo que já está 90% no bucket.
 *
 * `localStorage` e não a query cache do TanStack: o que se quer é justamente o
 * que atravessa o recarregamento, e a cache não atravessa.
 */

import type { Merge } from '#/lib/interfaces'

export type ResumeEntry = {
  storageId: string
  /** Nulo em upload de parte única. */
  uploadId: string | null
  partSize: number
}

/** O que vai para o disco: a entrada mais a hora em que foi escrita. */
type StoredEntry = Merge<ResumeEntry, { savedAt: number }>

const PREFIX = 'upload:'

/**
 * Quanto tempo uma retomada continua fazendo sentido, em ms.
 *
 * Vinte e quatro horas porque é a janela do `node ace storages:prune`: passado
 * isso o servidor já apagou o upload abandonado, e a entrada aponta para um
 * `storageId` que não existe mais. Sem o prazo ela ficava para sempre - quem
 * fecha a aba no meio de um envio nunca volta para limpá-la, e a única coisa
 * que a removia era o `404` de uma retomada que o usuário precisava tentar.
 */
const TTL = 24 * 60 * 60 * 1000

/**
 * A identidade de um arquivo local, para reencontrar o upload dele.
 *
 * Nome, tamanho e data de modificação - o que a File API dá sem ler o conteúdo.
 * Não é um hash: calcular um hash de um arquivo grande custa tanto quanto
 * enviá-lo, e o que se quer aqui é reconhecer "é o mesmo arquivo que eu estava
 * mandando há um minuto", não provar identidade contra o mundo.
 *
 * O risco é reconhecer como igual um arquivo trocado que coincida nos três
 * campos. A confirmação pega o caso: o tamanho declarado no servidor não vai
 * bater com o que subiu, e a resposta é `422`.
 */
export function resumeKey(file: File): string {
  return `${PREFIX}${file.name}:${file.size}:${file.lastModified}`
}

export function readResume(file: File): ResumeEntry | null {
  const key = resumeKey(file)
  const entry = parse(safeRead(key))

  if (!entry) return null

  if (expired(entry)) {
    safeRemove(key)
    return null
  }

  // Sem o `savedAt`: ele é contabilidade deste módulo, não parte do que o
  // upload precisa saber para retomar.
  return {
    storageId: entry.storageId,
    uploadId: entry.uploadId,
    partSize: entry.partSize,
  }
}

export function writeResume(file: File, entry: ResumeEntry): void {
  sweep()
  safeWrite(resumeKey(file), JSON.stringify({ ...entry, savedAt: Date.now() }))
}

export function clearResume(file: File): void {
  safeRemove(resumeKey(file))
}

/**
 * Apaga as retomadas vencidas de **todos** os arquivos, e não só a do que está
 * sendo enviado agora.
 *
 * `readResume` só alcança a entrada de um arquivo que o usuário tentou de novo,
 * e a maioria não é tentada de novo - é justamente por isso que elas se
 * acumulam. A varredura vai junto da escrita porque é o único momento em que
 * este módulo é chamado sabendo que vai mexer no disco de qualquer jeito.
 */
function sweep(): void {
  try {
    const stale: Array<string> = []

    for (let index = 0; index < globalThis.localStorage.length; index += 1) {
      const key = globalThis.localStorage.key(index)

      if (!key?.startsWith(PREFIX)) continue

      const entry = parse(safeRead(key))

      // Ilegível conta como vencida: não há como retomar a partir dela.
      if (!entry || expired(entry)) stale.push(key)
    }

    for (const key of stale) safeRemove(key)
  } catch {
    // Sem varredura, e o upload segue.
  }
}

function parse(stored: string | null): StoredEntry | null {
  if (!stored) return null

  try {
    const parsed: unknown = JSON.parse(stored)

    if (!isStoredEntry(parsed)) return null

    return parsed
  } catch {
    return null
  }
}

function expired(entry: StoredEntry): boolean {
  return Date.now() - entry.savedAt > TTL
}

/** Estreita o que veio do `localStorage`, que é texto de origem desconhecida. */
function isStoredEntry(value: unknown): value is StoredEntry {
  if (typeof value !== 'object' || value === null) return false

  const candidate: Record<string, unknown> = { ...value }

  if (typeof candidate.storageId !== 'string') return false
  if (typeof candidate.partSize !== 'number') return false
  if (typeof candidate.savedAt !== 'number') return false
  if (candidate.uploadId !== null && typeof candidate.uploadId !== 'string') {
    return false
  }

  return true
}

/**
 * O acesso ao `localStorage` é protegido porque ele não está sempre lá: no SSR
 * não existe, e no navegador em modo restrito ou com a cota cheia ele lança.
 * Perder a retomada é aceitável; derrubar o upload por causa dela, não.
 *
 * `try/catch` e não uma checagem de existência: o tipo do DOM declara
 * `localStorage` como sempre presente, então o compilador considera qualquer
 * guarda supérflua - e as duas falhas que importam (ausente no SSR, cota cheia
 * no navegador) chegam aqui como exceção de qualquer forma.
 */
function safeRead(key: string): string | null {
  try {
    return globalThis.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWrite(key: string, value: string): void {
  try {
    globalThis.localStorage.setItem(key, value)
  } catch {
    // Sem retomada, e o upload segue.
  }
}

function safeRemove(key: string): void {
  try {
    globalThis.localStorage.removeItem(key)
  } catch {
    // Idem.
  }
}
