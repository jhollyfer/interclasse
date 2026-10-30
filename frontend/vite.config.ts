import { paraglideVitePlugin } from '@inlang/paraglide-js'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, loadEnv } from 'vite'

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Os cabeçalhos de segurança do servidor do frontend (`frontend.md` §3.3):
  // o Nitro não manda nenhum por padrão, e sem `frame-ancestors` a tela de
  // login pode ser embutida em `iframe` por outro site. `connect-src` e
  // `img-src` abrem só a API e, com upload pré-assinado, a origem pública do
  // storage (`VITE_STORAGE_URL`). `unsafe-inline` em script e estilo porque o
  // Start escreve os scripts de hidratação inline e não emite nonce.
  // Só em build de produção: o dev server precisa de websocket e eval do HMR.
  // _doc-lib/nitro.md#config; https://nitro.build/docs/routing (route rules).
  const origins = ["'self'", env.VITE_API_URL, env.VITE_STORAGE_URL]
    .filter(Boolean)
    .join(' ')
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${origins} data: blob:`,
    "font-src 'self' data:",
    `connect-src ${origins}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')

  let securityHeaders = {}
  if (mode === 'production') {
    securityHeaders = {
      '/**': {
        headers: {
          'Content-Security-Policy': csp,
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          // Sem `preload`: entrar na lista é compromisso que não se desfaz.
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        },
      },
    }
  }

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      // Os três idiomas (_standards/i18n.md §2): a URL é a fonte da verdade, com o
      // pt-BR sem prefixo e `/es`, `/en` com prefixo. A estratégia é declarada: o
      // padrão do compilador inclui `globalVariable`, que vaza o idioma entre
      // requisições no servidor (_doc-lib/paraglide.md#/strategy, #/tanstack-start).
      paraglideVitePlugin({
        project: './project.inlang',
        outdir: './src/paraglide',
        strategy: ['url', 'baseLocale'],
      }),
      // As opções vão direto no plugin, que é a forma que o tipo declara:
      // `nitro(pluginConfig?: NitroPluginConfig)` com `NitroPluginConfig extends
      // NitroConfig` (nitro/dist/vite.d.mts).
      //
      // A forma antiga daqui, `nitro({ config: { preset } })`, aplicava o preset
      // igual - `dist/vite.mjs` monta a config com
      // `defu(pluginConfig, pluginConfig.config, userConfig.nitro)`, então a
      // chave `config` é lida em runtime. Ela só não consta no tipo, e era isso
      // que deixava o `tsc` vermelho com TS2353.
      //
      // Cravar o preset segue valendo: sem ele o Nitro detecta a plataforma pelas
      // variáveis de ambiente do CI - Vercel, Netlify, Cloudflare e mais cinco se
      // identificam sozinhas - e só cai em `node-server` quando nenhuma responde.
      // É o que o `Dockerfile-production` espera.
      nitro({ preset: 'node-server', routeRules: securityHeaders }),
      tailwindcss(),
      tanstackStart({
        router: {
          routeToken: 'layout',
        },
      }),
      viteReact(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
  }
})

export default config
