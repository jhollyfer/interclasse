import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from '@interclasse/shared'

import {
  listLocalThemes,
  localStoreKey,
  readLocal,
  removeLocal,
  writeLocal,
} from './local-store'

const Schema = z.object({ open: z.boolean() })

/** O `localStorage` não existe no node (o caso do SSR): cada teste monta o seu. */
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

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('localStoreKey', () => {
  it('segue <app>:<tema>:v1', () => {
    expect(localStoreKey('table-layout:users')).toBe(
      'interclasse:table-layout:users:v1',
    )
  })
})

describe('readLocal', () => {
  const input = { theme: 'panel', schema: Schema, fallback: { open: false } }

  it('devolve o fallback sem storage', () => {
    expect(readLocal(input)).toEqual({ open: false })
  })

  it('devolve o valor gravado quando bate com o schema', () => {
    withStorage()
    writeLocal('panel', { open: true })

    expect(readLocal(input)).toEqual({ open: true })
  })

  it('devolve o fallback com JSON torto', () => {
    const data = withStorage()
    data.set(localStoreKey('panel'), '{torto')

    expect(readLocal(input)).toEqual({ open: false })
  })

  it('devolve o fallback com forma fora do schema', () => {
    const data = withStorage()
    data.set(localStoreKey('panel'), JSON.stringify({ open: 'sim' }))

    expect(readLocal(input)).toEqual({ open: false })
  })
})

describe('writeLocal e removeLocal', () => {
  it('não lançam sem storage', () => {
    expect(() => writeLocal('panel', { open: true })).not.toThrow()
    expect(() => removeLocal('panel')).not.toThrow()
  })

  it('removem o tema gravado', () => {
    const data = withStorage()
    writeLocal('panel', { open: true })
    removeLocal('panel')

    expect(data.size).toBe(0)
  })
})

describe('listLocalThemes', () => {
  it('lista só os temas do prefixo', () => {
    withStorage()
    writeLocal('upload:a', 1)
    writeLocal('upload:b', 2)
    writeLocal('panel', 3)

    expect(listLocalThemes('upload:').sort()).toEqual(['upload:a', 'upload:b'])
  })
})
