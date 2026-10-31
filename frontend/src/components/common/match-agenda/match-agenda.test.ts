import type { AdministratorMatchPaginateResponse } from '@interclasse/shared'
import { fromPartial } from '@total-typescript/shoehorn'
import { describe, expect, it } from 'vitest'

import { MATCH_PHASE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { groupByDay, phaseLabel, scoreOf } from './index'

function match(partial: Partial<AdministratorMatchPaginateResponse>) {
  return fromPartial<AdministratorMatchPaginateResponse>(partial)
}

describe('scoreOf', () => {
  it('when a match is finished, shows the score', () => {
    expect(
      scoreOf(match({ status: 'FINISHED', homeScore: 3, awayScore: 1 })),
    ).toBe('3 x 1')
  })

  it('when a match has not finished, shows only the x', () => {
    expect(scoreOf(match({ status: 'SCHEDULED' }))).toBe('x')
  })
})

describe('phaseLabel', () => {
  it('translates the round through the label map', () => {
    expect(phaseLabel({ phase: 'FINAL' })).toBe(MATCH_PHASE_LABELS.FINAL)
  })
})

describe('groupByDay', () => {
  it('groups matches of the same school day, in the order received', () => {
    const days = groupByDay([
      match({ id: 'a', scheduledAt: '2026-10-16T12:30:00.000Z' }),
      match({ id: 'b', scheduledAt: '2026-10-16T15:00:00.000Z' }),
      match({ id: 'c', scheduledAt: '2026-10-17T12:30:00.000Z' }),
    ])

    expect(days.map((day) => day.key)).toEqual(['2026-10-16', '2026-10-17'])
    expect(days[0]?.matches.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('when the day rolls over, uses the school clock and not UTC', () => {
    // 02:00 UTC on 10/17 is still 22:00 on 10/16 in Manaus.
    const days = groupByDay([
      match({ id: 'a', scheduledAt: '2026-10-17T02:00:00.000Z' }),
    ])

    expect(days[0]?.key).toBe('2026-10-16')
  })

  it('puts a match without a time in a group of its own', () => {
    const days = groupByDay([match({ id: 'a', scheduledAt: null })])

    expect(days).toHaveLength(1)
    expect(days[0]?.key).toBe('sem-horario')
    expect(days[0]?.label).toBe(m.common_agenda_time_tbd())
  })
})
