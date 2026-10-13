import * as React from 'react'
import { LockSimpleIcon } from '@phosphor-icons/react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { IEnrollmentBoard } from '#/lib/interfaces'
import { plural } from '#/lib/labels'

type EnrollmentBoardProps = {
  board: IEnrollmentBoard
  /** Grava a lista inteira da modalidade. */
  onSave: (sportId: string, studentIds: Array<string>) => void
  /** A modalidade sendo salva agora. Só o cartão dela trava. */
  savingSportId?: string
  /**
   * Se dá para tirar atleta já salvo. O representante só acrescenta; quem
   * tira é o professor conselheiro - e o servidor recusa com `403`.
   */
  canRemove?: boolean
}

/**
 * A lista de atletas por modalidade: um cartão por modalidade, uma caixa por
 * aluno. Salvar manda a lista inteira daquela modalidade - é o contrato de
 * `PUT /advisor/enrollments` e `PUT /representative/enrollments`.
 *
 * Mora em `common` porque o conselheiro e o representante usam a mesma tela.
 * O estado é local por modalidade: marcar caixas não chama a API até salvar.
 */
export function EnrollmentBoard({
  board,
  onSave,
  savingSportId,
  canRemove = true,
}: EnrollmentBoardProps): React.JSX.Element {
  if (board.students.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        A turma ainda não tem alunos. A lista de alunos vem antes das
        inscrições.
      </p>
    )
  }

  if (board.sports.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        Nenhuma modalidade cadastrada ainda.
      </p>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {board.sports.map((sport) => (
        <SportCard
          key={sport.id}
          sport={sport}
          students={board.students}
          onSave={onSave}
          isSaving={savingSportId === sport.id}
          canRemove={canRemove}
        />
      ))}
    </div>
  )
}

/** A contagem fora dos limites pede atenção. */
const COUNT_VARIANT: Record<string, 'warning' | 'neutral'> = {
  true: 'warning',
  false: 'neutral',
}

function SportCard({
  sport,
  students,
  onSave,
  isSaving,
  canRemove,
}: {
  sport: IEnrollmentBoard['sports'][number]
  students: IEnrollmentBoard['students']
  onSave: EnrollmentBoardProps['onSave']
  isSaving?: boolean
  canRemove: boolean
}): React.JSX.Element {
  const enrolled = students
    .filter((student) => student.sportIds.includes(sport.id))
    .map((student) => student.id)
  // Chave estável da lista gravada: o cartão só volta ao estado do servidor
  // quando a lista DESTA modalidade mudou, e não a cada refetch - que
  // apagaria o que foi marcado e ainda não salvo nos outros cartões.
  const savedKey = [...enrolled].sort().join(',')
  const initial = React.useMemo(
    () => new Set(savedKey.split(',').filter(Boolean)),
    [savedKey],
  )
  const [selected, setSelected] = React.useState(initial)

  React.useEffect(() => setSelected(initial), [initial])

  const over = selected.size > sport.maxAthletes
  const under = selected.size > 0 && selected.size < sport.minAthletes
  const dirty =
    selected.size !== initial.size ||
    [...selected].some((id) => !initial.has(id))

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(id)
    if (!checked) next.delete(id)
    setSelected(next)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="flex-1">{sport.name}</CardTitle>
        {sport.locked && (
          <Badge variant="neutral">
            <LockSimpleIcon />
            Sorteada
          </Badge>
        )}
        <Badge variant={COUNT_VARIANT[String(over || under)]}>
          {plural(selected.size, 'atleta', 'atletas')} · {sport.minAthletes} a{' '}
          {sport.maxAthletes}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="grid gap-2 sm:grid-cols-2">
          {students.map((student) => (
            <li key={student.id}>
              {/* Travado, quem não foi inscrito fica apagado: com a mesma cor de
                  tudo, a lista sorteada parecia editável. */}
              <label className="flex items-center gap-2 text-sm has-data-disabled:cursor-not-allowed has-data-disabled:not-has-data-checked:text-muted-foreground">
                <Checkbox
                  checked={selected.has(student.id)}
                  disabled={
                    sport.locked || (!canRemove && initial.has(student.id))
                  }
                  onCheckedChange={(checked) =>
                    toggle(student.id, checked === true)
                  }
                />
                {student.name}
              </label>
            </li>
          ))}
        </ul>
        {over && !sport.locked && (
          <p className="text-destructive text-xs">
            {`Passou do máximo: desmarque ${selected.size - sport.maxAthletes} para salvar.`}
          </p>
        )}
        {under && !sport.locked && (
          <p className="text-muted-foreground text-xs">
            Abaixo do mínimo, a turma fica fora do sorteio desta modalidade.
          </p>
        )}
        {!sport.locked && (
          <Button
            className="self-end"
            size="sm"
            disabled={!dirty || over || isSaving}
            onClick={() => onSave(sport.id, [...selected])}
          >
            Salvar {sport.name}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
