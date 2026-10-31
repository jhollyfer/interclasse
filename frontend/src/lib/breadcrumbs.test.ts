import { expect, test } from 'vitest'

import { breadcrumbTitle, buildBreadcrumbs } from './breadcrumbs'

test('rotula os segmentos fixos e não linka a página atual', () => {
  expect(
    buildBreadcrumbs([
      { fullPath: '/administrator', pathname: '/administrator' },
      {
        fullPath: '/administrator/sports',
        pathname: '/administrator/sports',
      },
    ]),
  ).toEqual([
    { label: 'Painel', to: '/administrator' },
    { label: 'Modalidades' },
  ])
})

test('não linka prefixo que não casou com rota', () => {
  // Only the listing's match exists, so the first item stays text and does not become
  // a link to a 404.
  const crumbs = buildBreadcrumbs([
    {
      fullPath: '/administrator/sports/$id',
      pathname: '/administrator/sports/abc-123',
    },
  ])

  expect(crumbs).toEqual([
    { label: 'Painel' },
    { label: 'Modalidades' },
    { label: 'Detalhe' },
  ])
})

test('linka o prefixo que casou', () => {
  const crumbs = buildBreadcrumbs([
    {
      fullPath: '/administrator/sports',
      pathname: '/administrator/sports',
    },
    {
      fullPath: '/administrator/sports/$id/edit',
      pathname: '/administrator/sports/abc-123/edit',
    },
  ])

  expect(crumbs).toEqual([
    { label: 'Painel' },
    { label: 'Modalidades', to: '/administrator/sports' },
    { label: 'Detalhe' },
    { label: 'Editar' },
  ])
})

test('segmento sem rótulo aparece cru em vez de sumir', () => {
  expect(
    buildBreadcrumbs([{ fullPath: '/relatorios', pathname: '/relatorios' }]),
  ).toEqual([{ label: 'relatorios' }])
})

test('sem match, sem trilha', () => {
  expect(buildBreadcrumbs([])).toEqual([])
  expect(buildBreadcrumbs([{ fullPath: '/', pathname: '/' }])).toEqual([])
})

test('o título da aba vai do mais específico ao mais geral, sem o Painel', () => {
  expect(
    breadcrumbTitle([
      { label: 'Painel' },
      { label: 'Chaves', to: '/administrator/brackets' },
      { label: 'Detalhe' },
    ]),
  ).toBe('Detalhe · Chaves')
  expect(
    breadcrumbTitle([
      { label: 'Painel' },
      { label: 'Avisos' },
      { label: 'Detalhe' },
      { label: 'Editar' },
    ]),
  ).toBe('Editar · Avisos')
  expect(breadcrumbTitle([{ label: 'Painel' }])).toBe('Painel')
  expect(breadcrumbTitle([])).toBe('')
})
