import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearResume,
  readResume,
  resumeKey,
  writeResume,
} from './upload-resume'

/**
 * O `localStorage` não existe no ambiente de teste (roda em node), que é o
 * mesmo caso do SSR - e é justamente o caso que o módulo tem de sobreviver.
 * Cada teste monta o seu.
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
  return { name, size, lastModified } as unknown as File
}

const FILE = fileOf('catalogo.pdf', 5_000, 1_700_000_000_000)

const ENTRY = { storageId: 'abc', uploadId: 'upload-1', partSize: 1024 }

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('resumeKey', () => {
  it('é estável para o mesmo arquivo', () => {
    expect(resumeKey(FILE)).toBe(
      resumeKey(fileOf('catalogo.pdf', 5_000, 1_700_000_000_000)),
    )
  })

  it('muda quando qualquer um dos três campos muda', () => {
    const base = resumeKey(FILE)

    expect(resumeKey(fileOf('outro.pdf', 5_000, 1_700_000_000_000))).not.toBe(
      base,
    )
    expect(
      resumeKey(fileOf('catalogo.pdf', 5_001, 1_700_000_000_000)),
    ).not.toBe(base)
    expect(
      resumeKey(fileOf('catalogo.pdf', 5_000, 1_700_000_000_001)),
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
    data.set(resumeKey(FILE), 'isto não é json')

    expect(readResume(FILE)).toBeNull()
  })

  it('é nulo para json com a forma errada', () => {
    const data = withStorage()
    data.set(resumeKey(FILE), JSON.stringify({ storageId: 42 }))

    expect(readResume(FILE)).toBeNull()
  })

  it('aceita uploadId nulo, que é o upload de parte única', () => {
    withStorage()
    writeResume(FILE, { ...ENTRY, uploadId: null })

    expect(readResume(FILE)?.uploadId).toBeNull()
  })
})

/**
 * A entrada tem prazo porque o servidor também tem: passadas 24h o
 * `storages:prune` já apagou o upload abandonado, e a retomada aponta para um
 * `storageId` que não existe mais.
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

    // Ninguém vai tentar `velho.pdf` de novo: se a varredura não o alcançar na
    // escrita de outro arquivo, ele fica no disco para sempre.
    writeResume(FILE, ENTRY)

    expect(data.has(resumeKey(velho))).toBe(false)
    expect(data.has(resumeKey(FILE))).toBe(true)

    vi.useRealTimers()
  })

  it('a varredura leva junto o que não dá para ler', () => {
    const data = withStorage()
    data.set('upload:lixo.pdf:1:1', 'isto não é json')

    writeResume(FILE, ENTRY)

    expect(data.has('upload:lixo.pdf:1:1')).toBe(false)
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
