import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UploadPartError, putPart } from './upload-transport'

/**
 * O `XMLHttpRequest` não existe no ambiente de teste (roda em node), então cada
 * teste roteiriza o que o bucket responde. É o único jeito de exercitar a
 * retentativa: o que está sob teste é a decisão de insistir ou não, e ela
 * depende exatamente do status que volta.
 *
 * Relógio falso porque o backoff espera de verdade - meio segundo dobrando a
 * cada tentativa deixaria a suíte lenta por nada.
 */

type Script =
  | { kind: 'ok'; etag: string }
  | { kind: 'ok-sem-etag' }
  | { kind: 'status'; status: number }
  | { kind: 'rede' }
  /** Nunca responde: é o que dispara o relógio de silêncio. */
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

      this.upload.onprogress?.({
        lengthComputable: true,
        loaded: body.size,
        total: body.size,
      } as ProgressEvent)

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

/** Roda o relógio o bastante para atravessar backoff e respostas pendentes. */
async function settle(ms = 60_000): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
}

/**
 * Nos testes de recusa, a expectativa é montada **antes** de o relógio andar:
 * `expect(...).rejects` é o que instala o `catch` da promise, e deixá-lo para
 * depois do `settle()` faz a rejeição acontecer com ninguém escutando - o node
 * a denuncia como `unhandledRejection` mesmo com o teste passando.
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
  it('devolve o ETag quando o bucket aceita de primeira', async () => {
    scripts = [{ kind: 'ok', etag: '"abc"' }]

    const promise = putPart('https://bucket/parte/1', BODY)

    await settle()

    await expect(promise).resolves.toBe('"abc"')
    expect(sent).toBe(1)
  })

  it('insiste depois de um 503 e vence na tentativa seguinte', async () => {
    scripts = [
      { kind: 'status', status: 503 },
      { kind: 'ok', etag: '"abc"' },
    ]

    const promise = putPart('https://bucket/parte/1', BODY)

    await settle()

    await expect(promise).resolves.toBe('"abc"')
    expect(sent).toBe(2)
  })

  it('insiste depois de falha de rede - é a queda curta que ela existe para cobrir', async () => {
    scripts = [{ kind: 'rede' }, { kind: 'ok', etag: '"abc"' }]

    const promise = putPart('https://bucket/parte/1', BODY)

    await settle()

    await expect(promise).resolves.toBe('"abc"')
    expect(sent).toBe(2)
  })

  /**
   * Assinatura expirada não melhora com insistência. Quem conserta isso é o
   * lote seguinte de `GET /storages/:id/parts`, que traz URLs novas - repetir
   * aqui só gastaria as tentativas antes de chegar lá.
   */
  it('não insiste em 403', async () => {
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

  it('não insiste quando o ETag não veio - o CORS não se conserta repetindo', async () => {
    scripts = [{ kind: 'ok-sem-etag' }, { kind: 'ok', etag: '"abc"' }]

    const refused = expect(
      putPart('https://bucket/parte/1', BODY),
    ).rejects.toThrow(/ETag/)

    await settle()
    await refused

    expect(sent).toBe(1)
  })

  it('respeita o teto de tentativas', async () => {
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

  it('não insiste depois de cancelado', async () => {
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

  it('cancelar durante a espera do backoff interrompe na hora', async () => {
    scripts = [{ kind: 'rede' }, { kind: 'ok', etag: '"abc"' }]

    const controller = new AbortController()
    const refused = expect(
      putPart('https://bucket/parte/1', BODY, { signal: controller.signal }),
    ).rejects.toThrow(/cancelado/)

    // Tempo de a primeira tentativa falhar, mas não de o backoff terminar.
    await vi.advanceTimersByTimeAsync(1)

    controller.abort()

    await settle()
    await refused

    expect(sent).toBe(1)
  })

  /**
   * Conexão que para de responder sem fechar. O `onerror` do XHR pode demorar
   * muito a perceber isso - o relógio de silêncio é o que transforma a espera
   * infinita numa tentativa perdida, que aí sim é refeita.
   */
  it('desiste da tentativa muda e refaz', async () => {
    scripts = [{ kind: 'mudo' }, { kind: 'ok', etag: '"abc"' }]

    const promise = putPart('https://bucket/parte/1', BODY, {
      stallTimeout: 1_000,
    })

    await settle()

    await expect(promise).resolves.toBe('"abc"')
    expect(sent).toBe(2)
  })

  /**
   * Sem o zero, o contador de bytes do chamador guardaria o que a tentativa
   * perdida já tinha somado, e a barra passaria de 100% ao reenviar a parte.
   */
  it('zera o progresso antes de reenviar', async () => {
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
