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
  it('builds value and label from the map', () => {
    expect(toOptions(['x', 'y'], { x: 'Xis', y: 'Ipsilon' })).toEqual([
      { value: 'x', label: 'Xis', dot: undefined },
      { value: 'y', label: 'Ipsilon', dot: undefined },
    ])
  })

  it('when a value has no label, uses the value itself, and the dot comes from the second map', () => {
    expect(toOptions(['x'], {}, { x: 'bg-red' })).toEqual([
      { value: 'x', label: 'x', dot: 'bg-red' },
    ])
  })
})

describe('OptionCombobox', () => {
  it('shows the label of the chosen value', () => {
    render(
      <OptionCombobox options={OPTIONS} value="b" onValueChange={vi.fn()} />,
    )

    expect(screen.getByRole('combobox')).toHaveProperty('value', 'Beta')
  })

  it('when the value is empty, shows the placeholder', () => {
    render(
      <OptionCombobox options={OPTIONS} value="" onValueChange={vi.fn()} />,
    )

    expect(
      screen.getByPlaceholderText(m.common_select_placeholder()),
    ).toBeTruthy()
  })

  it('when an option is chosen, returns its value', async () => {
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

  it('when the server has more pages, offers "Carregar mais"', async () => {
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

  it('when the server has no more pages, does not offer "Carregar mais"', async () => {
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
