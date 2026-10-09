import type * as React from 'react'
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import { useState } from 'react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group'
import type { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>

/**
 * O campo de senha, com o olho que revela o que foi digitado.
 *
 * O olho é `InputGroupAddon align="inline-end"`, e não um botão posicionado por
 * cima com `absolute`: o grupo reserva a faixa da direita, então o texto nunca
 * passa por baixo do ícone e não é preciso adivinhar um `pr-` que combine com o
 * tamanho do botão.
 */
export function InputPassword({
  className,
  ...props
}: PasswordInputProps): React.JSX.Element {
  const [visible, setVisible] = useState(false)

  let type: 'text' | 'password' = 'password'
  if (visible) type = 'text'

  let label = 'Mostrar a senha'
  if (visible) label = 'Ocultar a senha'

  return (
    <InputGroup className={cn('bg-primary/5', className)}>
      <InputGroupInput {...props} type={type} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          tabIndex={-1}
          aria-label={label}
          onClick={() => setVisible((prev) => !prev)}
          className="text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          {visible && <EyeSlashIcon />}
          {!visible && <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
