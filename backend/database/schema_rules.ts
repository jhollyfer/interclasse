import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

/**
 * O que o gerador de `database/schema.ts` precisa saber e não consegue ler do
 * banco.
 *
 * Hoje só uma coisa: quais colunas **não** saem na resposta. O default do Lucid
 * é serializar toda coluna, e `database/schema.ts` é gerado — declarar
 * `serializeAs: null` no model não sobrevive à próxima geração. Aqui sobrevive.
 *
 * O corte é estreito de propósito: entra o que é **equivalente a credencial**,
 * e não todo dado sensível. `cpf`, `email` e `phone` são mostrados pelas telas
 * autenticadas por desenho, e a vitrine já os filtra em
 * `storefront-shape.service.ts` — escondê-los aqui quebraria a tela do painel
 * sem fechar buraco nenhum.
 */
export default {
  tables: {
    auth_access_tokens: {
      columns: {
        // O valor que prova a sessão. Nenhuma rota serializa este model hoje, e
        // é justamente por isso que a proteção precisa estar aqui: quem
        // adicionar um `preload` amanhã não vai lembrar.
        hash: {
          tsType: 'string',
          decorators: [{ name: '@column', args: { serializeAs: null } }],
        },
      },
    },
  },
} satisfies SchemaRules
