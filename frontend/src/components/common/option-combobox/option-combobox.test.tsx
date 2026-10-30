// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { m } from '#/paraglide/messages'

import { OptionCombobox, toOptions } from './index'

afterEach(cleanup)

const OPTIONS = [
  { value: 'a', label: 'Alfa' },
  { value: 'b', label: 'Beta' },
]

describe('toOptions', () => {
  it('monta valor e rótulo a partir do mapa', () => {
    expect(toOptions(['x', 'y'], { x: 'Xis', y: 'Ipsilon' })).toEqual([
      { value: 'x', label: 'Xis', dot: undefined },
      { value: 'y', label: 'Ipsilon', dot: undefined },
    ])
  })

  it('valor sem rótulo usa o próprio valor, e a bolinha vem do segundo mapa', () => {
    expect(toOptions(['x'], {}, { x: 'bg-red' })).toEqual([
      { value: 'x', label: 'x', dot: 'bg-red' },
    ])
  })
})

describe('OptionCombobox', () => {
  it('mostra o rótulo do valor escolhido', () => {
    render(
      <OptionCombobox options={OPTIONS} value="b" onValueChange={vi.fn()} />,
    )

    expect(screen.getByRole('combobox')).toHaveProperty('value', 'Beta')
  })

  it('valor vazio mostra o placeholder', () => {
    render(
      <OptionCombobox options={OPTIONS} value="" onValueChange={vi.fn()} />,
    )

    expect(
      screen.getByPlaceholderText(m.common_select_placeholder()),
    ).toBeTruthy()
  })

  it('escolher uma opção devolve o valor dela', async () => {
    const onValueChange = vi.fn()
    render(
      <OptionCombobox
        options={OPTIONS}
        value=""
        onValueChange={onValueChange}
      />,
    )

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Alfa' }))

    expect(onValueChange).toHaveBeenCalledWith('a')
  })

  it('com mais páginas no servidor oferece "Carregar mais"', async () => {
    const onLoadMore = vi.fn()
    render(
      <OptionCombobox
        options={OPTIONS}
        value=""
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
        hasMore
        onLoadMore={onLoadMore}
      />,
    )

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      await screen.findByRole('button', { name: m.common_load_more() }),
    )

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('sem mais páginas não oferece "Carregar mais"', async () => {
    render(
      <OptionCombobox
        options={OPTIONS}
        value=""
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('combobox'))
    await screen.findByRole('option', { name: 'Alfa' })

    expect(
      screen.queryByRole('button', { name: m.common_load_more() }),
    ).toBeNull()
  })
})
