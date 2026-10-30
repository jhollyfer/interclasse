import { CATEGORY, GRADES, left, right, type Category, type Either } from '@interclasse/shared'

import type { ClassroomError } from './classroom.errors.ts'

export type ClassroomProps = {
  readonly id: string
  name: string
  grade: number
  category: Category
  advisorId: string | null
  representativeId: string | null
  readonly createdAt: Date
  updatedAt: Date | null
}

/** Os vínculos de pessoa de uma turma. */
export type ClassroomLinks = {
  readonly advisorId?: string | null
  readonly representativeId?: string | null
}

type ClassroomChanges = ClassroomLinks & {
  readonly name?: string
  readonly grade?: number
}

/**
 * O que o banco sabe de uma conta indicada: `exists` é conta viva com o papel do
 * vínculo (sem isso, um representante indicado como conselheiro ganharia o
 * cadastro de alunos da turma inteira); `taken` é conta já ligada a outra turma.
 */
export type ClassroomLinkFacts = { readonly exists: boolean; readonly taken: boolean }

export type ClassroomPeopleFacts = {
  readonly advisor?: ClassroomLinkFacts
  readonly representative?: ClassroomLinkFacts
}

/** Fato que falta é conta que não existe: a recusa é a saída segura. */
const MISSING = { exists: false, taken: false } satisfies ClassroomLinkFacts

/**
 * A turma: a unidade que compete. Guarda a categoria derivada do ano, o travamento
 * depois do sorteio e as regras dos vínculos de conselheiro e representante
 * (`_standards/domain.md` §1).
 */
export class Classroom {
  private constructor(private readonly props: ClassroomProps) {}

  /**
   * A categoria que o ano determina. Derivada, nunca enviada pelo cliente: um 9º
   * ano gravado como `F1` jogaria contra crianças de 8 anos.
   */
  static categoryOf(grade: number): Category {
    if (grade <= 5) return CATEGORY.F1

    return CATEGORY.F2
  }

  /** Nascimento. O id e o relógio chegam de fora: o domínio não faz I/O. */
  static create(
    input: {
      readonly id: string
      readonly name: string
      readonly grade: number
      readonly advisorId?: string | null
      readonly representativeId?: string | null
      readonly now: Date
    },
    facts: ClassroomPeopleFacts,
  ): Either<ClassroomError, Classroom> {
    if (!Classroom.gradeInRange(input.grade)) return left({ code: 'CLASSROOM_INVALID_GRADE' })

    const advisorId = input.advisorId ?? null
    const representativeId = input.representativeId ?? null
    const refused = Classroom.refusePeople({ advisorId, representativeId }, facts)
    if (refused) return left(refused)

    return right(
      new Classroom({
        id: input.id,
        name: input.name,
        grade: input.grade,
        category: Classroom.categoryOf(input.grade),
        advisorId,
        representativeId,
        createdAt: input.now,
        // Nasce com a edição carimbada, como a linha do banco nasce.
        updatedAt: input.now,
      }),
    )
  }

  /** Reidratação pelo repository: o dado passou pelas invariantes ao ser gravado. */
  static restore(props: ClassroomProps): Classroom {
    return new Classroom({ ...props })
  }

  /**
   * Renomeia, muda o ano e os vínculos. Na edição só se confere o vínculo que
   * mudou: o que já estava gravado foi aceito quando entrou, e recusá-lo agora
   * travaria até renomear a turma. Nada muda quando devolve `left`.
   */
  update(
    changes: ClassroomChanges,
    context: {
      readonly facts: ClassroomPeopleFacts
      readonly inCompetition: boolean
      readonly now: Date
    },
  ): Either<ClassroomError, Classroom> {
    const grade = changes.grade ?? this.props.grade
    if (!Classroom.gradeInRange(grade)) return left({ code: 'CLASSROOM_INVALID_GRADE' })

    const refused = Classroom.refusePeople(this.changedLinks(changes), context.facts)
    if (refused) return left(refused)

    // Mudar de categoria com a turma numa chave a deixaria jogando contra a
    // categoria errada.
    const category = Classroom.categoryOf(grade)
    if (category !== this.props.category && context.inCompetition)
      return left({ code: 'CLASSROOM_CATEGORY_LOCKED' })

    this.props.name = changes.name ?? this.props.name
    this.props.grade = grade
    this.props.category = category
    if (changes.advisorId !== undefined) this.props.advisorId = changes.advisorId
    if (changes.representativeId !== undefined)
      this.props.representativeId = changes.representativeId
    this.props.updatedAt = context.now

    return right(this)
  }

  /** Apagar com a turma numa chave sorteada recusa; sem time, libera. */
  remove(context: { readonly inCompetition: boolean }): Either<ClassroomError, Classroom> {
    if (context.inCompetition) return left({ code: 'CLASSROOM_IN_COMPETITION' })

    return right(this)
  }

  /** Se o nome muda com estas mudanças: só aí vale conferir duplicidade. */
  renamesTo(name: string | undefined): name is string {
    return name !== undefined && name !== this.props.name
  }

  /** Se o ano levaria a turma a outra categoria: só aí vale perguntar do sorteio. */
  changesCategoryWith(grade: number | undefined): boolean {
    if (grade === undefined) return false

    return Classroom.categoryOf(grade) !== this.props.category
  }

  /** Os vínculos novos a conferir: os que mudam para uma conta, e não para `null`. */
  changedLinks(changes: ClassroomLinks): { advisorId?: string; representativeId?: string } {
    const links: { advisorId?: string; representativeId?: string } = {}

    if (changes.advisorId && changes.advisorId !== this.props.advisorId)
      links.advisorId = changes.advisorId
    if (changes.representativeId && changes.representativeId !== this.props.representativeId)
      links.representativeId = changes.representativeId

    return links
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<ClassroomProps> {
    return { ...this.props }
  }

  private static gradeInRange(grade: number): boolean {
    return grade >= GRADES.MIN && grade <= GRADES.MAX
  }

  /** A primeira recusa dos vínculos, na ordem em que a tela os pergunta. */
  private static refusePeople(
    links: ClassroomLinks,
    facts: ClassroomPeopleFacts,
  ): ClassroomError | null {
    if (links.advisorId) {
      const advisor = facts.advisor ?? MISSING
      if (!advisor.exists) return { code: 'ADVISOR_NOT_FOUND' }
      if (advisor.taken) return { code: 'ADVISOR_TAKEN' }
    }

    if (links.representativeId) {
      const representative = facts.representative ?? MISSING
      if (!representative.exists) return { code: 'REPRESENTATIVE_NOT_FOUND' }
      if (representative.taken) return { code: 'REPRESENTATIVE_TAKEN' }
    }

    return null
  }
}
