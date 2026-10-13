import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Separado do `vite.config.ts` de propósito: os plugins do Start e do Nitro
// montam o ambiente de servidor da aplicação, e sob o Vitest isso carregava o
// `react` CJS no module runner ("module is not defined"). Teste só precisa de
// JSX e do alias `#/*`.
export default defineConfig({
  plugins: [viteReact()],
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
