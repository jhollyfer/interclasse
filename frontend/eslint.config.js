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
  // Saída do compilador do Paraglide: gerada, não versionada (_standards/i18n.md §2).
  { ignores: ['src/paraglide/**'] },
  ...tanstackConfig,

  // Os dois plugins pegam a classe de erro que o TypeScript não pega: chave de
  // query incompleta, `queryKey` e `queryFn` declarados soltos em vez de num
  // `queryOptions()`, e ordem de propriedade em `createFileRoute` - que decide
  // se o contexto enriquecido pelo `beforeLoad` aparece tipado no `loader`, e
  // que falha só no tipo, em silêncio.
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
    // `projectService` no lugar do `project: true` do `tanstackConfig`: é o que
    // `_standards/tooling.md` §4 pede para as regras que dependem de tipo.
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parserOptions: { project: null, projectService: true },
    },
  },
  {
    // A ordem de import da régua (`tooling.md` §4): externo, alias `#/`,
    // relativo, com linha em branco entre os grupos. O `import/order` do
    // `tanstackConfig` sai para não brigar com este.
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
    // As regras 1 a 4 do skill `code-pattern`, cobradas pelo compilador em vez
    // de pela disciplina de quem revisa. `lowcodejs` já as tinha; aqui e em
    // `simple-hub` elas viviam só no skill.
    //
    // Só estas quatro entram: são nativas do ESLint e do typescript-eslint. As
    // outras (Merge no lugar de `&`, lookup object no lugar de if/else, e
    // async/await no lugar de cadeia `.then`) precisariam de plugin próprio e
    // seguem cobradas na revisão do diff.
    //
    // Exceção: `routeTree.gen.ts` é gerado. `components/ui/**` segue as mesmas
    // regras (tooling.md §4.2).
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/routeTree.gen.ts'],
    rules: {
      // regra 1: sem ternário como control flow. `??`, `?.` e `&&` seguem livres.
      'no-ternary': 'error',
      // regra 2: sem `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      // regra 3: sem `as`. `as const` continua permitido - ele não mente para o
      // compilador, só pede inferência mais estreita.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      // regra 4: sempre `type`, nunca `interface`. Module augmentation não
      // dispara aqui porque é limite da linguagem, não escolha de estilo - o
      // bloco de `.d.ts` abaixo cobre o caso.
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // sem `!`: o narrowing (`if (!x) return`) é quem prova o não-nulo.
      '@typescript-eslint/no-non-null-assertion': 'error',
      // promessa solta e promessa onde se espera `void` (`tooling.md` §4).
      '@typescript-eslint/consistent-type-imports': 'error',
      '@eslint-community/eslint-comments/require-description': 'error',
      'no-console': 'error',
      'max-lines': [
        'warn',
        { max: 1000, skipBlankLines: true, skipComments: true },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // colaborador vem do container, nunca de `new` (`tooling.md` §4). O
      // `AbortController` sai do seletor: é API da plataforma, não colaborador,
      // e o sufixo casaria por acaso.
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
    // O TypeScript **exige** `interface` para declaration merging; `type` não
    // funciona. É o caso dos `.d.ts` que aumentam biblioteca de terceiro.
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  {
    // O E2E (`tooling.md` §4.2): espera fixa, `networkidle`, teste focado e
    // teste pulado reprovam no lint, não na revisão.
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
    // Arquivos gerados e artefatos de build.
    //
    // `src/routeTree.gen.ts` é saída versionada, não código: o plugin do Router
    // o reescreve a cada mudança em `src/routes`.
    //
    // Nenhum deles está no `include` do tsconfig, e o `parserOptions.project`
    // recusa arquivo que não pertence a projeto nenhum - então cada um vira um
    // erro de parser em vez de um erro de lint. Com `.output/`, isso são
    // centenas de erros depois de um `pnpm build`.
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
