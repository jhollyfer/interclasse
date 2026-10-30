// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSignOut } from './use-sign-out'

type MutationOptions = { onSettled: () => Promise<void> }

const navigate = vi.fn()
const clear = vi.fn()
const order: Array<string> = []
let captured: MutationOptions | undefined = undefined

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear }),
}))
vi.mock('#/integrations/tanstack-query/mutations/authentication', () => ({
  useAuthenticationSignOutMutation: (options: MutationOptions) => {
    captured = options

    return { mutate: vi.fn() }
  },
}))

afterEach(() => {
  vi.clearAllMocks()
  order.length = 0
})

describe('useSignOut', () => {
  it('ao fim, esvazia o cache e só depois vai para a entrada', async () => {
    clear.mockImplementation(() => order.push('clear'))
    navigate.mockImplementation(() => {
      order.push('navigate')

      return Promise.resolve()
    })
    renderHook(() => useSignOut())

    await captured?.onSettled()

    expect(order).toEqual(['clear', 'navigate'])
    expect(navigate).toHaveBeenCalledWith({ to: '/sign-in' })
  })
})
