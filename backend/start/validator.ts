/**
 * O boot só garante que o `vine` configurado foi carregado antes da primeira
 * requisição. A configuração - mensagens pt-BR, rótulos de campo e o transform
 * de data - mora em `app/core/validator.ts` (_padroes/backend.md §4.4).
 */
import '#core/validator'
