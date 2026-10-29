import { CATEGORY, type Category } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { violatedConstraint } from '#features/_shared.database'

/**
 * A categoria que o ano determina. Derivada, e nunca enviada pelo cliente: um
 * 9º ano gravado como `F1` jogaria contra crianças de 8 anos.
 */
export function categoryOf(grade: number): Category {
  if (grade <= 5) return CATEGORY.F1

  return CATEGORY.F2
}

/** O 409 de cada `unique` de `classrooms`, pelo nome que a migration deu a ele. */
const CONFLICTS: Record<string, () => HTTPException> = {
  classrooms_advisor_id_unique: () =>
    HTTPException.Conflict('Conselheiro já vinculado a outra turma', 'ADVISOR_TAKEN', {
      advisorId: 'Este conselheiro já está em outra turma',
    }),
  classrooms_representative_id_unique: () =>
    HTTPException.Conflict('Representante já vinculado a outra turma', 'REPRESENTATIVE_TAKEN', {
      representativeId: 'Este representante já está em outra turma',
    }),
}

/**
 * A corrida que a checagem antes do `INSERT`/`UPDATE` não fecha: o segundo
 * pedido esbarra num `unique` do banco, e cada um vira o 409 do campo dele. O
 * nome da turma é o que sobra.
 */
export function classroomConflict(error: unknown): HTTPException {
  const conflict = CONFLICTS[violatedConstraint(error) ?? '']
  if (conflict) return conflict()

  return HTTPException.Conflict('Turma já existe', 'CLASSROOM_ALREADY_EXISTS', {
    name: 'Já existe uma turma com este nome',
  })
}
