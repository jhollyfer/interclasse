import { defineConfig, stores } from '@adonisjs/limiter'
import type { InferLimiters } from '@adonisjs/limiter/types'

/**
 * O limitador de tentativas.
 *
 * Existe pelo motivo clássico: `sign-in` e `sign-up` são as portas onde tentar
 * muitas vezes é o ataque, e o upload entrega URL assinada de bucket — sem teto,
 * um laço de shell enche o bucket sem passar por tela nenhuma.
 *
 * Só o store `database`: este projeto não tem Redis - nem a dependência, nem
 * `REDIS_URL`, nem serviço no compose. Declarar o store `redis` aqui faria o
 * container tentar resolver um binding que não existe e derrubar o boot. Quando
 * o projeto ganhar Redis, ele entra aqui e vira o padrão: contar tentativa é escrita quente e não vale ocupar a conexão do banco.
 */
const limiterConfig = defineConfig({
  default: 'database',

  stores: {
    database: stores.database({
      tableName: 'rate_limits',
      // A linha do contador não é dado do domínio: deixá-la para trás encheria
      // a tabela de chaves que já expiraram.
      clearExpiredByTimeout: true,
    }),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
