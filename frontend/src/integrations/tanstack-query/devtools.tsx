import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

/**
 * As ferramentas de desenvolvimento, só em desenvolvimento. Os dois painéis de
 * dentro já se anulam sozinhos fora dele - `TanStackRouterDevtoolsPanel` e
 * `ReactQueryDevtoolsPanel` viram função vazia quando `NODE_ENV !==
 * 'development'` -, mas a casca `TanStackDevtools` não tem essa guarda: sem a
 * linha do `import.meta.env.DEV` o botão flutuante das ferramentas aparece por
 * cima da vitrine para quem entrou para ler uma notícia, e o núcleo
 * `@tanstack/devtools` vai junto no bundle.
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
