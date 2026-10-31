import { expect, test } from 'vitest'

import { breadcrumbTitle, buildBreadcrumbs } from './breadcrumbs'

test('labels the fixed segments and does not link the current page', () => {
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

test('does not link a prefix that matched no route', () => {
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

test('links the prefix that matched', () => {
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

test('shows a segment without a label raw instead of dropping it', () => {
  expect(
    buildBreadcrumbs([{ fullPath: '/relatorios', pathname: '/relatorios' }]),
  ).toEqual([{ label: 'relatorios' }])
})

test('without a match, has no trail', () => {
  expect(buildBreadcrumbs([])).toEqual([])
  expect(buildBreadcrumbs([{ fullPath: '/', pathname: '/' }])).toEqual([])
})

test('orders the tab title from most specific to most general, without the Painel', () => {
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
