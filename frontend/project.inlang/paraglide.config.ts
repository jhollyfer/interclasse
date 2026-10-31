import { defineConfig } from '@inlang/paraglide-js'

/**
 * Opções do compilador do Paraglide, lidas pelo plugin do Vite e pela CLI
 * (`i18n:compile`): uma config só, para as duas não divergirem
 * (_doc-lib/paraglide.md#/vite, https://paraglidejs.com/vite).
 *
 * A estratégia é declarada: o padrão do compilador inclui `globalVariable`, que
 * vaza o idioma entre requisições no servidor (_doc-lib/paraglide.md#/strategy,
 * #/tanstack-start). `url` dá pt-BR sem prefixo e `/es`, `/en` com prefixo.
 */
export default defineConfig({
  outdir: './src/paraglide',
  strategy: ['url', 'baseLocale'],
})
