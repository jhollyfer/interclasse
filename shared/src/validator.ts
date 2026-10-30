import { z } from 'zod'

import { BASE_LOCALE, type Locale } from './enums/locale.js'
import { SORT_DIRECTIONS } from './enums/sort-direction.js'

/**
 * O `z` configurado da casa: todo validator do `shared/` e todo schema local do
 * frontend saem daqui, nunca de `import { z } from 'zod'` direto
 * (`_standards/architecture.md` §3, `i18n.md` §3).
 *
 * As mensagens das regras vêm do locale do próprio Zod no idioma da tela
 * (_doc-lib/zod.md#error-customization). O que o locale não diz bem - texto
 * obrigatório vazio - é a mensagem da casa, nos três idiomas.
 */

/** O locale do Zod de cada idioma do produto. */
const ZOD_LOCALES = {
  'pt-BR': z.locales.ptBR,
  es: z.locales.es,
  en: z.locales.en,
} satisfies Record<Locale, () => { localeError: z.core.$ZodErrorMap }>

/** As mensagens que a casa escreve por cima do locale, no formato de cada idioma. */
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

/** As mensagens que a casa escreve por cima do locale, por idioma. */
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

/** O idioma em vigor, para as regras da casa que escrevem a própria mensagem. */
let activeLocale: Locale = BASE_LOCALE

/**
 * Troca o idioma das mensagens de validação. O frontend chama ao trocar de
 * idioma; sem chamada, vale o idioma base.
 */
export function useValidatorLocale(locale: Locale): void {
  activeLocale = locale
  z.config(ZOD_LOCALES[locale]())
  const messages = VALIDATION_MESSAGES[locale]
  z.config({
    customError: (issue) => {
      // Texto obrigatório vazio chega como `too_small` com mínimo 1: "Preencha
      // este campo" diz o que fazer, "Muito pequeno: esperado 1 caractere" não.
      if (issue.code === 'too_small' && issue.origin === 'string') {
        if (issue.minimum === 1) return messages.required
        return messages.minLength(Number(issue.minimum))
      }
      if (issue.code === 'too_big' && issue.origin === 'string')
        return messages.maxLength(Number(issue.maximum))

      // Limites de número: só o inclusivo (`min`/`max`) tem a frase da casa.
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

      // Campo sem valor (`undefined`) é "preencha", não "esperava texto,
      // recebeu undefined"; número apagado no input chega como `NaN`.
      if (issue.code === 'invalid_type') {
        if (issue.input === undefined || issue.input === null)
          return messages.required
        if (typeof issue.input === 'number' && Number.isNaN(issue.input))
          return messages.number
        if (issue.expected === 'int') return messages.integer
      }

      // Lista fechada (enum) e id: o que o usuário faz é escolher, não digitar.
      if (issue.code === 'invalid_value') return messages.option

      if (issue.code === 'invalid_format') {
        if (issue.format === 'uuid') return messages.option
        // E-mail (ou outro formato) em branco é campo vazio, não formato errado.
        if (issue.input === '') return messages.required
        if (issue.format === 'email') return messages.email
      }

      return undefined
    },
  })
}

useValidatorLocale(BASE_LOCALE)

/** Tetos de lista que os dois lados cobram igual. */
export const LIST_LIMITS = {
  /** Atletas por time numa modalidade: o maior elenco que uma turma inscreve. */
  ATHLETES: 40,
} as const

/**
 * Os campos de listagem, iguais em toda rota que pagina. Da query string chegam
 * como texto: `coerce` converte antes da regra (_doc-lib/zod.md#api).
 */
export function pageFields() {
  return {
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
  }
}

/** Paginação com busca por texto. */
export function paginationFields() {
  return {
    ...pageFields(),
    search: z.string().trim().max(100).optional(),
  }
}

/** A ordenação de uma listagem: as colunas que ela aceita, e o sentido. */
export function sortFields<
  const TColumns extends readonly [string, ...string[]],
>(columns: TColumns) {
  return {
    sort: z.enum(columns).optional(),
    direction: z.enum(SORT_DIRECTIONS).optional(),
  }
}

/**
 * A lista de atletas de uma modalidade, inteira: substitui a anterior. Sem
 * aluno repetido e com o teto de `LIST_LIMITS.ATHLETES`.
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

/** As mensagens das regras de identidade (senha e e-mail), por idioma. */
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

/** E-mail: formato e o teto do `unique` do banco. */
export function emailField() {
  return z.email().max(254)
}

/**
 * Força da senha: tamanho e uma classe de caractere por regra. A mensagem sai
 * no idioma em vigor, lida na hora da validação.
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
 * Acusa `passwordConfirmation` diferente de `password`. Recebe os dois valores
 * já lidos: o `refine` do objeto os passa, e a regra fica num lugar só.
 */
export function passwordsMatch(
  password: string | undefined,
  confirmation: string | undefined,
) {
  return password === undefined || password === confirmation
}

/** Opções do `refine` que cobra um campo preenchido, na mensagem da casa. */
export function requiredIssue(path: ReadonlyArray<string>) {
  return {
    path: [...path],
    error: () => VALIDATION_MESSAGES[activeLocale].required,
  }
}

/** Opções do `refine` de objeto que cobra a confirmação da senha. */
export function passwordMismatchIssue() {
  return {
    path: ['passwordConfirmation'],
    error: () => IDENTITY_MESSAGES[activeLocale].passwordMismatch,
  }
}

export { z }
