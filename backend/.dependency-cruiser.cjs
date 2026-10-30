/**
 * Só as regras de camada de `_standards/architecture.md` §2 e `no-circular`
 * (`domain.md` §8). Toda regra de `forbidden` leva `severity: 'error'`: o padrão
 * é `warn`, e o código de saída é o número de violações `error`, então regra sem
 * severidade passa o CI verde (_doc-lib/dependency-cruiser.md#doc/rules-reference.md).
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Ciclo entre módulos (domain.md §8).',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-sem-camada',
      comment: 'core/ só importa shared (architecture.md §2).',
      severity: 'error',
      from: { path: '^app/core/' },
      to: {
        path: '^app/(domain|repositories|models|services|policies|middleware|features|exceptions)/',
      },
    },
    {
      name: 'domain-sem-infra',
      comment: 'domain/ importa core e shared; nunca model, repository, service ou HTTP.',
      severity: 'error',
      from: { path: '^app/domain/' },
      to: {
        path: '^app/(repositories|models|services|policies|middleware|features|exceptions)/',
      },
    },
    {
      name: 'repositories-sem-regra',
      comment: 'repositories/ importa domain, models e core; nunca regra de negócio nem HTTP.',
      severity: 'error',
      from: { path: '^app/repositories/' },
      to: { path: '^app/(services|policies|middleware|features|exceptions)/' },
    },
    {
      name: 'models-so-em-repositories',
      comment: 'models/ só é importado por repositories/ (e por outro model).',
      severity: 'error',
      from: { path: '^app/', pathNot: '^app/(repositories|models)/' },
      to: { path: '^app/models/' },
    },
    {
      name: 'models-so-core',
      comment: 'models/ importa só core.',
      severity: 'error',
      from: { path: '^app/models/' },
      to: {
        path: '^app/(domain|repositories|services|policies|middleware|features|exceptions)/',
      },
    },
    {
      name: 'services-sem-regra',
      comment: 'services/ importa core e shared; nunca regra de negócio nem features/.',
      severity: 'error',
      from: { path: '^app/services/' },
      to: {
        path: '^app/(domain|repositories|models|policies|middleware|features|exceptions)/',
      },
    },
    {
      name: 'policies-sem-banco',
      comment: 'policies/ importa core e domain; nunca consulta banco por conta própria.',
      severity: 'error',
      from: { path: '^app/policies/' },
      to: { path: '^app/(repositories|models|services|middleware|features)/' },
    },
    {
      name: 'middleware-sem-feature',
      comment: 'middleware/ não carrega regra de uma feature.',
      severity: 'error',
      from: { path: '^app/middleware/' },
      to: { path: '^app/features/' },
    },
    {
      name: 'features-sem-implementacao',
      comment: 'features/ usa o contrato; nunca model nem implementação concreta.',
      severity: 'error',
      from: { path: '^app/features/' },
      to: {
        path: [
          '^app/models/',
          '^app/repositories/.+\\.(lucid|memory|mongo)\\.repository\\.ts$',
          '^app/services/.+/[^/]+\\.service\\.ts$',
        ],
      },
    },
    {
      name: 'features-sem-outra-feature',
      comment: 'Uma feature não importa outra; o que é comum sobe para _shared.',
      severity: 'error',
      from: { path: '^app/features/([^/]+)/' },
      to: { path: '^app/features/', pathNot: ['^app/features/$1/', '/_shared[./]'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Sem isto o `import type` some do grafo, e a camada passa a depender de
    // outra só por tipo sem ninguém ver (_doc-lib/dependency-cruiser.md#doc/options-reference.md).
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    // O alias `#camada/*` vem do campo `imports` do package.json.
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    includeOnly: '^app/',
  },
}
