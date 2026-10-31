import {
  ACTIVE_STATUSES,
  BRACKET_STATUSES,
  CATEGORIES,
  MATCH_PHASES,
  MATCH_STATUSES,
  STORAGE_MIMETYPES,
  UPLOAD_STATUSES,
  USER_ROLES,
} from '@interclasse/shared'
import { afterEach, describe, expect, it, test } from 'vitest'

import { overwriteGetLocale } from '#/paraglide/runtime'

import {
  formatDayKey,
  formatTime,
  formatWhen,
  ACCOUNT_STATUS_LABELS,
  ACTIVE_STATUS_DOTS,
  ACTIVE_STATUS_LABELS,
  ACTIVE_STATUS_VARIANTS,
  BRACKET_STATUS_LABELS,
  BRACKET_STATUS_VARIANTS,
  CATEGORY_LABELS,
  CATEGORY_SHORT_LABELS,
  MATCH_PHASE_LABELS,
  MATCH_STATUS_LABELS,
  MATCH_STATUS_VARIANTS,
  STORAGE_MIMETYPE_LABELS,
  UPLOAD_STATUS_DOTS,
  UPLOAD_STATUS_LABELS,
  UPLOAD_STATUS_VARIANTS,
  USER_ROLE_LABELS,
  USER_ROLE_VARIANTS,
  fromSchoolInput,
  toSchoolInput,
  formatBytes,
  formatDate,
  championName,
  initials,
  plural,
} from './labels'

/**
 * The `satisfies` in `labels.ts` already demands a label for every value at compile
 * time, but whoever reads the label reads it from the API, and the API sends a wide `string`. This
 * test walks the real enum and fails when a new value enters without a
 * label - `satisfies` would only fail if someone ran `tsc`.
 */
describe.each([
  [
    'ActiveStatus',
    ACTIVE_STATUSES,
    [
      ACTIVE_STATUS_LABELS,
      ACCOUNT_STATUS_LABELS,
      ACTIVE_STATUS_VARIANTS,
      ACTIVE_STATUS_DOTS,
    ],
  ],
  ['UserRole', USER_ROLES, [USER_ROLE_LABELS, USER_ROLE_VARIANTS]],
  ['Category', CATEGORIES, [CATEGORY_LABELS, CATEGORY_SHORT_LABELS]],
  [
    'BracketStatus',
    BRACKET_STATUSES,
    [BRACKET_STATUS_LABELS, BRACKET_STATUS_VARIANTS],
  ],
  ['MatchPhase', MATCH_PHASES, [MATCH_PHASE_LABELS]],
  ['MatchStatus', MATCH_STATUSES, [MATCH_STATUS_LABELS, MATCH_STATUS_VARIANTS]],
  [
    'UploadStatus',
    UPLOAD_STATUSES,
    [UPLOAD_STATUS_LABELS, UPLOAD_STATUS_VARIANTS, UPLOAD_STATUS_DOTS],
  ],
  ['StorageMimetype', STORAGE_MIMETYPES, [STORAGE_MIMETYPE_LABELS]],
])(
  'every value of %s has a label',
  (
    _name,
    values: ReadonlyArray<string>,
    maps: Array<Record<string, unknown>>,
  ) => {
    it.each(values)('%s', (value) => {
      for (const map of maps) expect(map[value]).toBeDefined()
    })

    // The reverse: an orphan label is the label of a value the enum no longer has, and it
    // vanishes from the screen without anyone noticing.
    it('keeps no orphan label', () => {
      for (const map of maps)
        expect(Object.keys(map).sort()).toEqual([...values].sort())
    })
  },
)

describe('label access', () => {
  // Access is always `LABELS[value] ?? value`: a value that the backend starts to
  // return before the screen knows it shows up raw, and does not bring the page down.
  it('does not throw for a value outside the enum', () => {
    expect(MATCH_PHASE_LABELS['INVENTADO'] ?? 'INVENTADO').toBe('INVENTADO')
  })
})

describe('chosen labels', () => {
  it('agrees in gender according to the screen subject', () => {
    expect(ACTIVE_STATUS_LABELS.ACTIVE).toBe('Ativa')
    expect(ACCOUNT_STATUS_LABELS.ACTIVE).toBe('Ativo')
  })

  // A closed bracket has a champion: it is the screen's only victory state.
  it('marks the closed bracket as success', () => {
    expect(BRACKET_STATUS_VARIANTS.FINISHED).toBe('success')
    expect(MATCH_STATUS_VARIANTS.FINISHED).toBe('success')
  })

  // A file's `PENDING` is not "aguardando aprovação": it is an upload that did not
  // confirm, and the backend refuses to attach it.
  it('does not call an incomplete file pending', () => {
    expect(UPLOAD_STATUS_LABELS.PENDING).toBe('Incompleto')
  })
})

/**
 * The avatar initials. A single rule, so there are not two divergent ones - one
 * taking the first two words and another the first and the last.
 */
describe('initials', () => {
  it('joins the first letter of the first name and of the last', () => {
    expect(initials('Maria Aparecida Souza')).toBe('MS')
  })

  it('returns a single initial for a one-word name', () => {
    // Repeating the first as a surname would give "MM" for "Matheus".
    expect(initials('Matheus')).toBe('M')
  })

  it('is not thrown off by extra spaces', () => {
    expect(initials('  ana   lima  ')).toBe('AL')
  })

  it('returns empty for an absent name - the marker is the screen decision', () => {
    expect(initials(undefined)).toBe('')
    expect(initials(null)).toBe('')
    expect(initials('   ')).toBe('')
  })
})

