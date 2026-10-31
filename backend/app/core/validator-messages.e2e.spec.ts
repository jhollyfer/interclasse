import { test } from '@japa/runner'
import { LOCALES } from '@interclasse/shared'

import { body } from '#tests/http-fixtures'
import { RULE_MESSAGES } from '#core/validator'

/**
 * The phrase of each rule, in Portuguese.
 *
 * The backend map is what the API returns to any client, and it is the side without a
 * guard: a new rule in `#core/validator` with no entry here falls to the VineJS default
 * and the 422 comes out hybrid - the Portuguese label inside the English phrase,
 * "The o link field must be a valid URL".
 */

test.group('messages > validation provider', () => {
  test('the rules the validators use are in Portuguese', ({ assert }) => {
    // The list is hand-written, and that is what lets a new rule through: it is only
    // enforced here after someone adds it. A new rule in
    // `app/core/validator.ts` goes in this list in the same commit.
    //
    // `regex` and `confirmed` are left out on purpose: their only uses
    // are in `password()`, and both already have a `field.rule` key. Enforcing the
    // generic one would be enforcing dead code.
    const required = [
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

    const missing = LOCALES.flatMap((locale) =>
      required
        .filter((rule) => !(rule in RULE_MESSAGES[locale]))
        .map((rule) => `${locale}:${rule}`),
    )

    assert.deepEqual(missing, [])
  })

  test('no message escaped in English', ({ assert }) => {
    // `{{ field }}` is the VineJS marker, not displayed text - it goes out before the
    // search, otherwise every message that names the field would be accused of being English.
    const suspect = Object.entries(RULE_MESSAGES['pt-BR']).filter(([, message]) =>
      /\b(the|must|field|should|at least|at most|invalid|value)\b/i.test(
        message.replace(/\{\{.*?\}\}/g, ''),
      ),
    )

    assert.deepEqual(suspect, [])
  })

  test('the 422 of a real route comes out entirely in Portuguese', async ({ client, assert }) => {
    // The two tests above read the map; this one reads the response. It is what proves the
    // `SimpleMessagesProvider` was actually installed - a correct map that
    // nobody registered would pass the other two.
    const response = await client
      .post('/authentication/sign-in')
      .json({ email: 'nao-e-email', password: 'Qualquer1!' })

    response.assertStatus(422)

    assert.deepEqual(body(response).errors, { email: 'Informe um e-mail válido' })
  })

  test('the 422 comes out in the Accept-Language language', async ({ client, assert }) => {
    const english = await client
      .post('/authentication/sign-in')
      .header('accept-language', 'en-US,en;q=0.9')
      .json({ email: 'nao-e-email', password: 'Qualquer1!' })
    const spanish = await client
      .post('/authentication/sign-in')
      .header('accept-language', 'es')
      .json({ email: 'nao-e-email', password: 'Qualquer1!' })

    assert.deepEqual(body(english).errors, { email: 'Enter a valid email' })
    assert.deepEqual(body(spanish).errors, { email: 'Ingresa un correo electrónico válido' })
  })
})
