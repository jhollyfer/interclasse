import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * O corpo JSON que toda falha da API devolve. Segue a convenção do AdonisJS:
 * `status` é o número HTTP e `code` é o código de máquina.
 */
export type HTTPExceptionPayload = {
  message: string
  status: number
  code: string
  errors?: Record<string, string>
}

/**
 * Falha de negócio pronta para virar resposta HTTP.
 *
 * O construtor é `protected` de propósito: instância só pelas fábricas
 * estáticas, que são o que fixa o par status/code. Um `new HTTPException(...)`
 * solto deixaria qualquer combinação passar, e o catálogo de erros da API
 * deixaria de ser conferível lendo este arquivo.
 *
 * A assinatura das fábricas é posicional - `(message, code, errors?)` -, a
 * mesma do projeto de referência.
 *
 * O `handle()` faz esta exceção se resolver sozinha: o AdonisJS o chama quando
 * a exceção sobe de um controller, sem passar pelo handler global.
 */
export default class HTTPException extends Exception {
  declare code: string
  errors?: Record<string, string>

  protected constructor(payload: HTTPExceptionPayload) {
    super(payload.message, { status: payload.status, code: payload.code })

    if (payload.errors) {
      this.errors = payload.errors
    }
  }

  /**
   * O corpo da resposta. `errors` só aparece quando existe - erro sem detalhe
   * por campo não inventa uma chave vazia.
   */
  toResponse(): HTTPExceptionPayload {
    const body: HTTPExceptionPayload = {
      message: this.message,
      status: this.status,
      code: this.code,
    }

    if (this.errors) {
      body.errors = this.errors
    }

    return body
  }

  handle(error: this, { response }: HttpContext) {
    return response.status(error.status).send(error.toResponse())
  }

  // 4xx - erros do cliente

  /**
   * O 400 que o gerador de documento já descrevia e nenhuma factory produzia.
   *
   * `app/core/openapi/errors.ts` tem a descrição de `400` desde sempre, mas não
   * havia como emiti-lo: quem precisava recusar um payload que nem chega a ser
   * interpretável caía em 422, que é outra coisa - 422 é "entendi e recuso",
   * 400 é "não consegui ler".
   */
  static BadRequest(
    message = 'Requisição inválida',
    code = 'INVALID_PARAMETERS',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 400, code, errors })
  }

  static Unauthorized(
    message = 'Não autorizado',
    code = 'AUTHENTICATION_REQUIRED',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 401, code, errors })
  }

  static Forbidden(
    message = 'Acesso negado',
    code = 'ACCESS_DENIED',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 403, code, errors })
  }

  static NotFound(
    message = 'Recurso não encontrado',
    code = 'RESOURCE_NOT_FOUND',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 404, code, errors })
  }

  static Conflict(
    message = 'Conflito na requisição',
    code = 'CONFLICT_IN_REQUEST',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 409, code, errors })
  }

  /** O recurso existiu e não existe mais, o que é diferente de nunca ter existido. */
  static Gone(message = 'Recurso não está mais disponível', code = 'RESOURCE_GONE'): HTTPException {
    return new HTTPException({ message, status: 410, code })
  }

  /** A condição que a requisição declarou não vale mais. */
  static PreconditionFailed(
    message = 'Condição prévia não atendida',
    code = 'PRECONDITION_NOT_MET',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 412, code, errors })
  }

  /**
   * O corpo passou do teto.
   *
   * 413 e não 422: o limite é de transporte, e recusar por tamanho antes de
   * interpretar é o que evita carregar o corpo inteiro na memória.
   */
  static PayloadTooLarge(
    message = 'Conteúdo excede o tamanho permitido',
    code = 'PAYLOAD_TOO_LARGE',
  ): HTTPException {
    return new HTTPException({ message, status: 413, code })
  }

  /** O `Content-Type` não é um dos que a rota aceita. */
  static UnsupportedMediaType(
    message = 'Formato de conteúdo não suportado',
    code = 'UNSUPPORTED_MEDIA_TYPE',
  ): HTTPException {
    return new HTTPException({ message, status: 415, code })
  }

  /** O recurso está em uso por outra operação e não aceita escrita agora. */
  static Locked(message = 'Recurso bloqueado', code = 'RESOURCE_LOCKED'): HTTPException {
    return new HTTPException({ message, status: 423, code })
  }

  /**
   * O teto de tentativa estourou.
   *
   * O `@adonisjs/limiter` emite a própria exceção nas rotas com throttle; esta
   * existe para o teto que é regra de negócio e não de transporte.
   */
  static TooManyRequests(
    message = 'Tentativas em excesso. Tente novamente mais tarde',
    code = 'TOO_MANY_REQUESTS',
  ): HTTPException {
    return new HTTPException({ message, status: 429, code })
  }

  static UnprocessableEntity(
    message = 'Dados inválidos',
    code = 'UNPROCESSABLE_ENTITY',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 422, code, errors })
  }

  // 5xx - erros do servidor

  static InternalServerError(
    message = 'Erro interno do servidor',
    code = 'SERVER_ERROR',
  ): HTTPException {
    return new HTTPException({ message, status: 500, code })
  }

  static ServiceUnavailable(
    message = 'Serviço indisponível',
    code = 'SERVICE_UNAVAILABLE',
  ): HTTPException {
    return new HTTPException({ message, status: 503, code })
  }
  /** A rota existe e o caminho ainda não foi construído. */
  static NotImplemented(
    message = 'Funcionalidade não implementada',
    code = 'NOT_IMPLEMENTED',
  ): HTTPException {
    return new HTTPException({ message, status: 501, code })
  }

  /** O terceiro respondeu, e respondeu errado. */
  static BadGateway(
    message = 'Resposta inválida do serviço externo',
    code = 'BAD_GATEWAY',
  ): HTTPException {
    return new HTTPException({ message, status: 502, code })
  }

  /** O terceiro não respondeu a tempo. */
  static GatewayTimeout(
    message = 'O serviço externo não respondeu a tempo',
    code = 'GATEWAY_TIMEOUT',
  ): HTTPException {
    return new HTTPException({ message, status: 504, code })
  }
}

/**
 * Qual campo recebe o erro de endereço duplicado.
 *
 * A busca é sempre por `slug`, mas o `slug` pode ter saído do título ou do
 * nome. Marcar o campo que a pessoa não preencheu poria a mensagem sob um
 * input vazio, e quem digitou só o título não veria o que corrigir.
 *
 * Guarda com retorno cedo em vez de `[informado ? 'slug' : 'title']`: a mesma
 * chave computada aparecia em oito use-cases, cada um repetindo a regra em vez
 * de nomeá-la.
 */
export function slugErrorField<T extends string>(informado: unknown, alternativo: T): 'slug' | T {
  if (informado) return 'slug'

  return alternativo
}