describe('formatDate', () => {
  it('formats in pt-BR in the school time zone', () => {
    // Fixed time zone on purpose: formatting in the time zone of whoever runs the test would make the
    // suite pass in one place and fail in another - which is the hydration
    // divergence the function exists to avoid. 1pm UTC is 9am in Manaus.
    expect(formatDate('2026-03-14T13:05:00.000Z')).toBe('14/03/2026, 09:05')
  })

  it('turns an absent date into a dash', () => {
    expect(formatDate(null)).toBe('-')
  })
})

/**
 * A file's size in the library column and in the detail.
 *
 * Base 1024, one decimal place, and stops climbing at MB: the project's per-file cap
 * is far from a gigabyte.
 */
describe('formatBytes', () => {
  it('shows raw bytes below 1 KiB', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  it('becomes KB at the limit, and not one step before', () => {
    expect(formatBytes(1024)).toBe('1,0 KB')
    expect(formatBytes(1024 * 1024 - 1)).toBe('1.024,0 KB')
  })

  it('becomes MB at the limit', () => {
    expect(formatBytes(1024 * 1024)).toBe('1,0 MB')
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3,5 MB')
  })

  // No GB branch on purpose: a file of that size does not pass
  // `UPLOAD_MAX_SIZE`, and a unit that never shows up is a branch never exercised.
  it('stays in MB for a large file', () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.048,0 MB')
  })
})

test('schedules on the school clock, whatever the browser time zone', () => {
  // Manaus is UTC-4 all year round.
  expect(fromSchoolInput('2026-12-14T08:30')).toBe('2026-12-14T12:30:00.000Z')
  expect(toSchoolInput('2026-12-14T12:30:00.000Z')).toBe('2026-12-14T08:30')
  expect(toSchoolInput(fromSchoolInput('2026-12-01T07:30'))).toBe(
    '2026-12-01T07:30',
  )
  expect(toSchoolInput(null)).toBe('')
})

describe('formats the schedule dates in the school time zone', () => {
  // 12:30 UTC is 08:30 in Manaus (UTC-4), whatever the time zone of whoever runs it.
  const INSTANT = '2026-10-16T12:30:00.000Z'

  it('formatTime shows the school time, or the empty clock', () => {
    expect(formatTime(INSTANT)).toBe('08:30')
    expect(formatTime(null)).toBe('--:--')
  })

  it('formatDayKey groups by the school day, and not by UTC', () => {
    expect(formatDayKey('2026-10-17T02:00:00.000Z')).toBe('2026-10-16')
  })

  it('formatWhen warns when the time is not out yet', () => {
    expect(formatWhen(null)).toBe('Horário a definir')
    expect(formatWhen(INSTANT)).toContain('08:30')
  })
})

/**
 * Labels follow the current language on each read (`_standards/i18n.md` §2):
 * the map is the same object, and the text comes from `getLocale()` on each access.
 */
describe('language of the labels', () => {
  afterEach(() => {
    overwriteGetLocale(() => 'pt-BR')
  })

  it.each([
    ['pt-BR', 'Professor conselheiro', 'Encerrada'],
    ['es', 'Profesor consejero', 'Finalizada'],
    ['en', 'Advisor teacher', 'Finished'],
  ] as const)('%s', (locale, role, status) => {
    overwriteGetLocale(() => locale)

    expect(USER_ROLE_LABELS.ADVISOR).toBe(role)
    expect(MATCH_STATUS_LABELS.FINISHED).toBe(status)
  })

  it('date and number come out in the format of the language', () => {
    overwriteGetLocale(() => 'en')

    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatDate('2026-03-14T13:05:00.000Z')).toContain('3/14/26')
  })
})

describe('plural', () => {
  it('when one, uses the singular, with the count in front', () => {
    expect(plural(1, 'foto', 'fotos')).toBe('1 foto')
  })

  it('zero e muitos usam o plural', () => {
    expect(plural(0, 'foto', 'fotos')).toBe('0 fotos')
    expect(plural(3, 'foto', 'fotos')).toBe('3 fotos')
  })

  it('when withCount is false, returns only the noun', () => {
    expect(plural(2, 'foto', 'fotos', { withCount: false })).toBe('fotos')
    expect(plural(1, 'foto', 'fotos', { withCount: false })).toBe('foto')
  })
})

describe('championName', () => {
  const matches = [
    { homeTeamId: 'a', awayTeamId: 'b', homeName: '7A', awayName: '7B' },
    { homeTeamId: 'c', awayTeamId: 'a', homeName: '8C', awayName: '7A' },
  ]

  it('is null until the final happens', () => {
    expect(championName({ championTeamId: null, matches })).toBeNull()
  })

  it('finds the champion name playing at home', () => {
    expect(championName({ championTeamId: 'a', matches })).toBe('7A')
  })

  it('finds the champion name playing away', () => {
    expect(championName({ championTeamId: 'c', matches })).toBe('8C')
    expect(championName({ championTeamId: 'b', matches })).toBe('7B')
  })

  it('is null when the champion appears in no match', () => {
    expect(championName({ championTeamId: 'z', matches })).toBeNull()
  })
})
