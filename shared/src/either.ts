/**
 * O resultado de uma operação que pode falhar por regra de negócio: `left` é a
 * falha esperada, `right` o sucesso. Falha de negócio é valor, não `throw`
 * (`_standards/backend.md` §4.2) - o `throw` fica para o bug.
 *
 * Mora no `shared/` porque value object, entidade e use-case devolvem o mesmo
 * tipo, e o frontend lê os value objects daqui.
 */
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
