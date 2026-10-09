import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
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
