/**
 * The dashboard trail, derived from the routes that matched.
 *
 * From the routes, and not from `location.pathname` alone, for a single reason: a path
 * split into segments produces destinations that do not exist, and a link to them
 * would lead to a 404. The set of matched routes' `pathname` answers which
 * prefixes are really navigable, so only those become links.
 *
 * Lives outside `routes/` so it can be tested without the tree generator
 * treating the test file as a route - same reason as `list-search.ts`.
 */

import { m } from '#/paraglide/messages'

export type Crumb = {
  label: string
  /** Absent when the prefix is not a route, or when it is the current page. */
  to?: string
}

/**
 * The label of each fixed path segment. A lookup object for the same reason as
 * `labels.ts`: a new segment without a label here shows up raw, and does not vanish.
 *
 * The six Cycle 2 resources are already in the list. A segment label costs
 * no route at all - it is only read when the path exists -, and writing them now
 * keeps the brackets screen from being born with "brackets" in the trail.
 */
const SEGMENT_LABELS: Record<string, string | undefined> = {
  get administrator() {
    return m.label_breadcrumb_panel()
  },
  get profile() {
    return m.label_breadcrumb_profile()
  },
  get brackets() {
    return m.label_breadcrumb_brackets()
  },
  get matches() {
    return m.label_breadcrumb_matches()
  },
  get cards() {
    return m.label_breadcrumb_cards()
  },
  get removals() {
    return m.label_breadcrumb_removals()
  },
  get classrooms() {
    return m.label_breadcrumb_classrooms()
  },
  get sports() {
    return m.label_breadcrumb_sports()
  },
  get announcements() {
    return m.label_breadcrumb_announcements()
  },
  get photos() {
    return m.label_breadcrumb_photos()
  },
  get site() {
    return m.label_breadcrumb_site()
  },
  get reports() {
    return m.label_breadcrumb_reports()
  },
  get users() {
    return m.label_breadcrumb_users()
  },
  get advisor() {
    return m.label_breadcrumb_advisor()
  },
  get representative() {
    return m.label_breadcrumb_representative()
  },
  get new() {
    return m.label_breadcrumb_new()
  },
  get edit() {
    return m.label_breadcrumb_edit()
  },
}

function segments(path: string): Array<string> {
  return path.split('/').filter(Boolean)
}

/** What the router calls a match, reduced to what the trail needs. */
export type BreadcrumbMatch = {
  /** With the parameters still to fill in: `/administrator/testimonials/$id`. */
  fullPath: string
  /** With the parameters filled in: `/administrator/testimonials/abc-123`. */
  pathname: string
}

/**
 * `fullPath` and `pathname` run in parallel: the first says whether the segment is a
 * parameter (`$id`) and the second says its value. It is the pair that allows labeling
 * "Detalhe" where there is a uuid, instead of printing the uuid in the trail.
 */
export function buildBreadcrumbs(
  matches: ReadonlyArray<BreadcrumbMatch>,
): Array<Crumb> {
  const last = matches.at(-1)

  if (!last) return []

  const navigable = new Set(
    matches.map((match) => match.pathname.replace(/\/$/, '')),
  )

  const pattern = segments(last.fullPath)
  const actual = segments(last.pathname)
  const crumbs: Array<Crumb> = []

  for (const [index, value] of actual.entries()) {
    const token = pattern[index] ?? value
    const to = '/'.concat(actual.slice(0, index + 1).join('/'))

    let label = SEGMENT_LABELS[token] ?? value

    // Identifier parameter: the uuid says nothing to whoever reads.
    if (token.startsWith('$')) label = m.label_breadcrumb_detail()

    const crumb: Crumb = { label }

    // The current page is never a link, and a prefix that matched no route
    // is not either.
    if (index < actual.length - 1 && navigable.has(to)) crumb.to = to

    crumbs.push(crumb)
  }

  return crumbs
}

/**
 * The tab title on the dashboard, taken from the same trail: from the most specific to
 * the most general, "Detalhe · Chaves". The root's "Painel" only shows up alone - on
 * every tab it would be noise, and it is the part that goes away when the tab shrinks.
 */
export function breadcrumbTitle(crumbs: ReadonlyArray<Crumb>): string {
  const labels = crumbs.map((crumb) => crumb.label)
  // "Detalhe" in the middle ("Editar · Detalhe · Avisos") says nothing; it only
  // counts when it is the page itself.
  // The root's "Painel" goes out; another role's root ("Minhas turmas") stays, or
  // the advisor's tab would say just "Detalhe".
  let start = 0
  if (labels[0] === m.label_breadcrumb_panel()) start = 1
  const specific = labels
    .slice(start)
    .filter(
      (label, index, all) =>
        label !== m.label_breadcrumb_detail() || index === all.length - 1,
    )

  if (specific.length === 0) return labels.join('')

  return specific.reverse().join(' · ')
}
