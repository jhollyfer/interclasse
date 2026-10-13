//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import pluginQuery from '@tanstack/eslint-plugin-query'
import pluginRouter from '@tanstack/eslint-plugin-router'
import importX from 'eslint-plugin-import-x'

export default [
  ...tanstackConfig,

  // Os dois plugins pegam a classe de erro que o TypeScript não pega: chave de
  // query incompleta, `queryKey` e `queryFn` declarados soltos em vez de num
  // `queryOptions()`, e ordem de propriedade em `createFileRoute` - que decide
  // se o contexto enriquecido pelo `beforeLoad` aparece tipado no `loader`, e
  // que falha só no tipo, em silêncio.
  ...pluginQuery.configs['flat/recommended'],
  ...pluginRouter.configs['flat/recommended'],
  {
    // `projectService` no lugar do `project: true` do `tanstackConfig`: é o que
    // `_padroes/tooling.md` §4 pede para as regras que dependem de tipo.
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parserOptions: { project: null, projectService: true },
    },
  },
  {
    // A ordem de import da régua (`tooling.md` §4): externo, alias `#/`,
    // relativo, com linha em branco entre os grupos. O `import/order` do
    // `tanstackConfig` sai para não brigar com este. `components/ui/**` fica
    // de fora: é saída do shadcn, e o próximo `shadcn add` desfaria a ordem.
    files: ['**/*.{js,ts,tsx}'],
    ignores: ['src/components/ui/**'],
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
          pathGroups: [{ pattern: '#/**', group: 'internal' }],
          'newlines-between': 'always',
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
    // `src/components/ui/**` vem do registry do shadcn, e o próximo
    // `shadcn add` reescreve o arquivo inteiro: correção de lint aqui é
    // trabalho que a atualização seguinte desfaz.
    //
    // As duas regras também estariam erradas no mérito. O
    // `no-unnecessary-condition` julga pelo TIPO, e o que estes arquivos
    // protegem é o RUNTIME de biblioteca de terceiro - o `payload` do recharts,
    // o slot fora de faixa do input-otp, a instância do embla capturada no
    // cleanup. O tipo diz não-nulo; o valor em runtime nem sempre é. E o
    // `no-shadow` reclama do `{ className, ...props }` desestruturado dentro de
    // um componente que já tem `props` no escopo, que é a forma que o próprio
    // registry escreve.
    files: ['src/components/ui/**'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'no-shadow': 'off',
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
    // Exceções: `routeTree.gen.ts` é gerado, e
    // `components/ui/**` vem do registry do shadcn — o próximo `shadcn add`
    // reescreve o arquivo e desfaz qualquer correção.
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/routeTree.gen.ts', 'src/components/ui/**'],
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
    ],
  },
]
