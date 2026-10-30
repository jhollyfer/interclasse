import limiter from '@adonisjs/limiter/services/main'

/**
 * As chaves dos limites que não são o IP, em métodos que se testam sem banco.
 */
export class LimiterKey {
  /**
   * A conta do sign-in, pelo e-mail normalizado (`trim` e minúsculas): a mesma
   * conta com caixa ou espaço diferente conta no mesmo balde
   * (_standards/backend.md §4.10). Sem e-mail no corpo não há conta a proteger, e
   * `null` é como o limiter recebe "não aplique teto aqui".
   */
  static account(email: unknown): string | null {
    if (typeof email !== 'string') return null

    const normalized = email.trim().toLowerCase()

    if (normalized.length === 0) return null

    return `signin:${normalized}`
  }

  /**
   * O usuário autenticado numa política de limite. `null` sem sessão: o teto
   * por usuário só existe depois do `auth()`, e inventar uma chave juntaria
   * todos os anônimos num balde só.
   */
  static user(scope: string, user: { readonly id: string } | undefined): string | null {
    if (!user) return null

    return `${scope}:${user.id}`
  }
}

/**
 * Os tetos de tentativa, por rota.
 *
 * A chave padrão é o IP, lido com o `trustProxy` de `config/app.ts`. Não é
 * perfeito - várias pessoas atrás do mesmo NAT contam junto -, mas quem entra
 * ainda não tem sessão, e não há outra coisa a contar. Rota autenticada conta
 * por usuário (`LimiterKey.user`).
 */

/**
 * A porta do painel, por IP. Cinco tentativas por minuto é folgado para quem
 * erra a senha e apertado para quem a adivinha.
 *
 * `blockFor` é o que transforma o teto em custo: sem ele a janela expira sozinha
 * e o atacante volta a tentar cinco vezes no minuto seguinte, indefinidamente.
 * Com ele, estourar o teto custa dez minutos parado.
 */
export const signInThrottle = limiter.define('signIn', function () {
  return limiter.allowRequests(5).every('1 minute').blockFor('10 mins')
})

/**
 * A mesma porta, contada por conta.
 *
 * O teto por IP sozinho não protege a conta: quem tem muitos endereços tenta a
 * mesma senha em cada um e nunca estoura o limite de nenhum. Contar por e-mail
 * fecha isso.
 *
 * É um segundo limite e não uma chave composta `ip:email`, que seria o inverso
 * do que se quer: com a chave junta, o mesmo IP ganharia cinco tentativas **por
 * e-mail**, e enumerar contas ficaria mais barato, não mais caro.
 *
 * Mais folgado que o do IP - vinte por hora - porque este é o limite que uma
 * pessoa esquecida da própria senha esbarra, e trancá-la por engano é o abuso
 * que ele mesmo poderia causar.
 */
export const signInAccountThrottle = limiter.define('signInAccount', function (context) {
  // Normalizado antes do validator, porque o limite roda antes dele.
  const key = LimiterKey.account(context.request.input('email'))

  // Inventar uma chave para o corpo malformado juntaria toda requisição
  // inválida num balde só, e vinte delas trancariam o login de quem não fez nada.
  if (!key) return null

  return limiter.allowRequests(20).every('1 hour').blockFor('10 mins').usingKey(key)
})

/**
 * A renovação da sessão, por IP. Fica fora do `auth()` e escreve cookie: o token
 * de refresh é opaco e de alta entropia, então não há força bruta prática, e o
 * teto leve (30 por minuto) só protege o custo da consulta por requisição.
 */
export const refreshThrottle = limiter.define('refresh', function () {
  return limiter.allowRequests(30).every('1 minute')
})

/**
 * O upload, **por usuário**: a rota é autenticada, e contar por IP juntaria numa
 * cota só toda a escola atrás do mesmo NAT. Mais alto que o resto porque um
 * arquivo grande vira várias partes, e cada parte é uma requisição - o teto
 * conta requisição, não arquivo. Só as escritas da biblioteca (abrir, pedir
 * partes, completar) o usam; as leituras do painel não gastam esta cota.
 */
export const uploadThrottle = limiter.define('upload', function (context) {
  const key = LimiterKey.user('upload', context.auth.user)

  if (!key) return null

  return limiter.allowRequests(60).every('1 hour').usingKey(key)
})

/**
 * A troca de e-mail e de senha (`PUT /account`), por usuário: exige a senha
 * atual, e sem teto a rota serve de oráculo de senha para quem roubou uma sessão.
 */
export const accountUpdateThrottle = limiter.define('accountUpdate', function (context) {
  const key = LimiterKey.user('account-update', context.auth.user)

  if (!key) return null

  return limiter.allowRequests(10).every('1 hour').blockFor('10 mins').usingKey(key)
})

/**
 * A exportação do relatório, por usuário: monta o arquivo inteiro a cada pedido
 * (rota cara, _standards/backend.md §4.10).
 */
export const reportExportThrottle = limiter.define('reportExport', function (context) {
  const key = LimiterKey.user('report-export', context.auth.user)

  if (!key) return null

  return limiter.allowRequests(20).every('1 hour').usingKey(key)
})
