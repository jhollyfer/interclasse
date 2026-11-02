import { DownloadSimpleIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import type * as React from 'react'

import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { BASE_URL } from '#/integrations/tanstack-query/http'
import { reportQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { cn } from '#/lib/cn'
import { CATEGORY_LABELS, CATEGORY_SHORT_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

/**
 * The CSV comes straight from the API: the browser follows the link with the same-site cookie,
 * as in the file download (`http.ts`, `BASE_URL`).
 */
const CSV_URL = BASE_URL.concat('/administrator/reports/csv')

/**
 * A table that scrolls sideways inside its own region. The region takes keyboard focus and a
 * name, or whoever navigates by keyboard cannot reach the columns that overflow (axe
 * scrollable-region-focusable, WCAG 2.1.1). The `Table` container stops scrolling so the
 * region is the only scroller.
 */
function ScrollRegion({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>): React.JSX.Element {
  return (
    <div
      role="region"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region needs keyboard focus (axe scrollable-region-focusable, WCAG 2.1.1)
      tabIndex={0}
      className="focus-visible:ring-ring/30 overflow-x-auto rounded-md focus-visible:ring-2 [&>[data-slot=table-container]]:overflow-visible"
    >
      {children}
    </div>
  )
}

function Section({
  title,
  children,
  className,
}: Readonly<{
  title: string
  children: React.ReactNode
  className?: string
}>): React.JSX.Element {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/**
 * The games' numbers: how many classrooms, students and athletes took part, by
 * category, by sport and by classroom. For closing the edition and accounting
 * for it, on screen or in Excel.
 */
export function ReportPage(): React.JSX.Element {
  const { data: report } = useSuspenseQuery(reportQueryOptions())
  const { totals } = report

  // Two numbers carry the edition (who played and how many games were played); the others are
  // reference, in a compact list. Students is left out of the highlights because the
  // athletes are the students who matter here, and both columns are in the tables below.
  const highlights = [
    { label: m.admin_common_athletes(), value: totals.athletes },
    { label: m.admin_reports_matches_played(), value: totals.matchesPlayed },
  ]
  const figures = [
    { label: m.admin_common_classrooms(), value: totals.classrooms },
    { label: m.admin_common_students(), value: totals.students },
    { label: m.admin_reports_registrations(), value: totals.enrollments },
    { label: m.admin_common_sports(), value: totals.sports },
    {
      label: m.admin_reports_matches_scheduled(),
      value: totals.matchesScheduled,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>{m.admin_reports_title()}</PageHeaderTitle>
        <PageHeaderDescription>
          {m.admin_reports_description()}
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button
            render={
              <a href={CSV_URL} download="relatorio-jogos.csv">
                <DownloadSimpleIcon />
                {m.admin_reports_download()}
              </a>
            }
          />
        </PageHeaderActions>
      </PageHeader>

      <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-6">
        {highlights.map((item) => (
          <div
            key={item.label}
            className="col-span-1 flex flex-col pb-3 sm:col-span-3"
          >
            <dt className="text-muted-foreground text-sm">{item.label}</dt>
            <dd className="font-display text-4xl font-extrabold tabular-nums">
              {item.value}
            </dd>
          </div>
        ))}
        {figures.map((item) => (
          <div
            key={item.label}
            className="col-span-full flex items-baseline justify-between gap-4 border-t py-2 text-sm sm:col-span-3"
          >
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="font-semibold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={m.admin_reports_by_category()}>
          <ScrollRegion label={m.admin_reports_by_category()}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{m.admin_common_category()}</TableHead>
                  <TableHead className="text-right">
                    {m.admin_common_classrooms()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m.admin_common_students()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m.admin_common_athletes()}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byCategory.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell>
                      {CATEGORY_LABELS[row.category]}{' '}
                      <span className="text-muted-foreground">
                        ({CATEGORY_SHORT_LABELS[row.category]})
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.classrooms}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.students}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.athletes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollRegion>
        </Section>

        <Section title={m.admin_reports_by_sport()}>
          <ScrollRegion label={m.admin_reports_by_sport()}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{m.admin_common_sport()}</TableHead>
                  <TableHead className="text-right">
                    {m.admin_common_classrooms()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m.admin_common_athletes()}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.bySport.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.classrooms}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.athletes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollRegion>
        </Section>
      </div>

      <Section title={m.admin_reports_by_classroom()}>
        {/* Advisor, representative and sports are reference: they leave below `md`,
            where the table would otherwise cut the representative column without a sign. */}
        <ScrollRegion label={m.admin_reports_by_classroom()}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.admin_reports_classroom()}</TableHead>
                <TableHead className="max-md:hidden">
                  {m.admin_common_advisor()}
                </TableHead>
                <TableHead className="max-md:hidden">
                  {m.admin_common_representative()}
                </TableHead>
                <TableHead className="text-right">
                  {m.admin_common_students()}
                </TableHead>
                <TableHead className="text-right">
                  {m.admin_common_athletes()}
                </TableHead>
                <TableHead className="text-right max-md:hidden">
                  {m.admin_common_sports()}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.classrooms.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.name}{' '}
                    <span className="text-muted-foreground text-xs">
                      {CATEGORY_SHORT_LABELS[row.category]}
                    </span>
                  </TableCell>
                  <TableCell className="max-md:hidden">
                    {row.advisor ?? m.admin_common_no_advisor()}
                  </TableCell>
                  <TableCell className="max-md:hidden">
                    {row.representative ?? m.admin_common_no_representative()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.students}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.athletes}
                  </TableCell>
                  <TableCell className="text-right tabular-nums max-md:hidden">
                    {row.sports}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollRegion>
      </Section>
    </div>
  )
}
