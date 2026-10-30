/**
 * A junção de dois tipos de objeto num tipo só, achatado: o `&` deixa a
 * interseção crua no hover e na mensagem de erro (`_standards/typescript.md`).
 */
export type Merge<A, B> = { [K in keyof (A & B)]: (A & B)[K] }
