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

/** The full key in storage: `interclasse:upload:<name>:<size>:<date>:v1`. */
function keyOf(file: File): string {
  return localStoreKey(resumeTheme(file))
}

const ENTRY = { storageId: 'abc', uploadId: 'upload-1', partSize: 1024 }

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('resumeTheme', () => {
  it('is stable for the same file', () => {
    expect(resumeTheme(FILE)).toBe(
      resumeTheme(fileOf('catalogo.pdf', 5_000, 1_700_000_000_000)),
    )
  })

  it('changes when any of the three fields changes', () => {
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
  it('returns what was saved', () => {
    withStorage()
    writeResume(FILE, ENTRY)

    expect(readResume(FILE)).toEqual(ENTRY)
  })

  it('is null when nothing is saved', () => {
    withStorage()

    expect(readResume(FILE)).toBeNull()
  })

  it('is null after clearing', () => {
    withStorage()
    writeResume(FILE, ENTRY)
    clearResume(FILE)

    expect(readResume(FILE)).toBeNull()
  })

  it('is null for garbage, and does not blow up', () => {
    const data = withStorage()
    data.set(keyOf(FILE), 'isto não é json')

    expect(readResume(FILE)).toBeNull()
  })

  it('is null for json with the wrong shape', () => {
    const data = withStorage()
    data.set(keyOf(FILE), JSON.stringify({ storageId: 42 }))

    expect(readResume(FILE)).toBeNull()
  })

  it('accepts a null uploadId, which is the single-part upload', () => {
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
  it('is null after expiring', () => {
    withStorage()
    writeResume(FILE, ENTRY)

    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000)

    expect(readResume(FILE)).toBeNull()

    vi.useRealTimers()
  })

  it('stays valid before expiring', () => {
    withStorage()
    writeResume(FILE, ENTRY)

    vi.setSystemTime(Date.now() + 23 * 60 * 60 * 1000)

    expect(readResume(FILE)).toEqual(ENTRY)

    vi.useRealTimers()
  })

  it('when saving, sweeps the expired entries of other files', () => {
    const data = withStorage()
    const stale = fileOf('stale.pdf', 1, 1)

    writeResume(stale, ENTRY)

    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000)

    // Nobody will try `stale.pdf` again: if the sweep does not reach it when
    // another file is written, it stays on disk forever.
    writeResume(FILE, ENTRY)

    expect(data.has(keyOf(stale))).toBe(false)
    expect(data.has(keyOf(FILE))).toBe(true)

    vi.useRealTimers()
  })

  it('takes the unreadable along in the sweep', () => {
    const data = withStorage()
    data.set('interclasse:upload:lixo.pdf:1:1:v1', 'isto não é json')

    writeResume(FILE, ENTRY)

    expect(data.has('interclasse:upload:lixo.pdf:1:1:v1')).toBe(false)
  })

  it('does not touch in the sweep what is not a resume', () => {
    const data = withStorage()
    data.set('tema', 'escuro')

    writeResume(FILE, ENTRY)

    expect(data.get('tema')).toBe('escuro')
  })
})

describe('without localStorage', () => {
  it('reads null and saves without blowing up - it is the SSR case', () => {
    expect(() => writeResume(FILE, ENTRY)).not.toThrow()
    expect(readResume(FILE)).toBeNull()
    expect(() => clearResume(FILE)).not.toThrow()
  })
})
