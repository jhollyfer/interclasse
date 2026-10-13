import { configApp } from '@adonisjs/eslint-config'
import importX from 'eslint-plugin-import-x'

/**
 * Arquivo gerado não se linta: a correção some na próxima geração.
 *
 * - `database/schema.ts` sai de `node ace migration:run` e traz "DO NOT EDIT
 *   manually" no topo.
 * - `.adonisjs/` é o registry do Tuyau, escrito por `indexEntities()` +
 *   `generateRegistry()` no hook de init.
 * - `build/` é a saída do `node ace build`.
 *
 * Precisa ser um objeto próprio no array: no flat config, um objeto só com
 * `ignores` é ignore global.
 */
const generated = { ignores: ['database/schema.ts', '.adonisjs/**', 'build/**'] }

/**
 * As regras de escrita da régua (_padroes/tooling.md §4, backend.md §2), cobradas
 * por lint em vez de por leitura de diff. `Merge` em vez de `&`, lookup object e
 * `async/await` não têm regra nativa e ficam na revisão.
 */
const style = {
  files: ['**/*.ts'],
  rules: {
    // Sem ternário: `if` clássico. `??`, `?.` e `&&` seguem livres.
    'no-ternary': 'error',
    // Sem `any` desnecessário: `unknown` + narrowing.
    '@typescript-eslint/no-explicit-any': 'error',
    // Sem `as`; `as const` continua permitido.
    '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    // Sempre `type`, nunca `interface` (declaration merging fica no bloco abaixo).
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    // Sem `!` non-null: o tipo se estreita com guarda (_padroes/typescript.md §1).
    '@typescript-eslint/no-non-null-assertion': 'error',
  },
}

/**
 * Regras que dependem de tipo. `no-floating-promises` pega a rejeição sem dono -
 * a causa mais comum de processo caindo sem log - e `no-misused-promises` a
 * promise onde se espera `void`. `projectService` deixa o parser achar o
 * `tsconfig.json` de cada arquivo sozinho.
 *
 * O query builder do Lucid estende `Promise` só para poder ser aguardado, e é
 * montado por mutação (`query.where(...)` sem `await`): ele é declarado como
 * thenable seguro em vez de a regra virar ruído.
 */
const LUCID_BUILDERS = [
  'ModelQueryBuilderContract',
  'DatabaseQueryBuilderContract',
  'ExcutableQueryBuilderContract',
  'RelationQueryBuilderContract',
  'RelationSubQueryBuilderContract',
  'HasManyQueryBuilderContract',
  'HasManyThroughQueryBuilderContract',
  'ManyToManyQueryBuilderContract',
  'ManyToManySubQueryBuilderContract',
].map((name) => ({ from: 'package', package: '@adonisjs/lucid', name }))

const typed = {
  files: ['**/*.ts'],
  languageOptions: {
    parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
  },
  rules: {
    '@typescript-eslint/no-floating-promises': [
      'error',
      { allowForKnownSafePromises: LUCID_BUILDERS },
    ],
    '@typescript-eslint/no-misused-promises': 'error',
  },
}

/**
 * Colaborador vem do container, nunca de `new` (_padroes/backend.md §2.1). O
 * seletor pega só o que é colaborador pelo nome; stdlib, value object, entidade
 * Lucid e comando de SDK ficam de fora de propósito.
 */
const injection = {
  files: ['**/*.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'NewExpression[callee.name=/(Service|UseCase|Policy|Controller|Repository|Seeder)$/]',
        message:
          'Colaborador vem do container, não de `new`. Injete por construtor com @inject(). ' +
          'Composition root de verdade: mova para lá com um override de `files`.',
      },
    ],
  },
}

/** O composition root nomeado: único lugar onde o grafo é montado sem container. */
const compositionRoot = {
  files: ['start/**/*.ts', 'providers/**/*.ts', 'config/**/*.ts'],
  rules: {
    'no-restricted-syntax': 'off',
  },
}

/**
 * Declaration merging exige `interface` - limite da linguagem, não estilo. O
 * Adonis concentra a augmentation em lugares previsíveis: `config/*.ts`,
 * `providers/*.ts`, `app/core/validator.ts` (transform de data do VineJS),
 * `tests/bootstrap.ts` e o middleware que inicializa o Bouncer.
 */
const augmentation = {
  files: [
    '**/*.d.ts',
    'config/*.ts',
    'providers/*.ts',
    'app/core/validator.ts',
    'tests/bootstrap.ts',
    'app/middleware/initialize-bouncer.middleware.ts',
  ],
  rules: {
    '@typescript-eslint/consistent-type-definitions': 'off',
  },
}

/**
 * Ordem de import: externo → alias interno (`#…`) → relativo, com linha em
 * branco entre os grupos (_padroes/tooling.md §4).
 */
const imports = {
  files: ['**/*.ts'],
  plugins: { 'import-x': importX },
  rules: {
    'import-x/order': [
      'error',
      {
        'groups': ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        'pathGroups': [{ pattern: '#**', group: 'internal' }],
        'pathGroupsExcludedImportTypes': ['builtin'],
        'newlines-between': 'always',
      },
    ],
  },
}

export default [
  generated,
  ...configApp({
    rules: {
      '@unicorn/filename-case': 'off',

      /**
       * A mesma configuração de `@adonisjs/eslint-config`, com uma adição: variável
       * não usada pode começar com `_` - o idioma para descartar uma chave no
       * destructuring.
       */
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        {
          selector: 'variable',
          modifiers: ['unused'],
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'class', format: ['PascalCase'] },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false },
        },
      ],
    },
  }),
  style,
  typed,
  injection,
  compositionRoot,
  augmentation,
  imports,
]
