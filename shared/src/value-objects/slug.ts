/**
 * O identificador de URL derivado de um nome: "Tênis de mesa" vira
 * `tenis-de-mesa`. Puro, e por isso no `shared/`: os dois lados derivam igual
 * (`_standards/domain.md` §3).
 */
export class Slug {
  /** O teto da coluna `slug`. */
  static readonly MAX_LENGTH = 255

  private constructor(readonly value: string) {}

  static from(name: string): Slug {
    const slug = name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, Slug.MAX_LENGTH)
      .replace(/-+$/, '')

    return new Slug(slug)
  }

  equals(other: Slug): boolean {
    return this.value === other.value
  }
}
