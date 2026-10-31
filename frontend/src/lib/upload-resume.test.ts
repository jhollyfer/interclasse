import { beforeEach, describe, expect, it, vi } from 'vitest'

import { localStoreKey } from './local-store'
import {
  clearResume,
  readResume,
  resumeTheme,
  writeResume,
} from './upload-resume'

/**
 * `localStorage` does not exist in the test environment (it runs in node), which is the
 * same case as SSR - and it is precisely the case the module has to survive.
 * Each test builds its own.
 */
function withStorage() {
  const data = new Map<string, string>()

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    get length() {
      return data.size
    },
    key: (index: number) => [...data.keys()][index] ?? null,
  })

  return data
}

function fileOf(name: string, size: number, lastModified: number): File {
  return new File([new Uint8Array(size)], name, { lastModified })
}

const FILE = fileOf('catalogo.pdf', 5_000, 1_700_000_000_000)

/** A chave completa no storage: `interclasse:upload:<nome>:<tamanho>:<data>:v1`. */
function keyOf(file: File): string {
  return localStoreKey(resumeTheme(file))
}

const ENTRY = { storageId: 'abc', uploadId: 'upload-1', partSize: 1024 }

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('resumeTheme', () => {
  it('é estável para o mesmo arquivo', () => {
    expect(resumeTheme(FILE)).toBe(
      resumeTheme(fileOf('catalogo.pdf', 5_000, 1_700_000_000_000)),
    )
  })

  it('muda quando qualquer um dos três campos muda', () => {
    const base = resumeTheme(FILE)

    expect(resumeTheme(fileOf('outro.pdf', 5_000, 1_700_000_000_000))).not.toBe(
      base,
    )
    expect(
      resumeTheme(fileOf('catalogo.pdf', 5_001, 1_700_000_000_000)),
    ).not.toBe(base)
    expect(
      resumeTheme(fileOf('catalogo.pdf', 5_000, 1_700_000_000_001)),
    ).not.toBe(base)
  })
})

describe('readResume', () => {
  it('devolve o que foi gravado', () => {
    withStorage()
    writeResume(FILE, ENTRY)

    expect(readResume(FILE)).toEqual(ENTRY)
  })

  it('é nulo quando não há nada gravado', () => {
    withStorage()

    expect(readResume(FILE)).toBeNull()
  })

  it('é nulo depois de limpar', () => {
    withStorage()
    writeResume(FILE, ENTRY)
    clearResume(FILE)

    expect(readResume(FILE)).toBeNull()
  })

  it('é nulo para lixo, e não estoura', () => {
    const data = withStorage()
    data.set(keyOf(FILE), 'isto não é json')

    expect(readResume(FILE)).toBeNull()
  })

  it('é nulo para json com a forma errada', () => {
    const data = withStorage()
    data.set(keyOf(FILE), JSON.stringify({ storageId: 42 }))

    expect(readResume(FILE)).toBeNull()
  })

  it('aceita uploadId nulo, que é o upload de parte única', () => {
    withStorage()
    writeResume(FILE, { ...ENTRY, uploadId: null })

    expect(readResume(FILE)?.uploadId).toBeNull()
  })
})

/**
 * The entry has a deadline because the server does too: after 24h
 * `storages:prune` has already deleted the abandoned upload, and resuming points to a
 * `storageId` that no longer exists.
 */
describe('validade', () => {
  it('é nulo depois de vencer', () => {
    withStorage()
    writeResume(FILE, ENTRY)

    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000)

    expect(readResume(FILE)).toBeNull()

    vi.useRealTimers()
  })

  it('continua valendo antes de vencer', () => {
    withStorage()
    writeResume(FILE, ENTRY)

    vi.setSystemTime(Date.now() + 23 * 60 * 60 * 1000)

    expect(readResume(FILE)).toEqual(ENTRY)

    vi.useRealTimers()
  })

  it('gravar varre as entradas vencidas dos outros arquivos', () => {
    const data = withStorage()
    const velho = fileOf('velho.pdf', 1, 1)

    writeResume(velho, ENTRY)

    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000)

    // Nobody will try `velho.pdf` again: if the sweep does not reach it when
    // another file is written, it stays on disk forever.
    writeResume(FILE, ENTRY)

    expect(data.has(keyOf(velho))).toBe(false)
    expect(data.has(keyOf(FILE))).toBe(true)

    vi.useRealTimers()
  })

  it('a varredura leva junto o que não dá para ler', () => {
    const data = withStorage()
    data.set('interclasse:upload:lixo.pdf:1:1:v1', 'isto não é json')

    writeResume(FILE, ENTRY)

    expect(data.has('interclasse:upload:lixo.pdf:1:1:v1')).toBe(false)
  })

  it('a varredura não toca no que não é retomada', () => {
    const data = withStorage()
    data.set('tema', 'escuro')

    writeResume(FILE, ENTRY)

    expect(data.get('tema')).toBe('escuro')
  })
})

describe('sem localStorage', () => {
  it('lê nulo e grava sem estourar - é o caso do SSR', () => {
    expect(() => writeResume(FILE, ENTRY)).not.toThrow()
    expect(readResume(FILE)).toBeNull()
    expect(() => clearResume(FILE)).not.toThrow()
  })
})
