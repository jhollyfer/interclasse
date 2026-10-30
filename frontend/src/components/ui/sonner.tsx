'use client'

import {
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
  XCircleIcon,
  SpinnerIcon,
} from '@phosphor-icons/react'
import { Toaster as Sonner } from 'sonner'
import type { ToasterProps } from 'sonner'

import { useTheme } from '#/components/common/theme-provider'
import type { CssVars } from '#/lib/css-vars'

const Toaster = ({ ...props }: ToasterProps) => {
  // casa: tema do cookie da casa no lugar do `next-themes`
  const { theme } = useTheme('Toaster')
  const style: CssVars = {
    '--normal-bg': 'var(--popover)',
    '--normal-text': 'var(--popover-foreground)',
    '--normal-border': 'var(--border)',
    '--border-radius': 'var(--radius)',
  }

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4" />,
        error: <XCircleIcon className="size-4" />,
        loading: <SpinnerIcon className="size-4 animate-spin" />,
      }}
      style={style}
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
