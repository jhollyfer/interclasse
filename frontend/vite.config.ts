import { paraglideVitePlugin } from '@inlang/paraglide-js'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

const config = defineConfig({
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
    nitro({ preset: 'node-server' }),
    tailwindcss(),
    tanstackStart({
      router: {
        routeToken: 'layout',
      },
    }),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

export default config
