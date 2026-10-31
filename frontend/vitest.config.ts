import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Separado do `vite.config.ts` de propósito: os plugins do Start e do Nitro
// montam o ambiente de servidor da aplicação, e sob o Vitest isso carregava o
// `react` CJS no module runner ("module is not defined"). Teste só precisa de
// JSX e do alias `#/*`.
//
// Dois projetos (_doc-lib/vitest.md#projects, #config/isolate): o `shared` não
// isola o arquivo, que é o maior ganho de tempo da suíte e só vale para teste
// sem efeito global; o `isolated` guarda o que troca módulo (`vi.mock`), global
// ou DOM e por isso precisa de ambiente próprio por arquivo
// (_doc-lib/vitest.md#improving-performance, `tooling.md` §10.6).
const STATEFUL = [
  'src/env.test.ts',
  'src/hooks/**/*.test.ts',
  'src/integrations/**/*.test.ts',
  'src/lib/form-errors.test.ts',
  'src/lib/local-store.test.ts',
  'src/lib/theme.test.ts',
  'src/lib/upload-resume.test.ts',
  'src/lib/upload-transport.test.ts',
]

export default defineConfig({
  plugins: [viteReact()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        test: {
          name: 'shared',
          isolate: false,
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
          exclude: STATEFUL,
        },
      },
      {
        test: {
          name: 'isolated',
          include: ['src/**/*.test.tsx', ...STATEFUL],
        },
      },
    ],
  },
})
