import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'
import type * as React from 'react'
import { useState } from 'react'

import type { Input } from '#/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

type PasswordInputProps = Readonly<
  Omit<React.ComponentProps<typeof Input>, 'type'>
>

/**
 * The password field, with the eye that reveals what was typed.
 *
 * The eye is `InputGroupAddon align="inline-end"`, and not a button positioned on
 * top with `absolute`: the group reserves the right-hand strip, so the text never
 * goes under the icon and there is no need to guess a `pr-` that matches the
 * button's size.
 */
export function InputPassword({
  className,
  ...props
}: PasswordInputProps): React.JSX.Element {
  const [visible, setVisible] = useState(false)

  let type: 'text' | 'password' = 'password'
  if (visible) type = 'text'

  let label = m.common_show_password()
  if (visible) label = m.common_hide_password()

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
