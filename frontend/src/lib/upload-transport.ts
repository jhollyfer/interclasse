/**
 * O envio de uma parte para a URL assinada.
 *
 * `XMLHttpRequest` e não `fetch`, que é o que o resto do app usa: `fetch` não
 * emite progresso de **upload**. Ele resolve quando a resposta chega, e até lá
 * não há como saber quantos bytes saíram - uma barra de progresso sobre `fetch`
 * só sabe pular de 0 para 100. Para download existe `response.body` em stream;
 * para upload, não existe equivalente com suporte real de navegador.
 *
 * A requisição não passa pelo `request()` de `integrations/tanstack-query/http`
 * de propósito: o destino é o bucket, não a API. Mandar cookie de sessão para
 * outra origem seria vazar credencial, e a URL já carrega a própria
 * autorização na assinatura.
 */

export type PutPartOptions = {
  onProgress?: (loaded: number, total: number) => void
  signal?: AbortSignal
  /** Quantas vezes tentar no total, contando a primeira. */
  attempts?: number
  /** Quanto tempo sem nenhum byte se mover antes de desistir da tentativa, em ms. */
  stallTimeout?: number
}

/** Tentativas por parte. Três cobre a oscilação curta sem insistir num destino morto. */
const ATTEMPTS = 3

/**
 * Silêncio máximo tolerado dentro de uma tentativa, em ms.
 *
 * É o tempo sem **nenhum byte se mover**, e não a duração total da requisição:
 * uma parte de 10 MiB num link ruim mas vivo leva minutos legítimos, e um teto
 * de duração mataria esse upload em vez de salvá-lo. O que importa é a conexão
 * ter parado - e parada é o que `onerror` do XHR pode demorar muito a perceber
 * quando o outro lado simplesmente some.
 */
const STALL_TIMEOUT = 30_000

/** Espera antes da primeira retentativa, em ms. Dobra a cada uma, com jitter. */
const BACKOFF = 500

/** O que o `PUT` de uma parte deu errado, com o status que o bucket devolveu. */
export class UploadPartError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'UploadPartError'
  }
}

/**
 * Se vale a pena mandar de novo.
 *
 * Rede caída (`status: 0`), conexão parada (`408`) e erro do lado do bucket
 * (`5xx`) são passageiros - repetir é exatamente o que resolve. `4xx` não:
 * assinatura expirada ou errada não melhora com insistência, e quem conserta
 * isso é o lote seguinte de `GET /storages/:id/parts`, que traz URLs novas.
 */
function retriable(error: unknown): boolean {
  if (!(error instanceof UploadPartError)) return false

  return error.status === 0 || error.status === 408 || error.status >= 500
}

/** Espera que acorda cedo se o upload for cancelado no meio. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelado', 'AbortError'))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      reject(new DOMException('Upload cancelado', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Uma tentativa: abre a conexão, manda os bytes, devolve o `ETag`. */
function attempt(
  url: string,
  body: Blob,
  { onProgress, signal, stallTimeout = STALL_TIMEOUT }: PutPartOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelado', 'AbortError'))
      return
    }

    const request = new XMLHttpRequest()
    let stall: ReturnType<typeof setTimeout> | undefined

    function clearStall() {
      if (stall !== undefined) clearTimeout(stall)
      stall = undefined
    }

    // Rearmado a cada byte que se move. Se o silêncio passar do limite, a
    // tentativa é abandonada como falha de rede - e o envelope de retentativa
    // decide se manda de novo.
    function armStall() {
      clearStall()
      stall = setTimeout(() => {
        stalled = true
        request.abort()
      }, stallTimeout)
    }

    let stalled = false

    request.open('PUT', url, true)

    request.upload.onprogress = (event) => {
      armStall()

      if (!event.lengthComputable) return
      onProgress?.(event.loaded, event.total)
    }

    request.onload = () => {
      clearStall()

      if (request.status < 200 || request.status >= 300) {
        reject(
          new UploadPartError(
            `Envio recusado (${request.status})`,
            request.status,
          ),
        )
        return
      }

      const etag = request.getResponseHeader('ETag')

      if (!etag) {
        reject(
          new UploadPartError(
            'O storage não expôs o ETag da parte - confira o CORS do bucket.',
            request.status,
          ),
        )
        return
      }

      resolve(etag)
    }

    request.onerror = () => {
      clearStall()
      reject(new UploadPartError('Falha de rede ao enviar a parte', 0))
    }

    request.onabort = () => {
      clearStall()

      // O `abort()` do relógio de silêncio chega aqui pelo mesmo caminho do
      // cancelamento do usuário. Só um dos dois merece nova tentativa.
      if (stalled) {
        reject(new UploadPartError('A conexão parou de responder', 408))
        return
      }

      reject(new DOMException('Upload cancelado', 'AbortError'))
    }

    signal?.addEventListener('abort', () => request.abort(), { once: true })

    armStall()

    request.send(body)
  })
}

/**
 * Envia um pedaço do arquivo e devolve o `ETag` que o bucket deu, insistindo
 * quando a falha for passageira.
 *
 * O `ETag` é a única prova de que a parte chegou inteira, e é o que a
 * confirmação exige de volta. Ele só é legível se o bucket expuser `ETag` em
 * `Access-Control-Expose-Headers` - sem isso o navegador esconde o header e
 * nenhum upload multipart consegue fechar.
 *
 * A retentativa é o que faz "retomável" valer também para a oscilação curta.
 * Sem ela, o upload só sobrevivia ao que o usuário conseguisse consertar na
 * mão: uma queda de dez segundos derrubava a parte em voo, marcava o item como
 * erro e ficava esperando um clique.
 *
 * A parte inteira é reenviada, nunca o que faltava dela - o `PUT` de uma parte
 * é atômico do lado do bucket, e meia parte não existe. O que a retomada
 * economiza são as partes **já confirmadas**, e disso quem cuida é o
 * `listParts`.
 */
export async function putPart(
  url: string,
  body: Blob,
  options: PutPartOptions = {},
): Promise<string> {
  const total = options.attempts ?? ATTEMPTS

  for (let round = 1; ; round += 1) {
    try {
      return await attempt(url, body, options)
    } catch (error) {
      if (round >= total) throw error
      if (!retriable(error)) throw error

      // A tentativa anterior deixou o contador de bytes onde parou. Zerar antes
      // de recomeçar evita que a barra some o que vai ser reenviado e passe de
      // 100%.
      options.onProgress?.(0, body.size)

      // Jitter para que várias partes derrubadas pela mesma queda não voltem
      // todas no mesmo instante.
      await wait(
        BACKOFF * 2 ** (round - 1) * (1 + Math.random()),
        options.signal,
      )
    }
  }
}
