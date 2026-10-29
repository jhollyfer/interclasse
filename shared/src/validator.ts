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

/** As mensagens que a casa escreve por cima do locale, por idioma. */
export const VALIDATION_MESSAGES = {
  'pt-BR': { required: 'Preencha este campo' },
  es: { required: 'Completa este campo' },
  en: { required: 'Fill in this field' },
} satisfies Record<Locale, { readonly required: string }>

/** O idioma em vigor, para as regras da casa que escrevem a própria mensagem. */
let activeLocale: Locale = BASE_LOCALE

/**
 * Troca o idioma das mensagens de validação. O frontend chama ao trocar de
 * idioma; sem chamada, vale o idioma base.
 */
export function useValidatorLocale(locale: Locale): void {
  activeLocale = locale
  z.config(ZOD_LOCALES[locale]())
  z.config({
    customError: (issue) => {
      // Texto obrigatório vazio chega como `too_small` com mínimo 1: "Preencha
      // este campo" diz o que fazer, "Muito pequeno: esperado 1 caractere" não.
      if (issue.code === 'too_small' && issue.origin === 'string' && issue.minimum === 1)
        return VALIDATION_MESSAGES[locale].required

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
export function sortFields<const TColumns extends readonly [string, ...string[]]>(
  columns: TColumns,
) {
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
    weakPassword: 'A senha precisa de letra minúscula, maiúscula, número e caractere especial',
    passwordMismatch: 'As senhas não são iguais',
  },
  es: {
    weakPassword: 'La contraseña necesita minúscula, mayúscula, número y carácter especial',
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
export function passwordsMatch(password: string | undefined, confirmation: string | undefined) {
  return password === undefined || password === confirmation
}

/** Opções do `refine` de objeto que cobra a confirmação da senha. */
export function passwordMismatchIssue() {
  return {
    path: ['passwordConfirmation'],
    error: () => IDENTITY_MESSAGES[activeLocale].passwordMismatch,
  }
}

export { z }
