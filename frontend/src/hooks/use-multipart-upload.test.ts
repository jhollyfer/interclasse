// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { m } from '#/paraglide/messages'

import { useMultipartUpload } from './use-multipart-upload'

const request = vi.fn()
const putPart = vi.fn()

vi.mock('#/integrations/tanstack-query/http', () => ({
  HTTPError: class HTTPError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message)
    }
  },
  request: (...args: ReadonlyArray<unknown>) => request(...args),
}))
vi.mock('#/lib/upload-transport', () => ({
  putPart: (...args: ReadonlyArray<unknown>) => putPart(...args),
}))

const PART_SIZE = 10

function plan(overrides: Record<string, unknown> = {}) {
  return {
    storage: { id: 's1', status: 'PENDING' },
    uploadId: 'u1',
    partSize: PART_SIZE,
    parts: [1, 2, 3].map((partNumber) => ({
      partNumber,
      url: `https://bucket/part-${partNumber}`,
    })),
    uploaded: [],
    ...overrides,
  }
}

function pngOf(size: number): File {
  return new File([new Uint8Array(size)], 'a.png', { type: 'image/png' })
}

beforeEach(() => {
  localStorage.clear()
  putPart.mockImplementation(
    (url: string) => `etag-${url.split('-').at(-1) ?? ''}`,
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useMultipartUpload', () => {
  it('sends each PUT with the part at the exact Blob.slice size', async () => {
    request
      .mockResolvedValueOnce(plan())
      .mockResolvedValueOnce({ id: 's1', status: 'UPLOADED' })
    const { result } = renderHook(() => useMultipartUpload())

    await result.current.upload(
      pngOf(25),
      () => undefined,
      new AbortController().signal,
    )

    const sizes = putPart.mock.calls.map((call) => {
      const body: unknown = call[1]
      if (!(body instanceof Blob)) throw new Error('o corpo não é um Blob')

      return body.size
    })

    // Two full parts and the remainder: this is the Content-Length the backend signs.
    expect(sizes.sort((a, b) => b - a)).toEqual([10, 10, 5])
  })

  it('uploads a whole file with the type, which the URL signs; a multipart part, without', async () => {
    request
      .mockResolvedValueOnce(
        plan({
          uploadId: null,
          parts: [{ partNumber: 1, url: 'https://bucket/part-1' }],
        }),
      )
      .mockResolvedValueOnce({ id: 's1', status: 'UPLOADED' })
      .mockResolvedValueOnce(plan())
      .mockResolvedValueOnce({ id: 's1', status: 'UPLOADED' })
    const { result } = renderHook(() => useMultipartUpload())
    const signal = new AbortController().signal

    await result.current.upload(pngOf(5), () => undefined, signal)
    await result.current.upload(pngOf(25), () => undefined, signal)

    const types = putPart.mock.calls.map((call) => {
      const body: unknown = call[1]
      if (!(body instanceof Blob)) throw new Error('o corpo não é um Blob')

      return body.type
    })

    // XHR sends the Blob's `Content-Type`: without it the bucket refuses the
    // whole-file URL, and with it the bucket refuses the part, which signs no type.
    expect(types).toEqual(['image/png', '', '', ''])
  })

  it('confirms with the ETags of the three parts in order', async () => {
    request
      .mockResolvedValueOnce(plan())
      .mockResolvedValueOnce({ id: 's1', status: 'UPLOADED' })
    const { result } = renderHook(() => useMultipartUpload())

    await result.current.upload(
      pngOf(25),
      () => undefined,
      new AbortController().signal,
    )

    const complete = request.mock.calls.at(-1)
    const body: unknown = complete?.[2]?.body

    expect(complete?.[0]).toBe('/storages/s1/complete')
    expect(body).toBe(
      JSON.stringify({
        parts: [
          { partNumber: 1, etag: 'etag-1' },
          { partNumber: 2, etag: 'etag-2' },
          { partNumber: 3, etag: 'etag-3' },
        ],
      }),
    )
  })

  it('when the file is zero bytes, still sends an empty part', async () => {
    request
      .mockResolvedValueOnce(
        plan({ parts: [{ partNumber: 1, url: 'https://bucket/part-1' }] }),
      )
      .mockResolvedValueOnce({ id: 's1', status: 'UPLOADED' })
    const { result } = renderHook(() => useMultipartUpload())

    await result.current.upload(
      pngOf(0),
      () => undefined,
      new AbortController().signal,
    )

    expect(putPart).toHaveBeenCalledTimes(1)
  })

  it('refuses a type outside the list before spending a request', async () => {
    const { result } = renderHook(() => useMultipartUpload())
    const exe = new File(['x'], 'a.exe', { type: 'application/x-msdownload' })

    await expect(
      result.current.upload(exe, () => undefined, new AbortController().signal),
    ).rejects.toThrow(m.upload_error_type({ type: 'application/x-msdownload' }))
    expect(request).not.toHaveBeenCalled()
  })

  it('resends only what the server does not have (resume)', async () => {
    request
      .mockResolvedValueOnce(
        plan({
          parts: [{ partNumber: 3, url: 'https://bucket/part-3' }],
          uploaded: [
            { partNumber: 1, etag: 'etag-1', size: 10 },
            { partNumber: 2, etag: 'etag-2', size: 10 },
          ],
        }),
      )
      .mockResolvedValueOnce({ id: 's1', status: 'UPLOADED' })
    const { result } = renderHook(() => useMultipartUpload())

    await result.current.upload(
      pngOf(25),
      () => undefined,
      new AbortController().signal,
    )

    expect(putPart).toHaveBeenCalledTimes(1)
    expect(putPart.mock.calls[0]?.[0]).toBe('https://bucket/part-3')
  })
})
