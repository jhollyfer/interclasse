import { paraglideVitePlugin } from '@inlang/paraglide-js'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

const config = defineConfig(() => {
  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      // The three languages (_standards/i18n.md §2). The compiler options live in
      // `project.inlang/paraglide.config.ts`, read by this plugin and by the CLI
      // (_doc-lib/paraglide.md#/vite).
      paraglideVitePlugin({ project: './project.inlang' }),
      // The options go straight into the plugin, which is the form the type declares:
      // `nitro(pluginConfig?: NitroPluginConfig)` with `NitroPluginConfig extends
      // NitroConfig` (nitro/dist/vite.d.mts).
      //
      // The old form here, `nitro({ config: { preset } })`, applied the preset
      // all the same - `dist/vite.mjs` builds the config with
      // `defu(pluginConfig, pluginConfig.config, userConfig.nitro)`, so the
      // `config` key is read at runtime. It just is not in the type, and that is what
      // left `tsc` red with TS2353.
      //
      // Pinning the preset still holds: without it Nitro detects the platform from the
      // CI environment variables - Vercel, Netlify, Cloudflare and five more identify
      // themselves - and only falls back to `node-server` when none answers.
      // It is what `Dockerfile-production` expects.
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
  }
})

export default config
