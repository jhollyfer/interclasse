/**
 * Only the layer rules of `_standards/architecture.md` §2 and `no-circular`
 * (`domain.md` §8). Every `forbidden` rule carries `severity: 'error'`: the default
 * is `warn`, and the exit code is the number of `error` violations, so a rule without
 * severity passes CI green (_doc-lib/dependency-cruiser.md#doc/rules-reference.md).
 */
import type { IConfiguration } from 'dependency-cruiser'

const config: IConfiguration = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Cycle between modules (domain.md §8).',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-no-layer',
      comment: 'core/ only imports shared (architecture.md §2).',
      severity: 'error',
      from: { path: '^app/core/' },
      to: {
        path: '^app/(domain|repositories|models|services|policies|middleware|features|exceptions)/',
      },
    },
    {
      name: 'domain-no-infra',
      comment: 'domain/ imports core and shared; never a model, repository, service or HTTP.',
      severity: 'error',
      from: { path: '^app/domain/' },
      to: {
        path: '^app/(repositories|models|services|policies|middleware|features|exceptions)/',
      },
    },
    {
      name: 'repositories-no-rules',
      comment: 'repositories/ imports domain, models and core; never business rules or HTTP.',
      severity: 'error',
      from: { path: '^app/repositories/' },
      to: { path: '^app/(services|policies|middleware|features|exceptions)/' },
    },
    {
      name: 'models-only-in-repositories',
      comment:
        'models/ is only imported by repositories/ (and by another model; the guard has its own rule).',
      severity: 'error',
      from: { path: '^app/', pathNot: '^app/(repositories|models|guards)/' },
      to: { path: '^app/models/' },
    },
    {
      name: 'guard-only-account-model',
      comment:
        'The guard imports only the account model: the GuardContract<User> of @adonisjs/auth requires it (architecture.md §2, DECISIONS.md #247).',
      severity: 'error',
      from: { path: '^app/guards/' },
      to: { path: '^app/models/', pathNot: '^app/models/user\\.ts$' },
    },
    {
      name: 'models-only-core',
      comment: 'models/ imports only core.',
      severity: 'error',
      from: { path: '^app/models/' },
      to: {
        path: '^app/(domain|repositories|services|policies|middleware|features|exceptions)/',
      },
    },
    {
      name: 'services-no-rules',
      comment: 'services/ imports core and shared; never business rules or features/.',
      severity: 'error',
      from: { path: '^app/services/' },
      to: {
        path: '^app/(domain|repositories|models|policies|middleware|features|exceptions)/',
      },
    },
    {
      name: 'policies-no-database',
      comment: 'policies/ imports core and domain; never queries the database on its own.',
      severity: 'error',
      from: { path: '^app/policies/' },
      to: { path: '^app/(repositories|models|services|middleware|features)/' },
    },
    {
      name: 'middleware-no-feature',
      comment: 'middleware/ carries no rule of a feature.',
      severity: 'error',
      from: { path: '^app/middleware/' },
      to: { path: '^app/features/' },
    },
    {
      name: 'features-no-implementation',
      comment: 'features/ uses the contract; never a model or a concrete implementation.',
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
      name: 'features-no-other-feature',
      comment: 'A feature does not import another; what is common goes up to _shared.',
      severity: 'error',
      from: { path: '^app/features/([^/]+)/' },
      to: { path: '^app/features/', pathNot: ['^app/features/$1/', '/_shared[./]'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Without this the `import type` disappears from the graph, and a layer starts depending on
    // another by type alone with nobody seeing it (_doc-lib/dependency-cruiser.md#doc/options-reference.md).
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    // The `#layer/*` alias comes from the `imports` field of package.json.
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    includeOnly: '^app/',
  },
}

export default config
