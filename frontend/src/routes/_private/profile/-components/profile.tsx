import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  EnvelopeSimpleIcon,
  IdentificationCardIcon,
  PencilSimpleIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react'

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  PageShell,
  PageShellContent,
  PageShellHeader,
} from '#/components/common/page-shell'
import {
  ACCOUNT_STATUS_LABELS,
  ACTIVE_STATUS_VARIANTS,
  USER_ROLE_LABELS,
  USER_ROLE_VARIANTS,
  formatDate,
  initials,
} from '#/lib/labels'
import { accountQueryOptions } from '#/integrations/tanstack-query/queries'

/**
 * A ficha da própria conta.
 *
 * Ler e editar são telas separadas, como na referência
 * (`simple-hub/.../_private/profile/`): esta é a única tela do painel que a
 * pessoa abre para **conferir** quem ela é - o papel que tem, se a conta está
 * ativa, desde quando existe -, e um formulário não responde nada disso sem
 * ser preenchido. Juntas, abrir o perfil significava entrar em modo de edição
 * de senha para descobrir o próprio e-mail.
 *
 * Papel e situação aparecem aqui e **não** no formulário, e é a mesma razão de
 * o `PUT /account` não aceitá-los: o papel é decisão de quem cria a conta, e
 * ninguém se inativa. São dados a ler, não campos a preencher.
 */
export function Profile(): React.JSX.Element {
  // O `loader` da rota já garantiu o dado; aqui é leitura de cache.
  const { data: account } = useSuspenseQuery(accountQueryOptions())

  return (
    <PageShell>
      {/* `PageShellHeader` cru, e não `PageHeader`: o cabeçalho do perfil abre
          com o avatar, e não com um título - é o caso para o qual o slot existe
          separado do componente de título. */}
      <PageShellHeader>
        <div className="flex items-center gap-4">
          <Avatar className="size-14 ring-1 ring-brand/40 ring-offset-2 ring-offset-background">
            <AvatarImage src={account.avatar?.url} alt="" />
            <AvatarFallback className="bg-brand font-semibold text-brand-ink">
              {initials(account.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">{account.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {/* O `??` cobre um papel ou uma situação nova do backend
                  chegando aqui antes de esta tela saber dela: melhor imprimir
                  `EDITOR` cru do que um badge vazio. */}
              <Badge variant={USER_ROLE_VARIANTS[account.role]}>
                {USER_ROLE_LABELS[account.role] ?? account.role}
              </Badge>
              <Badge variant={ACTIVE_STATUS_VARIANTS[account.status]}>
                {ACCOUNT_STATUS_LABELS[account.status] ?? account.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                No painel desde {formatDate(account.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <Button
          render={
            <Link to="/profile/edit">
              <PencilSimpleIcon />
              Editar perfil
            </Link>
          }
        />
      </PageShellHeader>

      <PageShellContent>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IdentificationCardIcon />
              Identidade e acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Detail icon={<IdentificationCardIcon />} label="Nome">
              {account.name}
            </Detail>
            <Detail icon={<EnvelopeSimpleIcon />} label="E-mail">
              {account.email}
            </Detail>
            {/* A senha não se mostra, nem mascarada: um "••••••••" sugere que o
                painel a conhece, e ele não conhece - o backend guarda o hash.
                O que dá para dizer é onde trocá-la. */}
            <Detail icon={<ShieldCheckIcon />} label="Senha">
              <Link
                to="/profile/edit"
                className="text-primary underline-offset-4 hover:underline"
              >
                Trocar senha
              </Link>
            </Detail>
          </CardContent>
        </Card>
      </PageShellContent>
    </PageShell>
  )
}

type DetailProps = Readonly<{
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}>

function Detail({ icon, label, children }: DetailProps): React.JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm">{children}</span>
      </div>
    </div>
  )
}
