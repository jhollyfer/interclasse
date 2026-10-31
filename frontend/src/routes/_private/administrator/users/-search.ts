import { withExtra } from '#/lib/list-search'

/**
 * `?role=` and `?status=` trim the listing, as the
 * `UserPaginateValidator` accepts: one separates who administers from
 * who edits, the other separates who gets in from who was deactivated without being
 * archived.
 *
 * `as const` is not decoration: without it `TKey` infers `string`, the return becomes an
 * open index and the router's search union stops closing - the table's generic
 * components stop compiling.
 */
export const validateSearch = withExtra(['role', 'status'] as const)
