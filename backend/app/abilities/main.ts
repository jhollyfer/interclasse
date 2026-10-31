/**
 * Bouncer abilities: an authorization rule that does not belong to a record.
 *
 * Empty on purpose - every rule in this project depends on the target and lives in a
 * policy (`app/policies/<entity>.policy.ts`). The file exists because the
 * Bouncer middleware imports it (_standards/backend.md §1.1).
 */
export {}
