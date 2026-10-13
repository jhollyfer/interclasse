import { configApp } from '@adonisjs/eslint-config'

/**
 * Arquivo gerado não se linta: a correção some na próxima geração.
 *
 * - `database/schema.ts` sai de `node ace migration:run` e traz "DO NOT EDIT
 *   manually" no topo.
 * - `.adonisjs/` é o registry do Tuyau, escrito por `indexEntities()` +
 *   `generateRegistry()` no hook de init.
 * - `build/` é a saída do `node ace build`.
 *
 * Os três já estão no `.prettierignore`; esta é a mesma lista, para o ESLint.
 * Sem ela, as regras de estilo apontam 234 erros no registry do Tuyau, que é
 * exatamente o tipo de ruído que faz um lint parar de ser lido.
 *
 * Precisa ser um objeto próprio no array: no flat config, um objeto só com
 * `ignores` é ignore global. Dentro de `configApp({ ignores })` valeria apenas
 * para aquele bloco de configuração, e o arquivo continuaria sendo verificado.
 */
const gerados = { ignores: ['database/schema.ts', '.adonisjs/**', 'build/**'] }

/**
 * As quatro regras de estilo do `code-pattern`, cobradas por lint em vez de por
 * leitura de diff. São as mesmas quatro que `lowcodejs/backend/eslint.config.js`
 * já enforça; trazê-las para cá é o que faz os quatro projetos falharem pelo
 * mesmo motivo.
 *
 * As regras 5, 6 e 7 do `code-pattern` (`Merge` em vez de `&`, lookup object no
 * lugar de cadeia de `if/else if`, `async/await` em vez de `.then`) não têm
 * regra nativa equivalente e continuam cobradas na revisão do diff.
 */
const estilo = {
  files: ['**/*.ts'],
  rules: {
    /**
     * Regra 1: ternário não é control flow. `??`, `?.` e `&&` seguem livres —
     * não são ternários. Uso legítimo inline pede `eslint-disable-next-line`
     * com a razão.
     */
    'no-ternary': 'error',

    /** Regra 2: sem `any` desnecessário. */
    '@typescript-eslint/no-explicit-any': 'error',

    /** Regra 3: sem `as`. `as const` continua permitido. */
    '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],

    /**
     * Regra 4: sempre `type`, nunca `interface`. Declaration merging é limite
     * da linguagem, não escolha de estilo — por isso `.d.ts` fica de fora
     * abaixo, e um `declare module` dentro de `.ts` pede disable pontual.
     */
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],

    /** Sem `!` non-null: o tipo se estreita com guarda (_padroes/typescript.md §1). */
    '@typescript-eslint/no-non-null-assertion': 'error',
  },
}

/**
 * O container do AdonisJS resolve o colaborador; instanciar à mão devolve um
 * objeto que ninguém pode dublar num teste e que não recebe as dependências
 * que o próprio construtor declara.
 *
 * O seletor pega só o que é colaborador pelo nome. Fica de fora, de propósito:
 * stdlib (`Map`, `Set`, `Date`, `URL`, `Error`), value object (`Secret`,
 * `Left`/`Right`), entidade Lucid (`new User()` é criar registro, não injetar),
 * comando de SDK (`PutObjectCommand`) e o composition root — que tem seu
 * próprio bloco de exceção adiante.
 */
const injecao = {
  files: ['**/*.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'NewExpression[callee.name=/(Service|UseCase|Policy|Controller|Repository|Seeder)$/]',
        message:
          'Colaborador vem do container, não de `new`. Injete por construtor com @inject(). ' +
          'Se este é o composition root (provider, config, bootstrap), mova para lá.',
      },
    ],
  },
}

/**
 * Onde `new` de colaborador é o certo: é aqui que o grafo é montado, e não há
 * container ainda para pedir a instância.
 */
const composicao = {
  files: [
    'providers/**/*.ts',
    'config/**/*.ts',
    'start/**/*.ts',
  ],
  rules: {
    'no-restricted-syntax': 'off',
  },
}

/**
 * Regra 4 não alcança declaration merging: `declare module '@adonisjs/...'`
 * exige `interface`, porque `type` não funde declaração. É limite da
 * linguagem, não escolha de estilo.
 *
 * O AdonisJS concentra a augmentation em lugares previsíveis — `config/*.ts`
 * (guards, hashers, disks, limiters, mailers), `providers/*.ts` (o que o
 * provider pendura no `HttpContext`), `app/core/validator.ts` (transform de data
 * do VineJS), `tests/bootstrap.ts` (registry do Japa) e o middleware que
 * inicializa o Bouncer. Nenhum deles é código de feature; o alvo da regra é
 * `app/features`, `app/services` e `app/models`, onde ela continua valendo.
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
 * Regra 2 fica de fora dos testes por uma razão de origem, não de conveniência.
 *
 * O registry do Tuyau casa a rota pelo caminho e não pelo método, então
 * `response.body()` é a união de todas as respostas daquele caminho — as de
 * erro inclusive. `tests/helpers.ts::body()` desfaz isso com
 * `Record<string, any>`, e cada spec que lê um corpo herda o mesmo `any`.
 *
 * A causa é uma só, e está no registry. Trocar por `unknown` empurraria uma
 * asserção para cada leitura de campo em centenas de asserts, o que é pior. A
 * exceção sai daqui no dia em que o registry casar rota por método.
 */
const testes = {
  files: ['tests/**/*.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
}

export default [
  gerados,
  ...configApp({
    rules: {
      '@unicorn/filename-case': 'off',

      /**
       * A mesma configuração de `@adonisjs/eslint-config`, com uma adição: variável
       * não usada pode começar com `_`.
       *
       * É o idioma para descartar uma chave no destructuring - `const { role:
       * _papelIgnorado, ...dados } = payload` diz, no próprio nome, que o valor foi
       * jogado fora de propósito. Sem a exceção, a regra empurra para um nome pior
       * ou para o descarte deixar de ser explícito.
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
  estilo,
  injecao,
  composicao,
  augmentation,
  testes,
]
