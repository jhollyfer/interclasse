import { createServerFn } from '@tanstack/react-start'

/**
 * O ambiente em que o site roda, lido do servidor por requisição
 * (`SITE_ENV`, sem `VITE_`: nunca vai para o bundle). Só `production` entra
 * nos buscadores; staging, preview e desenvolvimento respondem `noindex` e
 * `Disallow: /` (`frontend.md` §9.7). Não depende de `import.meta.env.PROD`:
 * a imagem de staging é a mesma de produção, buildada em modo produção.
 * _doc-lib/tanstack-start.md#guide/server-functions.
 */
export const isIndexable = createServerFn({ method: 'GET' }).handler(
  (): boolean => process.env.SITE_ENV === 'production',
)
