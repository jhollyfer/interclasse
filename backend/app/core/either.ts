/**
 * Either - o resultado de uma operação que pode falhar, como VALOR de retorno
 * em vez de exceção. `Left` carrega o erro, `Right` carrega o sucesso.
 *
 * `isLeft()` e `isRight()` são type guards: dentro do `if`, o TypeScript sabe
 * de qual lado está e estreita o tipo de `value` sozinho. Sem o `this is`, o
 * estreitamento não acontece e todo use-case precisaria de um cast para ler
 * `value` - que é exatamente a mentira ao compilador que este tipo evita.
 */

// ERRO
export class Left<L, R> {
  readonly value: L

  constructor(value: L) {
    this.value = value
  }

  isRight(): this is Right<L, R> {
    return false
  }

  isLeft(): this is Left<L, R> {
    return true
  }
}

// SUCESSO
export class Right<L, R> {
  readonly value: R

  constructor(value: R) {
    this.value = value
  }

  isRight(): this is Right<L, R> {
    return true
  }

  isLeft(): this is Left<L, R> {
    return false
  }
}

export type Either<L, R> = Left<L, R> | Right<L, R>

export const left = <L, R>(value: L): Either<L, R> => {
  return new Left(value)
}

export const right = <L, R>(value: R): Either<L, R> => {
  return new Right(value)
}
