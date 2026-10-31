import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

/**
 * The development tools, in development only. The two panels
 * inside already turn themselves off outside it - `TanStackRouterDevtoolsPanel` and
 * `ReactQueryDevtoolsPanel` become an empty function when `NODE_ENV !==
 * 'development'` -, but the `TanStackDevtools` shell has no such guard: without the
 * `import.meta.env.DEV` line the tools' floating button shows up on top of the
 * storefront for someone who came to read a news item, and the `@tanstack/devtools`
 * core goes along in the bundle.
 */
export function AppDevtools(): React.JSX.Element | null {
  if (!import.meta.env.DEV) return null

  return (
    <TanStackDevtools
      config={{
        position: 'bottom-right',
      }}
      plugins={[
        {
          name: 'Tanstack Router',
          render: <TanStackRouterDevtoolsPanel />,
        },
        {
          name: 'Tanstack Query',
          render: <ReactQueryDevtoolsPanel />,
        },
      ]}
    />
  )
}
