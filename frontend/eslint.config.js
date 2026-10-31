//  @ts-check

import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import { tanstackConfig } from '@tanstack/eslint-config'
import pluginQuery from '@tanstack/eslint-plugin-query'
import pluginRouter from '@tanstack/eslint-plugin-router'
import importX from 'eslint-plugin-import-x'
import vitest from '@vitest/eslint-plugin'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import playwright from 'eslint-plugin-playwright'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  // Paraglide compiler output: generated, not versioned (_standards/i18n.md §2).
  { ignores: ['src/paraglide/**'] },
  ...tanstackConfig,

  // The two plugins catch the class of error that TypeScript does not: an
  // incomplete query key, `queryKey` and `queryFn` declared loose instead of in a
  // `queryOptions()`, and property order in `createFileRoute` - which decides
  // whether the context enriched by `beforeLoad` shows up typed in `loader`, and
  // which fails only in the type, silently.
  ...pluginQuery.configs['flat/recommended'],
  ...pluginRouter.configs['flat/recommended'],
  comments.recommended,
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  jsxA11y.flatConfigs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { react },
    rules: {
      '@tanstack/query/prefer-query-options': 'error',
      'react/no-danger': 'error',
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'XSS: renderize pelo React.' },
        {
          property: 'insertAdjacentHTML',
          message: 'XSS: renderize pelo React.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
    },
  },
  {
    // `projectService` in place of `tanstackConfig`'s `project: true`: it is what
    // `_standards/tooling.md` §4 asks for the rules that depend on types.
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parserOptions: { project: null, projectService: true },
    },
  },
  {
    // The house import order (`tooling.md` §4): external, `#/` alias,
    // relative, with a blank line between groups. `tanstackConfig`'s
    // `import/order` is dropped so it does not fight with this one.
    files: ['**/*.{js,ts,tsx}'],
    plugins: { 'import-x': importX },
    rules: {
      'import-x/order': [
        'error',
        {
          groups: [
            ['builtin', 'external'],
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          pathGroups: [
            { pattern: '#/**', group: 'internal' },
            { pattern: '@interclasse/**', group: 'internal' },
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
    },
  },
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    // Rules 1 to 4 of the `code-pattern` skill, enforced by the compiler instead
    // of by the discipline of whoever reviews. `lowcodejs` already had them; here and in
    // `simple-hub` they lived only in the skill.
    //
    // Only these four enter: they are native to ESLint and typescript-eslint. The
    // others (Merge in place of `&`, lookup object in place of if/else, and
    // async/await in place of a `.then` chain) would need a plugin of their own and
    // remain enforced in the diff review.
    //
    // Exception: `routeTree.gen.ts` is generated. `components/ui/**` follows the same
    // rules (tooling.md §4.2).
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/routeTree.gen.ts'],
    rules: {
      // rule 1: no ternary as control flow. `??`, `?.` and `&&` remain free.
      'no-ternary': 'error',
      // rule 2: no `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      // rule 3: no `as`. `as const` remains allowed - it does not lie to the
      // compiler, it only asks for narrower inference.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      // rule 4: always `type`, never `interface`. Module augmentation does not
      // trigger here because it is a language limit, not a style choice - the
      // `.d.ts` block below covers the case.
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // no `!`: narrowing (`if (!x) return`) is what proves non-null.
      '@typescript-eslint/no-non-null-assertion': 'error',
      // a floating promise, and a promise where `void` is expected (`tooling.md` §4).
      '@typescript-eslint/consistent-type-imports': 'error',
      '@eslint-community/eslint-comments/require-description': 'error',
      'no-console': 'error',
      'max-lines': [
        'warn',
        { max: 1000, skipBlankLines: true, skipComments: true },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // the collaborator comes from the container, never from `new` (`tooling.md` §4). The
      // `AbortController` is removed from the selector: it is a platform API, not a collaborator,
      // and the suffix would match by accident.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "NewExpression[callee.name=/(Service|UseCase|Policy|Controller|Repository|Seeder)$/]:not([callee.name='AbortController'])",
          message:
            'Colaborador vem do container, não de `new`. Injete por construtor. ' +
            'Composition root de verdade: mova para lá com um override de `files`.',
        },
      ],
    },
  },
  {
    // TypeScript **requires** `interface` for declaration merging; `type` does not
    // work. It is the case of the `.d.ts` files that augment a third-party library.
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  {
    // E2E (`tooling.md` §4.2): fixed waits, `networkidle`, focused tests and
    // skipped tests fail in lint, not in review.
    files: ['e2e/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'error',
    },
  },
  {
    // Generated files and build artifacts.
    //
    // `src/routeTree.gen.ts` is versioned output, not code: the Router plugin
    // rewrites it on every change in `src/routes`.
    //
    // None of them is in the tsconfig `include`, and `parserOptions.project`
    // refuses a file that belongs to no project - so each one becomes a
    // parser error instead of a lint error. With `.output/`, that is
    // hundreds of errors after a `pnpm build`.
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'src/routeTree.gen.ts',
      '.output/**',
      '.tanstack/**',
      'test-results/**',
      'playwright-report/**',
      '*.tmp.cjs',
    ],
  },
]
