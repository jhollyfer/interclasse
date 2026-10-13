import { describe, expect, it } from 'vitest'
import { email, vine } from './validator'

/**
 * O que é de todo validator: o `vine` configurado no topo de `validator.ts`.
 * Os schemas daqui são montados com ele, e não emprestados de um recurso, para
 * a suíte cobrar a configuração e não a regra de um formulário.
 */

describe('mensagens', () => {
  // Sem o `messagesProvider` do topo de `validator.ts` a mensagem sai em inglês,
  // e o formulário fica bilíngue: rótulo em português, erro em inglês.
  it('responde em português, com o rótulo do campo', async () => {
    const [error] = await vine
      .create({ email: email() })
      .tryValidate({ email: 'nao-e-email' })

    expect(error?.messages).toEqual([
      expect.objectContaining({
        field: 'email',
        message: 'Informe um e-mail válido',
      }),
    ])
  })

  it('nomeia o campo ausente pelo rótulo, e não pela chave', async () => {
    const [error] = await vine
      .create({ name: vine.string().maxLength(60) })
      .tryValidate({})

    expect(error?.messages).toContainEqual(
      expect.objectContaining({ message: 'Informe o nome' }),
    )
  })
})

describe('convertEmptyStringsToNull', () => {
  /**
   * A flag do topo de `validator.ts` espelha o `config/bodyparser.ts` do
   * AdonisJS: o `''` de um `<input>` vazio vira `null` antes de validar, e um
   * campo `.optional()` o entrega ausente.
   *
   * Sem a flag, `vine.string().optional()` receberia a string vazia, passaria, e
   * a API recusaria depois - validação de cliente aprovando o que o servidor
   * nega é pior do que não validar. Este caso é o que impede a regressão.
   */
  it('aceita campo opcional em branco e o entrega ausente', async () => {
    const [error, payload] = await vine
      .create({ name: vine.string().trim().minLength(1).optional() })
      .tryValidate({ name: '' })

    expect(error).toBeNull()
    expect(payload?.name).toBeUndefined()
  })
})
