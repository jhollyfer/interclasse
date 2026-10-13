/// <reference types="vite/client" />

/**
 * As variáveis de ambiente que este frontend lê, declaradas para o
 * `import.meta.env` não cair no `any` do index signature do Vite.
 *
 * Só entra aqui o que tem o prefixo `VITE_`, e o prefixo não é enfeite: ele é o
 * que manda o Vite embutir o valor no bundle, ou seja, publicá-lo. Segredo
 * nenhum passa por este arquivo.
 *
 * `interface` aqui é module augmentation, o único caso em que o TypeScript não
 * aceita `type`.
 */
interface ImportMetaEnv {
  /** Base da API AdonisJS. Lida e checada em `src/env.ts`. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
