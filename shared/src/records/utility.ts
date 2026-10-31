/**
 * The merge of two object types into a single, flattened one: `&` leaves the raw
 * intersection in the hover and in the error message (`_standards/typescript.md`).
 */
export type Merge<A, B> = { [K in keyof (A & B)]: (A & B)[K] }
