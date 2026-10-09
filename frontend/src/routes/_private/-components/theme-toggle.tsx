import * as React from 'react'
import { MoonIcon, SunIcon } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'

import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'

/**
 * Alterna entre claro e escuro.
 *
 * Os dois ícones ficam **sempre montados**, empilhados, e a troca é `rotate` +
 * `scale` de um para o outro. Montar e desmontar conforme o tema daria o mesmo
 * resultado estático e nenhuma transição - e, no primeiro render do servidor,
 * ainda escolheria o ícone errado.
 *
 * Por isso também não há `if (!mounted) return null`: o tema resolvido só
 * existe no cliente, mas aqui nada depende dele para renderizar. Quem decide
 * qual ícone aparece é a classe `dark` no `<html>`, que o script do
 * `next-themes` escreve antes da hidratação.
 */
export function ThemeToggle(): React.JSX.Element {
  const { resolvedTheme, setTheme } = useTheme()

  function toggle(): void {
    // Sem ternário: cada estado é uma linha legível de cima para baixo.
    let next = 'dark'
    if (resolvedTheme === 'dark') next = 'light'

    setTheme(next)
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            data-slot="theme-toggle"
            data-test-id="theme-toggle"
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Alternar tema"
            className="relative overflow-hidden"
          >
            <SunIcon
              weight="fill"
              className="absolute rotate-90 scale-0 transition-transform duration-300 motion-reduce:transition-none dark:rotate-0 dark:scale-100"
            />
            <MoonIcon
              weight="fill"
              className="absolute rotate-0 scale-100 transition-transform duration-300 motion-reduce:transition-none dark:-rotate-90 dark:scale-0"
            />
          </Button>
        }
      />
      <TooltipContent side="bottom">Alternar tema</TooltipContent>
    </Tooltip>
  )
}
