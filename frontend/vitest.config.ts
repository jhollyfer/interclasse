import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Separate from `vite.config.ts` on purpose: the Start and Nitro plugins
// build the application's server environment, and under Vitest that loaded the
// CJS `react` in the module runner ("module is not defined"). Tests only need
// JSX and the `#/*` alias.
//
// Two projects (_doc-lib/vitest.md#projects, #config/isolate): `shared` does not
// isolate the file, which is the suite's biggest time gain and only holds for tests
// without global side effects; `isolated` keeps what swaps modules (`vi.mock`), global
// or DOM and therefore needs its own environment per file
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
