import type * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { DownloadSimpleIcon } from '@phosphor-icons/react'

import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
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
import { CATEGORY_LABELS, CATEGORY_SHORT_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

/**
 * O CSV sai direto da API: o navegador segue o link com o cookie de mesmo site,
 * como no download de arquivo (`http.ts`, `BASE_URL`).
 */
const CSV_URL = BASE_URL.concat('/administrator/reports/csv')

/**
 * Os números dos jogos: quantas turmas, alunos e atletas participaram, por
 * categoria, por modalidade e por turma. Para fechar a edição e prestar
 * contas, na tela ou no Excel.
 */
export function ReportPage(): React.JSX.Element {
  const { data: report } = useSuspenseQuery(reportQueryOptions())
  const { totals } = report

  const highlights = [
    { label: m.admin_common_classrooms(), value: totals.classrooms },
    { label: m.admin_common_students(), value: totals.students },
    { label: m.admin_common_athletes(), value: totals.athletes },
    { label: m.admin_reports_registrations(), value: totals.enrollments },
    { label: m.admin_common_sports(), value: totals.sports },
    { label: m.admin_reports_matches_played(), value: totals.matchesPlayed },
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

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {highlights.map((item) => (
          <Card key={item.label} className="gap-1 py-4">
            <CardContent>
              <dt className="text-muted-foreground text-sm">{item.label}</dt>
              <dd className="font-display text-3xl font-extrabold tabular-nums">
                {item.value}
              </dd>
            </CardContent>
          </Card>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{m.admin_reports_by_category()}</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{m.admin_reports_by_sport()}</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{m.admin_reports_by_classroom()}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.admin_reports_classroom()}</TableHead>
                <TableHead>{m.admin_common_advisor()}</TableHead>
                <TableHead>{m.admin_common_representative()}</TableHead>
                <TableHead className="text-right">
                  {m.admin_common_students()}
                </TableHead>
                <TableHead className="text-right">
                  {m.admin_common_athletes()}
                </TableHead>
                <TableHead className="text-right">
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
                  <TableCell>
                    {row.advisor ?? m.admin_common_no_advisor()}
                  </TableCell>
                  <TableCell>
                    {row.representative ?? m.admin_common_no_representative()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.students}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.athletes}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.sports}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
