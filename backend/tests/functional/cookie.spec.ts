import { test } from '@japa/runner'
import { resolveSameSite } from '#services/cookie.service'

/**
 * O `SameSite` do cookie de sessão.
 *
 * A regra é apertada de propósito: `none` manda o cookie em toda requisição
 * cross-site e deixa o CSRF apoiado só na checagem de `Origin`, então ele só
 * aparece quando o app e a API estão mesmo em sites diferentes. O erro da
 * aproximação por domínio-pai cai sempre para o lado apertado, e aí a sessão não
 * sobe - falha barulhenta, não brecha silenciosa.
 */
test.group('cookie > resolveSameSite', () => {
  test('mesmo host é lax', ({ assert }) => {
    assert.equal(
      resolveSameSite('https://app.interclasse.com.br', 'https://app.interclasse.com.br'),
      'lax'
    )
  })

  test('subdomínios do mesmo domínio-pai são lax', ({ assert }) => {
    // O caso desta instalação: o `api-` na frente não muda o site.
    assert.equal(
      resolveSameSite('https://app.interclasse.com.br', 'https://api-app.interclasse.com.br'),
      'lax'
    )
  })

  test('domínios diferentes são none', ({ assert }) => {
    assert.equal(
      resolveSameSite('https://app.interclasse.com.br', 'https://api.outro.com.br'),
      'none'
    )
  })

  test('sem URL utilizável cai em none', ({ assert }) => {
    // Ausente ou malformado é o desenho desconhecido, e nele `lax` derrubaria a
    // sessão sem dizer por quê.
    assert.equal(resolveSameSite(undefined, 'https://api-app.interclasse.com.br'), 'none')
    assert.equal(resolveSameSite('nao-e-url', 'https://api-app.interclasse.com.br'), 'none')
  })

  test('o limite conhecido da heurística: dois domínios .com.br casam', ({ assert }) => {
    // `parentDomain` corta o primeiro rótulo, e não consulta a lista de sufixos
    // públicos: `interclasse.com.br` e `outro.com.br` viram ambos `com.br`. O teste
    // existe para registrar o erro, não para aprová-lo.
    //
    // Ele cai para o lado apertado - `lax` onde `none` era preciso - e aí a
    // sessão simplesmente não sobe: falha barulhenta, não brecha silenciosa.
    // Quem estiver nesse desenho configura `COOKIE_DOMAIN` e resolve. Carregar a
    // lista de sufixos públicos para acertar este caso custaria mais do que
    // vale, porque nenhuma instalação deste projeto está nele.
    assert.equal(resolveSameSite('https://interclasse.com.br', 'https://outro.com.br'), 'lax')
  })

  test('hosts de um rótulo só não têm domínio-pai', ({ assert }) => {
    // `localhost` contra `api`: nada a cortar, e a comparação de host já falhou.
    assert.equal(resolveSameSite('http://localhost:3000', 'http://api:3333'), 'none')
  })
})
