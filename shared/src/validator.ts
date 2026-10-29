import { z } from 'zod'

import { BASE_LOCALE, type Locale } from './enums/locale.js'

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

/**
 * Troca o idioma das mensagens de validação. O frontend chama ao trocar de
 * idioma; sem chamada, vale o idioma base.
 */
export function useValidatorLocale(locale: Locale): void {
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

export { z }
