import { getRouteApi, Link, useRouter } from '@tanstack/react-router'
import type * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  PencilSimpleIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
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
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogDescription,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { UserRoles } from '#/lib/entity'
import { userQueryOptions } from '#/integrations/tanstack-query/queries'
import {
  useUserArchive,
  useUserDelete,
  useUserUnarchive,
} from '#/integrations/tanstack-query/mutations'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import {
  ACCOUNT_STATUS_LABELS,
  ACTIVE_STATUS_VARIANTS,
  USER_ROLE_LABELS,
  USER_ROLE_VARIANTS,
  formatDate,
  initials,
} from '#/lib/labels'

const route = getRouteApi('/_private/administrator/users/$id/')

export function UserDetail(): React.JSX.Element {
  const { id } = route.useParams()
  // O client vem do contexto do router, que é onde `query-context.ts` o
  // coloca - o mesmo que os `loader` usam. `useQueryClient()` pediria de novo
  // o que a rota já entrega.
  const { queryClient, account } = route.useRouteContext()
  // Só administrador apaga de vez. Ver o comentário na listagem.
  const canDelete = account.role === UserRoles.ADMINISTRATOR
  // A própria conta não se arquiva nem se apaga: o backend responde
  // `403 SELF_ARCHIVE_FORBIDDEN` e `403 SELF_DELETE_FORBIDDEN`.
  const isSelf = account.id === id
  const router = useRouter()

  const { data: user } = useSuspenseQuery(userQueryOptions(id))

  async function invalidate(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
  }

  const archive = useUserArchive({
    onError: (error) => toast.error(error.message, { id: 'user-archive' }),
    async onSuccess() {
      toast.success(`Conta de ${user.name} arquivada.`)
      await invalidate()
      // Arquivado, o detalhe responde 404 (o backend esconde o arquivado
      // fora da lixeira): ficar aqui deixava a tela parada no estado antigo.
      await router.navigate({ to: '/administrator/users' })
    },
  })
  const unarchive = useUserUnarchive({
    onError: (error) => toast.error(error.message, { id: 'user-archive' }),
    onSuccess: invalidate,
  })
  const remove = useUserDelete({
    onError: (error) => toast.error(error.message, { id: 'user-delete' }),
    async onSuccess() {
      await invalidate()
      // O registro não existe mais: ficar na tela dele daria 404 no próximo
      // refetch.
      router.navigate({ to: '/administrator/users' })
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
              {user.deletedAt && <Badge variant="outline">Arquivado</Badge>}
            </PageHeaderBadges>
          </PageHeaderTitle>
          <PageHeaderDescription>{user.email}</PageHeaderDescription>
          <PageHeaderActions>
            <Button
              variant="outline"
              render={
                <Link to="/administrator/users/$id/edit" params={{ id }}>
                  <PencilSimpleIcon />
                  Editar
                </Link>
              }
            />

            {!user.deletedAt && !isSelf && (
              <ConfirmDialog
                onConfirm={() => archive.mutate(id)}
                trigger={
                  <Button variant="outline">
                    <ArchiveIcon />
                    Arquivar
                  </Button>
                }
              >
                <ConfirmDialogHeader>
                  <ConfirmDialogTitle>{`Arquivar a conta de ${user.name}?`}</ConfirmDialogTitle>
                  <ConfirmDialogDescription>
                    Ela deixa de entrar no painel e sai da listagem, e pode ser
                    restaurada depois.
                  </ConfirmDialogDescription>
                </ConfirmDialogHeader>
                <ConfirmDialogFooter>
                  <ConfirmDialogCancel />
                  <ConfirmDialogConfirm>Arquivar</ConfirmDialogConfirm>
                </ConfirmDialogFooter>
              </ConfirmDialog>
            )}

            {user.deletedAt && (
              <ConfirmDialog
                onConfirm={() => unarchive.mutate(id)}
                trigger={
                  <Button variant="outline">
                    <ArrowCounterClockwiseIcon />
                    Restaurar
                  </Button>
                }
              >
                <ConfirmDialogHeader>
                  <ConfirmDialogTitle>{`Restaurar a conta de ${user.name}?`}</ConfirmDialogTitle>
                  <ConfirmDialogDescription>
                    Ela volta para a listagem, na situação em que estava.
                  </ConfirmDialogDescription>
                </ConfirmDialogHeader>
                <ConfirmDialogFooter>
                  <ConfirmDialogCancel />
                  <ConfirmDialogConfirm>Restaurar</ConfirmDialogConfirm>
                </ConfirmDialogFooter>
              </ConfirmDialog>
            )}

            {/* Só no que já está arquivado: o `delete.use-case.ts` recusa conta
                viva com `409 USER_NOT_ARCHIVED`. */}
            {user.deletedAt && canDelete && !isSelf && (
              <ConfirmDialog
                destructive
                onConfirm={() => remove.mutate(id)}
                trigger={
                  <Button variant="destructive">
                    <TrashIcon />
                    Remover
                  </Button>
                }
              >
                <ConfirmDialogHeader>
                  <ConfirmDialogTitle>{`Remover a conta de ${user.name}?`}</ConfirmDialogTitle>
                  <ConfirmDialogDescription>
                    O registro é apagado de vez. Não dá para desfazer.
                  </ConfirmDialogDescription>
                </ConfirmDialogHeader>
                <ConfirmDialogFooter>
                  <ConfirmDialogCancel />
                  <ConfirmDialogConfirm>Remover</ConfirmDialogConfirm>
                </ConfirmDialogFooter>
              </ConfirmDialog>
            )}
          </PageHeaderActions>
        </PageHeader>
      </PageShellHeader>

      <PageShellContent>
        <Card>
          <CardHeader>
            <CardTitle>A conta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              {/* Sem foto, o espaço continua reservado e o `AvatarFallback`
                  desenha as iniciais: a linha não muda de altura por causa de
                  um arquivo que não subiu. */}
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
                <dt className="text-muted-foreground text-xs">Papel</dt>
                <dd className="text-sm">{role}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Situação</dt>
                <dd className="text-sm">{status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Criado em</dt>
                <dd className="text-sm">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  Última alteração
                </dt>
                <dd className="text-sm">{formatDate(user.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Arquivado em</dt>
                <dd className="text-sm">{formatDate(user.deletedAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </PageShellContent>
    </PageShell>
  )
}
