/// <reference types="vite/client" />

/**
 * The environment variables this frontend reads, declared so
 * `import.meta.env` does not fall into the `any` of Vite's index signature.
 *
 * Only what has the `VITE_` prefix goes here, and the prefix is not decoration: it is
 * what tells Vite to embed the value in the bundle, that is, to publish it. No
 * secret goes through this file.
 *
 * `interface` here is module augmentation, the only case where TypeScript does
 * not accept `type`.
 */
interface ImportMetaEnv {
  /** AdonisJS API base. Read and checked in `src/env.ts`. */
  readonly VITE_API_URL?: string
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
