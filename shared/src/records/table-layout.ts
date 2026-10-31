import { z } from '../validator.js'

/**
 * The table layout the browser stores (`lib/local-store.ts`). It has no backend
 * counterpart, so it is not `*.validator.ts` (no VineJS pair, which `pattern:check`
 * demands): it is a screen preference, not an API payload.
 *
 * External data comes in as `unknown` (`typescript.md` §2): what is stored survives
 * deploys, and yesterday's shape is no guarantee of today's.
 */
export const TableLayout = z.object({
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnSizing: z.record(z.string(), z.number()).optional(),
  columnPinning: z
    .object({
      start: z.array(z.string()),
      end: z.array(z.string()),
    })
    .optional(),
})

export type TableLayout = z.infer<typeof TableLayout>
