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
  it('partida encerrada mostra o placar', () => {
    expect(
      scoreOf(match({ status: 'FINISHED', homeScore: 3, awayScore: 1 })),
    ).toBe('3 x 1')
  })

  it('partida que não terminou mostra só o x', () => {
    expect(scoreOf(match({ status: 'SCHEDULED' }))).toBe('x')
  })
})

describe('phaseLabel', () => {
  it('traduz a fase pelo mapa de rótulos', () => {
    expect(phaseLabel({ phase: 'FINAL' })).toBe(MATCH_PHASE_LABELS.FINAL)
  })
})

describe('groupByDay', () => {
  it('agrupa jogos do mesmo dia da escola, na ordem recebida', () => {
    const days = groupByDay([
      match({ id: 'a', scheduledAt: '2026-10-16T12:30:00.000Z' }),
      match({ id: 'b', scheduledAt: '2026-10-16T15:00:00.000Z' }),
      match({ id: 'c', scheduledAt: '2026-10-17T12:30:00.000Z' }),
    ])

    expect(days.map((day) => day.key)).toEqual(['2026-10-16', '2026-10-17'])
    expect(days[0]?.matches.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('a virada do dia usa o relógio da escola, e não o UTC', () => {
    // 02:00 UTC de 17/10 ainda é 22:00 de 16/10 em Manaus.
    const days = groupByDay([
      match({ id: 'a', scheduledAt: '2026-10-17T02:00:00.000Z' }),
    ])

    expect(days[0]?.key).toBe('2026-10-16')
  })

  it('jogo sem horário vai para um grupo próprio', () => {
    const days = groupByDay([match({ id: 'a', scheduledAt: null })])

    expect(days).toHaveLength(1)
    expect(days[0]?.key).toBe('sem-horario')
    expect(days[0]?.label).toBe(m.common_agenda_time_tbd())
  })
})
