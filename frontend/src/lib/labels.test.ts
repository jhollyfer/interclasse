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
  initials,
} from './labels'

/**
 * O `satisfies` de `labels.ts` já cobra rótulo para todo valor em tempo de
 * compilação, mas quem lê o rótulo lê da API, e a API manda `string` larga. Este
 * teste percorre o enum de verdade e falha quando um valor novo entra sem
 * rótulo - o `satisfies` só falharia se alguém rodasse o `tsc`.
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
  'todo valor de %s tem rótulo',
  (
    _name,
    values: ReadonlyArray<string>,
    maps: Array<Record<string, unknown>>,
  ) => {
    it.each(values)('%s', (value) => {
      for (const map of maps) expect(map[value]).toBeDefined()
    })

    // O reverso: rótulo órfão é rótulo de valor que o enum já não tem, e ele
    // some da tela sem que ninguém note.
    it('não guarda rótulo órfão', () => {
      for (const map of maps)
        expect(Object.keys(map).sort()).toEqual([...values].sort())
    })
  },
)

describe('acesso a rótulo', () => {
  // O acesso é sempre `LABELS[valor] ?? valor`: um valor que o backend passe a
  // devolver antes de a tela conhecê-lo aparece cru, e não derruba a página.
  it('não lança para valor fora do enum', () => {
    expect(MATCH_PHASE_LABELS['INVENTADO'] ?? 'INVENTADO').toBe('INVENTADO')
  })
})

describe('rótulos escolhidos', () => {
  it('concorda em gênero conforme o sujeito da tela', () => {
    expect(ACTIVE_STATUS_LABELS.ACTIVE).toBe('Ativa')
    expect(ACCOUNT_STATUS_LABELS.ACTIVE).toBe('Ativo')
  })

  // Chave encerrada tem campeão: é o único estado de vitória da tela.
  it('marca a chave encerrada como sucesso', () => {
    expect(BRACKET_STATUS_VARIANTS.FINISHED).toBe('success')
    expect(MATCH_STATUS_VARIANTS.FINISHED).toBe('success')
  })

  // `PENDING` de arquivo não é "aguardando aprovação": é upload que não
  // confirmou, e o backend recusa anexá-lo.
  it('não chama arquivo incompleto de pendente', () => {
    expect(UPLOAD_STATUS_LABELS.PENDING).toBe('Incompleto')
  })
})

/**
 * As iniciais do avatar. Uma regra só, para não haver duas divergentes - uma
 * pegando as duas primeiras palavras e outra a primeira e a última.
 */
describe('initials', () => {
  it('junta a primeira letra do primeiro nome e do último', () => {
    expect(initials('Maria Aparecida Souza')).toBe('MS')
  })

  it('devolve uma inicial só para nome de uma palavra', () => {
    // Repetir a primeira como sobrenome sairia "MM" para "Matheus".
    expect(initials('Matheus')).toBe('M')
  })

  it('não se perde em espaço sobrando', () => {
    expect(initials('  ana   lima  ')).toBe('AL')
  })

  it('devolve vazio para nome ausente - o marcador é decisão da tela', () => {
    expect(initials(undefined)).toBe('')
    expect(initials(null)).toBe('')
    expect(initials('   ')).toBe('')
  })
})

describe('formatDate', () => {
  it('formata em pt-BR no fuso da escola', () => {
    // Fuso fixo de propósito: formatar no fuso de quem roda o teste faria a
    // suíte passar num lugar e falhar em outro - que é a divergência de
    // hidratação que a função existe para evitar. 13h UTC é 9h em Manaus.
    expect(formatDate('2026-03-14T13:05:00.000Z')).toBe('14/03/2026, 09:05')
  })

  it('data ausente vira travessão', () => {
    expect(formatDate(null)).toBe('-')
  })
})

/**
 * O tamanho do arquivo na coluna da biblioteca e no detalhe.
 *
 * Base 1024, uma casa decimal, e para de subir em MB: o teto por arquivo do
 * projeto está longe do gigabyte.
 */
describe('formatBytes', () => {
  it('mostra byte cru abaixo de 1 KiB', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  it('vira KB no limite, e não uma casa antes', () => {
    expect(formatBytes(1024)).toBe('1,0 KB')
    expect(formatBytes(1024 * 1024 - 1)).toBe('1.024,0 KB')
  })

  it('vira MB no limite', () => {
    expect(formatBytes(1024 * 1024)).toBe('1,0 MB')
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3,5 MB')
  })

  // Sem ramo de GB de propósito: um arquivo desse tamanho não passa pelo
  // `UPLOAD_MAX_SIZE`, e a unidade que nunca aparece é um ramo nunca exercido.
  it('continua em MB para arquivo grande', () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.048,0 MB')
  })
})

test('agenda no relógio da escola, qualquer que seja o fuso do navegador', () => {
  // Manaus é UTC-4 o ano inteiro.
  expect(fromSchoolInput('2026-12-14T08:30')).toBe('2026-12-14T12:30:00.000Z')
  expect(toSchoolInput('2026-12-14T12:30:00.000Z')).toBe('2026-12-14T08:30')
  expect(toSchoolInput(fromSchoolInput('2026-12-01T07:30'))).toBe(
    '2026-12-01T07:30',
  )
  expect(toSchoolInput(null)).toBe('')
})

describe('datas da agenda, no fuso da escola', () => {
  // 12:30 UTC é 08:30 em Manaus (UTC-4), seja qual for o fuso de quem roda.
  const INSTANT = '2026-10-16T12:30:00.000Z'

  it('formatTime mostra a hora da escola, ou o relógio vazio', () => {
    expect(formatTime(INSTANT)).toBe('08:30')
    expect(formatTime(null)).toBe('--:--')
  })

  it('formatDayKey agrupa pelo dia da escola, e não pelo UTC', () => {
    expect(formatDayKey('2026-10-17T02:00:00.000Z')).toBe('2026-10-16')
  })

  it('formatWhen avisa quando o horário ainda não saiu', () => {
    expect(formatWhen(null)).toBe('Horário a definir')
    expect(formatWhen(INSTANT)).toContain('08:30')
  })
})

/**
 * Os rótulos seguem o idioma atual a cada leitura (`_standards/i18n.md` §2):
 * o mapa é o mesmo objeto, e o texto sai do `getLocale()` de cada acesso.
 */
describe('idioma dos rótulos', () => {
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

  it('data e número saem no formato do idioma', () => {
    overwriteGetLocale(() => 'en')

    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatDate('2026-03-14T13:05:00.000Z')).toContain('3/14/26')
  })
})
