import { fromPartial } from '@total-typescript/shoehorn'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UploadPartError, putPart } from './upload-transport'

/**
 * `XMLHttpRequest` does not exist in the test environment (it runs in node), so each
 * test scripts what the bucket answers. It is the only way to exercise the
 * retry: what is under test is the decision to insist or not, and it
 * depends exactly on the status that comes back.
 *
 * Fake clock because the backoff really waits - half a second doubling on
 * every attempt would make the suite slow for nothing.
 */

type Script =
  | { kind: 'ok'; etag: string }
  | { kind: 'ok-sem-etag' }
  | { kind: 'status'; status: number }
  | { kind: 'rede' }
  /** Never answers: it is what fires the silence clock. */
  | { kind: 'mudo' }

let scripts: Array<Script> = []
let sent = 0

class FakeXHR {
  status = 0
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = {
    onprogress: null,
  }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null

  #headers = new Map<string, string>()
  #aborted = false

  open(): void {}

  getResponseHeader(name: string): string | null {
    return this.#headers.get(name) ?? null
  }

  send(body: Blob): void {
    sent += 1

    const script = scripts.shift() ?? { kind: 'rede' }

    setTimeout(() => {
      if (this.#aborted) return
      if (script.kind === 'mudo') return

      if (script.kind === 'rede') {
        this.onerror?.()
        return
      }

      if (script.kind === 'status') {
        this.status = script.status
        this.onload?.()
        return
      }

      this.upload.onprogress?.(
        fromPartial<ProgressEvent>({
          lengthComputable: true,
          loaded: body.size,
          total: body.size,
        }),
      )

      this.status = 200
      if (script.kind === 'ok') this.#headers.set('ETag', script.etag)
      this.onload?.()
    }, 0)
  }

  abort(): void {
    this.#aborted = true
    this.onabort?.()
  }
}

const BODY = new Blob(['x'.repeat(10)])

/** Runs the clock enough to cross backoff and pending responses. */
async function settle(ms = 60_000): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
}

/**
 * In the refusal tests, the expectation is built **before** the clock moves:
 * `expect(...).rejects` is what installs the promise's `catch`, and leaving it for
 * after `settle()` makes the rejection happen with nobody listening - node
 * reports it as `unhandledRejection` even though the test passes.
 */

beforeEach(() => {
  scripts = []
  sent = 0
  vi.useFakeTimers()
  vi.stubGlobal('XMLHttpRequest', FakeXHR)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('putPart', () => {
  it('returns the ETag when the bucket accepts on the first try', async () => {
    scripts = [{ kind: 'ok', etag: '"abc"' }]

    const promise = putPart('https://bucket/parte/1', BODY)

    await settle()

    await expect(promise).resolves.toBe('"abc"')
    expect(sent).toBe(1)
  })

  it('insists after a 503 and succeeds on the next attempt', async () => {
    scripts = [
      { kind: 'status', status: 503 },
      { kind: 'ok', etag: '"abc"' },
    ]

    const promise = putPart('https://bucket/parte/1', BODY)

    await settle()

    await expect(promise).resolves.toBe('"abc"')
    expect(sent).toBe(2)
  })

  it('insists after a network failure - the short drop it exists to cover', async () => {
    scripts = [{ kind: 'rede' }, { kind: 'ok', etag: '"abc"' }]

    const promise = putPart('https://bucket/parte/1', BODY)

    await settle()

    await expect(promise).resolves.toBe('"abc"')
    expect(sent).toBe(2)
  })

  /**
   * An expired signature does not improve with insistence. Whoever fixes this is the
   * next batch of `GET /storages/:id/parts`, which brings new URLs - repeating
   * here would only spend the attempts before getting there.
   */
  it('does not insist on 403', async () => {
    scripts = [
      { kind: 'status', status: 403 },
      { kind: 'ok', etag: '"abc"' },
    ]

    const refused = expect(
      putPart('https://bucket/parte/1', BODY),
    ).rejects.toThrow(UploadPartError)

    await settle()
    await refused

    expect(sent).toBe(1)
  })

  it('does not insist when the ETag did not come - CORS is not fixed by repeating', async () => {
    scripts = [{ kind: 'ok-sem-etag' }, { kind: 'ok', etag: '"abc"' }]

    const refused = expect(
      putPart('https://bucket/parte/1', BODY),
    ).rejects.toThrow(/ETag/)

    await settle()
    await refused

    expect(sent).toBe(1)
  })

  it('respects the attempt cap', async () => {
    scripts = [
      { kind: 'rede' },
      { kind: 'rede' },
      { kind: 'rede' },
      { kind: 'ok', etag: '"abc"' },
    ]

    const refused = expect(
      putPart('https://bucket/parte/1', BODY, { attempts: 3 }),
    ).rejects.toThrow(UploadPartError)

    await settle()
    await refused

    expect(sent).toBe(3)
  })

  it('does not insist after cancelled', async () => {
    scripts = [{ kind: 'mudo' }]

    const controller = new AbortController()
    const refused = expect(
      putPart('https://bucket/parte/1', BODY, { signal: controller.signal }),
    ).rejects.toThrow(/cancelado/)

    controller.abort()

    await settle()
    await refused

    expect(sent).toBe(1)
  })

  it('when cancelled during the backoff wait, interrupts at once', async () => {
    scripts = [{ kind: 'rede' }, { kind: 'ok', etag: '"abc"' }]

    const controller = new AbortController()
    const refused = expect(
      putPart('https://bucket/parte/1', BODY, { signal: controller.signal }),
    ).rejects.toThrow(/cancelado/)

    // Time for the first attempt to fail, but not for the backoff to finish.
    await vi.advanceTimersByTimeAsync(1)

    controller.abort()

    await settle()
    await refused

    expect(sent).toBe(1)
  })

  /**
   * A connection that stops answering without closing. XHR's `onerror` can take a
   * long time to notice that - the silence clock is what turns the
   * infinite wait into a lost attempt, which is then redone.
   */
  it('gives up on the silent attempt and redoes it', async () => {
    scripts = [{ kind: 'mudo' }, { kind: 'ok', etag: '"abc"' }]

    const promise = putPart('https://bucket/parte/1', BODY, {
      stallTimeout: 1_000,
    })

    await settle()

    await expect(promise).resolves.toBe('"abc"')
    expect(sent).toBe(2)
  })

  /**
   * Without the zero, the caller's byte counter would keep what the lost attempt
   * had already added, and the bar would go past 100% when resending the part.
   */
  it('zeroes the progress before resending', async () => {
    scripts = [{ kind: 'rede' }, { kind: 'ok', etag: '"abc"' }]

    const reported: Array<number> = []
    const promise = putPart('https://bucket/parte/1', BODY, {
      onProgress: (loaded) => void reported.push(loaded),
    })

    await settle()
    await promise

    expect(reported).toContain(0)
    expect(reported.at(-1)).toBe(BODY.size)
  })
})
