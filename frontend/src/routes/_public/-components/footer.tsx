import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import { InstagramLogoIcon } from '@phosphor-icons/react'

import { NAVIGATION } from './menu'
import { BrandMark } from '#/components/common/brand-mark'

/** O Instagram da escola, como no site anterior. */
const INSTAGRAM = 'https://instagram.com/cmei_cosme-jean'

export function Footer(): React.JSX.Element {
  return (
    <footer
      data-slot="public-footer"
      className="bg-brand-ink border-accent mt-12 border-t-4 text-white"
    >
      <div className="container mx-auto flex flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <BrandMark />
          <p className="max-w-sm text-sm text-white/70">
            Jogos Estudantis do Centro Municipal de Educação Integral Cosme
            Jean.
          </p>
        </div>

        <nav className="flex flex-col gap-2 text-sm" aria-label="Rodapé">
          {NAVIGATION.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="py-1 text-white/70 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          href={INSTAGRAM}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 py-1 text-sm text-white/70 hover:text-white"
        >
          <InstagramLogoIcon className="size-5" />
          @cmei_cosme-jean
        </a>
      </div>

      <div className="border-t border-white/10">
        <p className="container mx-auto px-4 py-4 text-sm text-white/70">
          Desenvolvido por{' '}
          <a
            href="https://maiyu.com.br"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-white underline-offset-4 hover:underline"
          >
            Maiyu
          </a>{' '}
          - Consultoria e Desenvolvimento em Tecnologia
        </p>
      </div>
    </footer>
  )
}
