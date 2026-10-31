import { describe, expect, it } from 'vitest'

import { eagerOnly } from './check-chunk-cycles.mjs'

/**
 * `eagerOnly` separates what runs **during evaluation** of the module from what
 * only runs later. It is the piece that decides whether the cyclic-chunk guard
 * blocks CI or lets the bug through, and it got both wrong before reaching this point:
 *
 * - `function f({ a }) { ... }` - the destructuring brace was read as the
 *   body, and the whole body became evaluation code. Every component with
 *   destructured props became a false positive.
 * - `loader: () => use(x)` - a block-less arrow has no brace to mark the end,
 *   and without handling it separately every route of the app became a false positive.
 *
 * The contract: the return value has the **same length** as the input and keeps
 * the line breaks, so the finding's line number is the file's.
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
    // The brace in `{ className }` is not the body. Confusing them let
    // every component in the bundle through.
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
    // Without the cut, the slash would open a "string" that swallowed the rest of
    // the file - and the guard would find nothing, silently.
    expect(eager('var re = /contar()/g\nvar total = somar(1)')).toContain(
      'somar',
    )
  })
})
