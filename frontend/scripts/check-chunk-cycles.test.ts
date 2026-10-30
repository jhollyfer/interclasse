import { describe, expect, it } from 'vitest'

import { eagerOnly } from './check-chunk-cycles.mjs'

/**
 * O `eagerOnly` separa o que roda **na avaliação** do módulo do que só roda
 * depois. É a peça que decide se o guarda de chunk cíclico trava o CI ou deixa
 * o bug passar, e ela errou nos dois sentidos antes de chegar aqui:
 *
 * - `function f({ a }) { ... }` - a chave da desestruturação era lida como o
 *   corpo, e o corpo inteiro virava código de avaliação. Todo componente com
 *   props desestruturadas virava falso-positivo.
 * - `loader: () => usar(x)` - arrow sem bloco não tem chave que marque o fim, e
 *   sem tratá-la em separado toda rota do app virava falso-positivo.
 *
 * O contrato: o retorno tem o **mesmo comprimento** da entrada e preserva as
 * quebras de linha, para que o número de linha do achado seja o do arquivo.
 */
describe('eagerOnly', () => {
  const eager = (code: string): string => eagerOnly(code)

  it('preserva comprimento e quebras de linha', () => {
    const code = 'var a = 1\nfunction f() {\n  return b\n}\n'

    expect(eager(code)).toHaveLength(code.length)
    expect(eager(code).split('\n')).toHaveLength(code.split('\n').length)
  })

  it('mantém o que roda na avaliação', () => {
    expect(eager('var TOTAL = contar(itens)')).toContain('contar')
  })

  it('apaga corpo de função declarada', () => {
    expect(eager('function f() {\n  return contar()\n}')).not.toContain(
      'contar',
    )
  })

  it('apaga corpo de função com parâmetro desestruturado', () => {
    // A chave de `{ className }` não é o corpo. Confundi-las deixava passar
    // todo componente do bundle.
    const code =
      'function Overlay({ className, ...props }) {\n  return cn(className)\n}'

    expect(eager(code)).not.toContain('cn(')
  })

  it('apaga corpo de arrow com bloco e de arrow de expressão', () => {
    expect(eager('var f = () => {\n  return contar()\n}')).not.toContain(
      'contar',
    )
    expect(
      eager('var rota = { loader: () => contar(), nome: "x" }'),
    ).not.toContain('contar')
  })

  it('a arrow de expressão acaba na vírgula, e o que vem depois volta a contar', () => {
    const code = 'var rota = { loader: () => adiado(), chave: agora() }'
    const result = eager(code)

    expect(result).not.toContain('adiado')
    expect(result).toContain('agora')
  })

  it('não confunde string, template nem comentário com código', () => {
    expect(eager('var s = "contar()"')).not.toContain('contar')
    expect(eager('var s = `contar()`')).not.toContain('contar')
    expect(eager('// contar()\nvar a = 1')).not.toContain('contar')
    expect(eager('/* contar() */\nvar a = 1')).not.toContain('contar')
  })

  it('não confunde literal de expressão regular com divisão', () => {
    // Sem o corte, a barra abriria uma "string" que engoliria o resto do
    // arquivo - e o guarda passaria a não achar nada, em silêncio.
    expect(eager('var re = /contar()/g\nvar total = somar(1)')).toContain(
      'somar',
    )
  })
})
