import { z } from 'zod'

import { BASE_LOCALE, type Locale } from './enums/locale.js'
import { SORT_DIRECTIONS } from './enums/sort-direction.js'

/**
 * The house-configured `z`: every `shared/` validator and every local frontend schema
 * comes from here, never from a direct `import { z } from 'zod'`
 * (`_standards/architecture.md` §3, `i18n.md` §3).
 *
 * Rule messages come from Zod's own locale in the screen language
 * (_doc-lib/zod.md#error-customization). What the locale does not say well - empty
 * required text - is the house message, in the three languages.
 */

/** The Zod locale of each product language. */
const ZOD_LOCALES = {
  'pt-BR': z.locales.ptBR,
  es: z.locales.es,
  en: z.locales.en,
} satisfies Record<Locale, () => { localeError: z.core.$ZodErrorMap }>

/** The messages the house writes over the locale, in each language's format. */
type ValidationMessages = {
  readonly required: string
  readonly option: string
  readonly number: string
  readonly integer: string
  readonly email: string
  readonly minLength: (min: number) => string
  readonly maxLength: (max: number) => string
  readonly min: (min: number) => string
  readonly max: (max: number) => string
  readonly maxItems: (max: number) => string
}

/** The messages the house writes over the locale, per language. */
export const VALIDATION_MESSAGES = {
  'pt-BR': {
    required: 'Preencha este campo',
    option: 'Selecione uma opção válida',
    number: 'Informe um número válido',
    integer: 'Informe um número inteiro',
    email: 'Informe um e-mail válido',
    minLength: (min) => `Informe ao menos ${min} caracteres`,
    maxLength: (max) => `Informe no máximo ${max} caracteres`,
    min: (min) => `Informe um valor maior ou igual a ${min}`,
    max: (max) => `Informe um valor menor ou igual a ${max}`,
    maxItems: (max) => `Informe no máximo ${max} itens`,
  },
  es: {
    required: 'Completa este campo',
    option: 'Selecciona una opción válida',
    number: 'Ingresa un número válido',
    integer: 'Ingresa un número entero',
    email: 'Ingresa un correo electrónico válido',
    minLength: (min) => `Ingresa al menos ${min} caracteres`,
    maxLength: (max) => `Ingresa como máximo ${max} caracteres`,
    min: (min) => `Ingresa un valor mayor o igual a ${min}`,
    max: (max) => `Ingresa un valor menor o igual a ${max}`,
    maxItems: (max) => `Incluye como máximo ${max} elementos`,
  },
  en: {
    required: 'Fill in this field',
    option: 'Select a valid option',
    number: 'Enter a valid number',
    integer: 'Enter a whole number',
    email: 'Enter a valid email address',
    minLength: (min) => `Enter at least ${min} characters`,
    maxLength: (max) => `Enter at most ${max} characters`,
    min: (min) => `Enter a value greater than or equal to ${min}`,
    max: (max) => `Enter a value less than or equal to ${max}`,
    maxItems: (max) => `Include at most ${max} items`,
  },
} satisfies Record<Locale, ValidationMessages>

/** The language in force, for house rules that write their own message. */
let activeLocale: Locale = BASE_LOCALE

/**
 * Switches the language of validation messages. The frontend calls it when the
 * language changes; without a call, the base language applies.
 */
export function useValidatorLocale(locale: Locale): void {
  activeLocale = locale
  z.config(ZOD_LOCALES[locale]())
  const messages = VALIDATION_MESSAGES[locale]
  z.config({
    customError: (issue) => {
      // Empty required text arrives as `too_small` with minimum 1: "Fill in this field"
      // says what to do, "Too small: expected 1 character" does not.
      if (issue.code === 'too_small' && issue.origin === 'string') {
        if (issue.minimum === 1) return messages.required
        return messages.minLength(Number(issue.minimum))
      }
      if (issue.code === 'too_big' && issue.origin === 'string')
        return messages.maxLength(Number(issue.maximum))

      // Number limits: only the inclusive one (`min`/`max`) has the house phrase.
      if (
        issue.code === 'too_small' &&
        issue.origin === 'number' &&
        issue.inclusive
      )
        return messages.min(Number(issue.minimum))
      if (
        issue.code === 'too_big' &&
        issue.origin === 'number' &&
        issue.inclusive
      )
        return messages.max(Number(issue.maximum))

      if (issue.code === 'too_big' && issue.origin === 'array')
        return messages.maxItems(Number(issue.maximum))

      // A missing field (`undefined`) is "fill in", not "expected text, received
      // undefined"; a number erased in the input arrives as `NaN`.
      if (issue.code === 'invalid_type') {
        if (issue.input === undefined || issue.input === null)
          return messages.required
        if (typeof issue.input === 'number' && Number.isNaN(issue.input))
          return messages.number
        if (issue.expected === 'int') return messages.integer
      }

      // Closed list (enum) and id: what the user does is choose, not type.
      if (issue.code === 'invalid_value') return messages.option

      if (issue.code === 'invalid_format') {
        if (issue.format === 'uuid') return messages.option
        // A blank e-mail (or other format) is an empty field, not a wrong format.
        if (issue.input === '') return messages.required
        if (issue.format === 'email') return messages.email
      }

      return undefined
    },
  })
}

