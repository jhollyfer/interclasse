/**
 * The result of an operation that can fail on a business rule: `left` is the
 * expected failure, `right` the success. A business failure is a value, not a `throw`
 * (`_standards/backend.md` §4.2) - `throw` is for bugs.
 *
 * Lives in `shared/` because value objects, entities and use cases return the same
 * type, and the frontend reads the value objects from here.
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
