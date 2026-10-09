import limiter from '@adonisjs/limiter/services/main'

/**
 * Os tetos de tentativa, por rota.
 *
 * A chave é o IP. Não é perfeito - várias pessoas atrás do mesmo NAT contam
 * junto -, mas quem entra ainda não tem sessão, e não há outra coisa a contar.
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
  const email = context.request.input('email')

  // Sem e-mail no corpo não há conta a proteger, e `null` é como o limiter
  // recebe "não aplique teto aqui". Inventar uma chave para este caso juntaria
  // toda requisição malformada num balde só, e vinte delas trancariam o login de
  // quem não fez nada.
  if (typeof email !== 'string' || email.length === 0) return null

  return limiter.allowRequests(20).every('1 hour').blockFor('10 mins').usingKey(`signin:${email}`)
})

/**
 * O upload. Mais alto que o resto porque um arquivo grande vira várias partes,
 * e cada parte é uma requisição - o teto conta requisição, não arquivo.
 */
export const uploadThrottle = limiter.define('upload', function () {
  return limiter.allowRequests(60).every('1 hour')
})