useValidatorLocale(BASE_LOCALE)

/** List ceilings that both sides enforce the same. */
export const LIST_LIMITS = {
  /** Athletes per team in a sport: the largest squad a classroom enrolls. */
  ATHLETES: 40,
} as const

/**
 * The listing fields, the same on every paginated route. From the query string they
 * arrive as text: `coerce` converts before the rule (_doc-lib/zod.md#api).
 */
export function pageFields() {
  return {
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
  }
}

/** Pagination with text search. */
export function paginationFields() {
  return {
    ...pageFields(),
    search: z.string().trim().max(100).optional(),
  }
}

/** A listing's sort: the columns it accepts, and the direction. */
export function sortFields<
  const TColumns extends readonly [string, ...string[]],
>(columns: TColumns) {
  return {
    sort: z.enum(columns).optional(),
    direction: z.enum(SORT_DIRECTIONS).optional(),
  }
}

/**
 * The athlete list of a sport, whole: it replaces the previous one. No repeated
 * student and capped at `LIST_LIMITS.ATHLETES`.
 */
export function athleteListFields() {
  return {
    sportId: z.uuid(),
    studentIds: z
      .array(z.uuid())
      .max(LIST_LIMITS.ATHLETES)
      .refine((ids) => new Set(ids).size === ids.length),
  }
}

/** The identity rule messages (password and e-mail), per language. */
export const IDENTITY_MESSAGES = {
  'pt-BR': {
    weakPassword:
      'A senha precisa de letra minúscula, maiúscula, número e caractere especial',
    passwordMismatch: 'As senhas não são iguais',
  },
  es: {
    weakPassword:
      'La contraseña necesita minúscula, mayúscula, número y carácter especial',
    passwordMismatch: 'Las contraseñas no coinciden',
  },
  en: {
    weakPassword:
      'The password needs a lowercase letter, an uppercase letter, a number and a special character',
    passwordMismatch: 'The passwords do not match',
  },
} satisfies Record<
  Locale,
  { readonly weakPassword: string; readonly passwordMismatch: string }
>

/** E-mail: format and the database `unique` ceiling. */
export function emailField() {
  return z.email().max(254)
}

/**
 * Password strength: length and one character class per rule. The message comes out
 * in the language in force, read at validation time.
 */
export function passwordField() {
  const weak = { error: () => IDENTITY_MESSAGES[activeLocale].weakPassword }

  return z
    .string()
    .min(8)
    .max(32)
    .regex(/[a-z]/, weak)
    .regex(/[A-Z]/, weak)
    .regex(/[0-9]/, weak)
    .regex(/[^a-zA-Z0-9]/, weak)
}

/**
 * Flags a `passwordConfirmation` different from `password`. It receives both values
 * already read: the object's `refine` passes them, and the rule lives in one place.
 */
export function passwordsMatch(
  password: string | undefined,
  confirmation: string | undefined,
) {
  return password === undefined || password === confirmation
}

/** Options of the `refine` that demands a filled field, with the house message. */
export function requiredIssue(path: ReadonlyArray<string>) {
  return {
    path: [...path],
    error: () => VALIDATION_MESSAGES[activeLocale].required,
  }
}

/** Options of the object `refine` that demands the password confirmation. */
export function passwordMismatchIssue() {
  return {
    path: ['passwordConfirmation'],
    error: () => IDENTITY_MESSAGES[activeLocale].passwordMismatch,
  }
}

export { z }
