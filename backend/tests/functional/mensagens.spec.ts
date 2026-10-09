import { test } from '@japa/runner'
import { body } from '#tests/helpers'
import { RULE_MESSAGES } from '#start/validator'

/**
 * A frase de cada regra, em português.
 *
 * O mapa do backend é o que a API devolve para qualquer cliente, e é o lado sem
 * guarda: uma regra nova em `#core/validator` sem entrada aqui cai no default
 * do VineJS e a 422 sai híbrida - o rótulo em português dentro da frase em
 * inglês, "The o link field must be a valid URL".
 */

test.group('mensagens > provider de validação', () => {
  test('as regras que os validators usam estão em português', ({ assert }) => {
    // A lista é escrita à mão, e é isso que deixa a regra nova passar: ela só é
    // cobrada aqui depois que alguém a acrescenta. Regra nova em
    // `app/core/validator.ts` entra nesta lista no mesmo commit.
    //
    // `regex` e `confirmed` ficam de fora de propósito: os únicos usos delas
    // são em `password()`, e ambos já têm chave `campo.regra`. Cobrar a
    // genérica seria cobrar código morto.
    const obrigatorias = [
      'required',
      'string',
      'enum',
      'email',
      'number',
      'array',
      'object',
      'uuid',
      'url',
      'minLength',
      'maxLength',
      'min',
      'max',
      'positive',
      'withoutDecimals',
      'array.maxLength',
      'password.regex',
      'password.minLength',
      'password.maxLength',
      'passwordConfirmation.confirmed',
    ]

    const faltando = obrigatorias.filter((rule) => !(rule in RULE_MESSAGES))

    assert.deepEqual(faltando, [])
  })

  test('nenhuma mensagem escapou em inglês', ({ assert }) => {
    // `{{ field }}` é o marcador do VineJS, e não texto exibido - sai antes da
    // busca, senão toda mensagem que nomeia o campo seria acusada de inglesa.
    const suspeitas = Object.entries(RULE_MESSAGES).filter(([, message]) =>
      /\b(the|must|field|should|at least|at most|invalid|value)\b/i.test(
        message.replace(/\{\{.*?\}\}/g, '')
      )
    )

    assert.deepEqual(suspeitas, [])
  })

  test('a 422 de uma rota real sai inteira em português', async ({ client, assert }) => {
    // Os dois testes acima leem o mapa; este lê a resposta. É o que prova que o
    // `SimpleMessagesProvider` foi de fato instalado - um mapa correto que
    // ninguém registrou passaria nos outros dois.
    const response = await client
      .post('/authentication/sign-in')
      .json({ email: 'nao-e-email', password: 'Qualquer1!' })

    response.assertStatus(422)

    assert.deepEqual(body(response).errors, { email: 'Informe um e-mail válido' })
  })
})
