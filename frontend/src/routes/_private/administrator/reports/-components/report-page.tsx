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
    { label: 'Turmas', value: totals.classrooms },
    { label: 'Alunos', value: totals.students },
    { label: 'Atletas', value: totals.athletes },
    { label: 'Inscrições', value: totals.enrollments },
    { label: 'Modalidades', value: totals.sports },
    { label: 'Jogos disputados', value: totals.matchesPlayed },
    { label: 'Jogos marcados', value: totals.matchesScheduled },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>Relatórios</PageHeaderTitle>
        <PageHeaderDescription>
          Quem participou dos jogos. Atleta é o aluno inscrito em ao menos uma
          modalidade.
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button
            render={
              <a href={CSV_URL} download="relatorio-jogos.csv">
                <DownloadSimpleIcon />
                Baixar planilha (CSV)
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
            <CardTitle>Por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Turmas</TableHead>
                  <TableHead className="text-right">Alunos</TableHead>
                  <TableHead className="text-right">Atletas</TableHead>
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
            <CardTitle>Por modalidade</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modalidade</TableHead>
                  <TableHead className="text-right">Turmas</TableHead>
                  <TableHead className="text-right">Atletas</TableHead>
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
          <CardTitle>Por turma</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Turma</TableHead>
                <TableHead>Conselheiro</TableHead>
                <TableHead>Representante</TableHead>
                <TableHead className="text-right">Alunos</TableHead>
                <TableHead className="text-right">Atletas</TableHead>
                <TableHead className="text-right">Modalidades</TableHead>
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
                  <TableCell>{row.advisor ?? '—'}</TableCell>
                  <TableCell>{row.representative ?? '—'}</TableCell>
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
