import { describe, expect, it } from 'vitest'
import { missingParts, planParts } from './chunking'

const PART = 10 * 1024 * 1024

describe('planParts', () => {
  it('numera a partir de 1, porque o S3 recusa a parte zero', () => {
    const plan = planParts(PART * 2, PART)

    expect(plan.map((part) => part.partNumber)).toEqual([1, 2])
  })

  it('conta a sobra como uma parte a mais', () => {
    expect(planParts(PART * 2 + 1, PART)).toHaveLength(3)
  })

  it('corta a última parte no fim do arquivo, e não no múltiplo', () => {
    const plan = planParts(PART + 500, PART)

    expect(plan.at(-1)).toEqual({
      partNumber: 2,
      start: PART,
      end: PART + 500,
    })
  })

  it('cobre o arquivo inteiro, sem buraco nem sobreposição', () => {
    const size = PART * 3 + 7
    const plan = planParts(size, PART)

    expect(plan[0].start).toBe(0)
    expect(plan.at(-1)?.end).toBe(size)

    plan.slice(1).forEach((part, index) => {
      expect(part.start).toBe(plan[index].end)
    })
  })

  it('arquivo menor que uma parte dá uma parte só', () => {
    expect(planParts(1024, PART)).toEqual([
      { partNumber: 1, start: 0, end: 1024 },
    ])
  })

  it('arquivo vazio ainda dá uma parte: zero byte é arquivo válido', () => {
    expect(planParts(0, PART)).toEqual([{ partNumber: 1, start: 0, end: 0 }])
  })
})

describe('missingParts', () => {
  it('devolve só o que falta, na ordem', () => {
    const plan = planParts(PART * 4, PART)

    expect(missingParts(plan, [1, 3]).map((part) => part.partNumber)).toEqual([
      2, 4,
    ])
  })

  it('retoma da primeira faltante, nunca do começo', () => {
    const plan = planParts(PART * 1500, PART)
    const uploaded = Array.from({ length: 1499 }, (_, index) => index + 1)

    const missing = missingParts(plan, uploaded)

    expect(missing).toHaveLength(1)
    expect(missing[0].partNumber).toBe(1500)
  })

  it('nada falta quando tudo subiu', () => {
    const plan = planParts(PART * 2, PART)

    expect(missingParts(plan, [1, 2])).toEqual([])
  })
})
