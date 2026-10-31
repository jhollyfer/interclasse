import {
  EnvelopeSimpleIcon,
  IdentificationCardIcon,
  PencilSimpleIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type * as React from 'react'

import {
  PageShell,
  PageShellContent,
  PageShellHeader,
} from '#/components/common/page-shell'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { accountQueryOptions } from '#/integrations/tanstack-query/queries/account'
import {
  ACCOUNT_STATUS_LABELS,
  ACTIVE_STATUS_VARIANTS,
  USER_ROLE_LABELS,
  USER_ROLE_VARIANTS,
  formatDate,
  initials,
} from '#/lib/labels'
import { m } from '#/paraglide/messages'

/**
 * The account's own record.
 *
 * Reading and editing are separate screens, as in the reference
 * (`simple-hub/.../_private/profile/`): this is the only dashboard screen that the
 * person opens to **check** who they are - the role they have, whether the account is
 * active, since when it exists -, and a form answers none of that without
 * being filled in. Together, opening the profile meant entering password
 * edit mode to find out one's own e-mail.
 *
 * Role and status appear here and **not** in the form, and it is the same reason
 * `PUT /account` does not accept them: the role is the decision of whoever creates the account, and
 * nobody deactivates themselves. They are data to read, not fields to fill in.
 */
export function Profile(): React.JSX.Element {
  // The route's `loader` already guaranteed the data; here it is a cache read.
  const { data: account } = useSuspenseQuery(accountQueryOptions())

  return (
    <PageShell>
      {/* Raw `PageShellHeader`, and not `PageHeader`: the profile header opens
          with the avatar, and not with a title - it is the case the slot exists for,
          separate from the title component. */}
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
              {/* The `??` covers a new backend role or status
                  arriving here before this screen knows about it: better to print a raw
                  `EDITOR` than an empty badge. */}
              <Badge variant={USER_ROLE_VARIANTS[account.role]}>
                {USER_ROLE_LABELS[account.role] ?? account.role}
              </Badge>
              <Badge variant={ACTIVE_STATUS_VARIANTS[account.status]}>
                {ACCOUNT_STATUS_LABELS[account.status] ?? account.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {m.profile_member_since({
                  date: formatDate(account.createdAt),
                })}
              </span>
            </div>
          </div>
        </div>

        <Button
          render={
            <Link to="/profile/edit">
              <PencilSimpleIcon />
              {m.profile_edit()}
            </Link>
          }
        />
      </PageShellHeader>

      <PageShellContent>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IdentificationCardIcon />
              {m.profile_card_title()}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Detail icon={<IdentificationCardIcon />} label={m.common_name()}>
              {account.name}
            </Detail>
            <Detail icon={<EnvelopeSimpleIcon />} label={m.common_email()}>
              {account.email}
            </Detail>
            {/* The password is not shown, not even masked: a "••••••••" suggests that the
                dashboard knows it, and it does not - the backend stores the hash.
                What can be said is where to change it. */}
            <Detail icon={<ShieldCheckIcon />} label={m.common_password()}>
              <Link
                to="/profile/edit"
                className="text-primary underline-offset-4 hover:underline"
              >
                {m.profile_change_password()}
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
