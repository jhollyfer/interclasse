import { USER_ROLE } from '@interclasse/shared'
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  PencilSimpleIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useRouter } from '@tanstack/react-router'
import type * as React from 'react'
import { toast } from 'sonner'

import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogDescription,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderBack,
  PageHeaderBadges,
  PageHeaderDescription,
  PageHeaderTitle,
  PageShell,
  PageShellContent,
  PageShellHeader,
} from '#/components/common/page-shell'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import {
  useUserArchiveMutation,
  useUserDeleteMutation,
  useUserUnarchiveMutation,
} from '#/integrations/tanstack-query/mutations/administrator'
import { userQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { notifyError } from '#/lib/form-errors'
import {
  ACCOUNT_STATUS_LABELS,
  ACTIVE_STATUS_VARIANTS,
  USER_ROLE_LABELS,
  USER_ROLE_VARIANTS,
  formatDate,
  initials,
} from '#/lib/labels'
import { m } from '#/paraglide/messages'

const route = getRouteApi('/_private/administrator/users/$id/')

export function UserDetail(): React.JSX.Element {
  const { id } = route.useParams()
  // The client comes from the router context, which is where `query-context.ts` puts it
  // - the same one the `loader`s use. `useQueryClient()` would ask again for
  // what the route already delivers.
  const { queryClient, account } = route.useRouteContext()
  // Only the administrator deletes for good. See the comment in the listing.
  const canDelete = account.role === USER_ROLE.ADMINISTRATOR
  // The account itself is neither archived nor deleted: the backend answers
  // `403 SELF_ARCHIVE_FORBIDDEN` and `403 SELF_DELETE_FORBIDDEN`.
  const isSelf = account.id === id
  const router = useRouter()

  const { data: user } = useSuspenseQuery(userQueryOptions(id))

  async function invalidate(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.administrator.users.all,
    })
  }

  const archive = useUserArchiveMutation({
    onError: (error) => notifyError(error, { id: 'user-archive' }),
    async onSuccess() {
      toast.success(m.admin_users_archived_ok({ name: user.name }))
      await invalidate()
      // Once archived, the detail answers 404 (the backend hides the archived
      // outside the trash): staying here left the screen stuck in the old state.
      await router.navigate({ to: '/administrator/users' })
    },
  })
  const unarchive = useUserUnarchiveMutation({
    onError: (error) => notifyError(error, { id: 'user-archive' }),
    onSuccess: invalidate,
  })
  const remove = useUserDeleteMutation({
    onError: (error) => notifyError(error, { id: 'user-delete' }),
    async onSuccess() {
      await invalidate()
      // The record no longer exists: staying on its screen would give a 404 on the next
      // refetch.
      await router.navigate({ to: '/administrator/users' })
    },
  })

  const status = ACCOUNT_STATUS_LABELS[user.status] ?? user.status
  const role = USER_ROLE_LABELS[user.role] ?? user.role

  return (
    <PageShell>
      <PageShellHeader>
        <PageHeader>
          <PageHeaderBack to="/administrator/users" />
          <PageHeaderTitle>
            {user.name}
            <PageHeaderBadges>
              <Badge variant={USER_ROLE_VARIANTS[user.role]}>{role}</Badge>
              <Badge variant={ACTIVE_STATUS_VARIANTS[user.status]}>
                {status}
              </Badge>
              {user.deletedAt && (
                <Badge variant="outline">
                  {m.admin_users_archived_badge()}
                </Badge>
              )}
            </PageHeaderBadges>
          </PageHeaderTitle>
          <PageHeaderDescription>{user.email}</PageHeaderDescription>
          <PageHeaderActions>
            <Button
              variant="outline"
              render={
                <Link to="/administrator/users/$id/edit" params={{ id }}>
                  <PencilSimpleIcon />
                  {m.admin_common_edit()}
                </Link>
              }
            />

            {!user.deletedAt && !isSelf && (
              <ConfirmDialog
                onConfirm={() => archive.mutate(id)}
                render={
                  <Button variant="outline">
                    <ArchiveIcon />
                    {m.admin_common_archive()}
                  </Button>
                }
              >
                <ConfirmDialogHeader>
                  <ConfirmDialogTitle>
                    {m.admin_users_archive_title({ name: user.name })}
                  </ConfirmDialogTitle>
                  <ConfirmDialogDescription>
                    {m.admin_users_archive_description()}
                  </ConfirmDialogDescription>
                </ConfirmDialogHeader>
                <ConfirmDialogFooter>
                  <ConfirmDialogCancel />
                  <ConfirmDialogConfirm>
                    {m.admin_common_archive()}
                  </ConfirmDialogConfirm>
                </ConfirmDialogFooter>
              </ConfirmDialog>
            )}

            {user.deletedAt && (
              <ConfirmDialog
                onConfirm={() => unarchive.mutate(id)}
                render={
                  <Button variant="outline">
                    <ArrowCounterClockwiseIcon />
                    {m.admin_common_restore()}
                  </Button>
                }
              >
                <ConfirmDialogHeader>
                  <ConfirmDialogTitle>
                    {m.admin_users_restore_title({ name: user.name })}
                  </ConfirmDialogTitle>
                  <ConfirmDialogDescription>
                    {m.admin_users_restore_description()}
                  </ConfirmDialogDescription>
                </ConfirmDialogHeader>
                <ConfirmDialogFooter>
                  <ConfirmDialogCancel />
                  <ConfirmDialogConfirm>
                    {m.admin_common_restore()}
                  </ConfirmDialogConfirm>
                </ConfirmDialogFooter>
              </ConfirmDialog>
            )}

            {/* Only on what is already archived: `delete.use-case.ts` refuses a live
                account with `409 USER_NOT_ARCHIVED`. */}
            {user.deletedAt && canDelete && !isSelf && (
              <ConfirmDialog
                destructive
                onConfirm={() => remove.mutate(id)}
                render={
                  <Button variant="destructive">
                    <TrashIcon />
                    {m.admin_common_remove()}
                  </Button>
                }
              >
                <ConfirmDialogHeader>
                  <ConfirmDialogTitle>
                    {m.admin_users_remove_title({ name: user.name })}
                  </ConfirmDialogTitle>
                  <ConfirmDialogDescription>
                    {m.admin_users_remove_description()}
                  </ConfirmDialogDescription>
                </ConfirmDialogHeader>
                <ConfirmDialogFooter>
                  <ConfirmDialogCancel />
                  <ConfirmDialogConfirm>
                    {m.admin_common_remove()}
                  </ConfirmDialogConfirm>
                </ConfirmDialogFooter>
              </ConfirmDialog>
            )}
          </PageHeaderActions>
        </PageHeader>
      </PageShellHeader>

      <PageShellContent>
        <Card>
          <CardHeader>
            <CardTitle>{m.admin_users_account_card()}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              {/* Without a photo, the space is still reserved and `AvatarFallback`
                  draws the initials: the row does not change height because of
                  a file that was not uploaded. */}
              <Avatar className="size-16">
                <AvatarImage src={user.avatar?.url} alt="" />
                <AvatarFallback className="bg-brand text-brand-ink font-semibold">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold">{user.name}</span>
                <span className="text-muted-foreground text-sm">
                  {user.email}
                </span>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground text-xs">
                  {m.admin_common_role()}
                </dt>
                <dd className="text-sm">{role}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  {m.admin_common_status()}
                </dt>
                <dd className="text-sm">{status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  {m.admin_common_created_on()}
                </dt>
                <dd className="text-sm">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  {m.admin_users_last_changed()}
                </dt>
                <dd className="text-sm">{formatDate(user.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  {m.admin_users_archived_on()}
                </dt>
                <dd className="text-sm">{formatDate(user.deletedAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </PageShellContent>
    </PageShell>
  )
}
