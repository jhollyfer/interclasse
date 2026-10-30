// O bloco comum de _standards/tooling.md §4.1, igual ao dos apps. O `shared/`
// só tem código puro: sem container, sem Vine, sem arquivo gerado.
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import { defineConfig } from 'eslint/config'
import importX from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'

// Allowlist de `new` por símbolo (backend.md §2.1). Vazia, o `:not` vira `^()$`,
// que não casa com nome nenhum.
const NEW_ALLOWLIST = []

const NEW_SELECTOR =
  'NewExpression[callee.name=/(Service|UseCase|Policy|Controller|Repository|Seeder)$/]' +
  `:not([callee.name=/^(${NEW_ALLOWLIST.join('|')})$/])`

// Uma lib por papel (tooling.md §0.1). `paths` casa o nome exato; o subcaminho
// só cai em `patterns`.
const OUTSIDE_THE_HOUSE = [
  { name: 'date-fns', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  { name: 'dayjs', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  { name: 'moment', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  {
    name: 'lucide-react',
    message: 'Ícone: @phosphor-icons/react (tooling.md §0.1).',
  },
  {
    name: 'react-icons',
    message: 'Ícone: @phosphor-icons/react (tooling.md §0.1).',
  },
  {
    name: '@tabler/icons-react',
    message: 'Ícone: @phosphor-icons/react (tooling.md §0.1).',
  },
  {
    name: 'yup',
    message: 'Schema: Zod, ou VineJS só no backend Adonis (tooling.md §0.1).',
  },
  { name: 'react-markdown', message: 'Markdown: Tiptap (tooling.md §0.1).' },
  { name: 'marked', message: 'Markdown: Tiptap (tooling.md §0.1).' },
  { name: 'markdown-it', message: 'Markdown: Tiptap (tooling.md §0.1).' },
]

const OUTSIDE_PATTERNS = [
  {
    group: [
      'date-fns/*',
      'dayjs/*',
      'moment/*',
      'lucide-react/*',
      'react-icons/*',
      '@tabler/icons-react/*',
      'yup/*',
      'remark-*',
      'rehype-*',
    ],
    message: 'Biblioteca fora da casa (tooling.md §0.1).',
  },
]

// VineJS só no backend Adonis (tooling.md §0.1).
const VINE_PATH = {
  name: '@vinejs/vine',
  message: 'Schema: Zod; VineJS só no backend Adonis (tooling.md §0.1).',
}

export default defineConfig([
  // Saída do `tsc` e configs que não pertencem ao projeto do tsconfig.
  {
    ignores: [
      'dist/**',
      'eslint.config.js',
      'prettier.config.js',
      'vitest.config.ts',
    ],
  },
  ...tseslint.configs.recommendedTypeChecked,
  comments.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'import-x': importX },
    rules: {
      // sem ternário: `if` clássico ou lookup (typescript.md §13). `??`, `?.` e `&&` seguem livres.
      'no-ternary': 'error',
      // sem `any`: `unknown` e narrowing na fronteira (typescript.md §2.1).
      '@typescript-eslint/no-explicit-any': 'error',
      // sem `as`; `as const` continua permitido pelo `assertionStyle: 'never'`.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      // sem `!`: narrowing no topo da função.
      '@typescript-eslint/no-non-null-assertion': 'error',
      // sempre `type`, nunca `interface` (declaration merging: override de `*.d.ts` abaixo).
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // autofix de `import type`; convive com `verbatimModuleSyntax` (tooling.md §3).
      '@typescript-eslint/consistent-type-imports': 'error',
      // promise solta é rejeição sem dono; promise onde se espera void é erro silencioso.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // externo → alias interno (`@interclasse/shared`) → relativo, linha em branco entre grupos.
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          pathGroups: [
            { pattern: '#**', group: 'internal' },
            { pattern: '@interclasse/**', group: 'internal' },
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      // `eslint-disable` sem motivo ao lado não passa (tooling.md §10.2).
      '@eslint-community/eslint-comments/require-description': 'error',
      // logger do framework, nunca `console` (backend.md §4.2).
      'no-console': 'error',
      // arquivo que cresce além disto pede divisão (opinião da casa); `warn` só reprova
      // porque o script de lint roda com `--max-warnings 0`.
      'max-lines': [
        'warn',
        { max: 1000, skipBlankLines: true, skipComments: true },
      ],
      // `shared/` nunca importa VineJS (nem subpath); o `zod` não é restrito.
      'no-restricted-imports': [
        'error',
        {
          paths: [...OUTSIDE_THE_HOUSE, VINE_PATH],
          patterns: [
            ...OUTSIDE_PATTERNS,
            { group: ['@vinejs/vine/*'], message: VINE_PATH.message },
          ],
        },
      ],
      // colaborador vem do container, nunca de `new` (backend.md §2.1).
      'no-restricted-syntax': [
        'error',
        {
          selector: NEW_SELECTOR,
          message:
            'Colaborador vem do container: injete por construtor (backend.md §2.1).',
        },
      ],
      // `.pipe()` não propaga erro nem destrói os streams quando um falha (backend.md §5.6).
      'no-restricted-properties': [
        'error',
        {
          property: 'pipe',
          message: 'Use pipeline de node:stream/promises (backend.md §5.6).',
        },
      ],
      'no-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/no-implied-eval': 'error',
    },
  },
  {
    // declaration merging exige `interface`: limite da linguagem, não estilo.
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/consistent-type-definitions': 'off' },
  },
  {
    // o unitário instancia o use-case com a implementação em memória (DECISIONS.md #116).
    files: ['**/*.unit.spec.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
])
