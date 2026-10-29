import type { AdministratorReportShowResponse } from '@interclasse/shared'

/**
 * A leitura dos números dos jogos (`_standards/domain.md` §5.1): quantas
 * turmas, alunos e atletas participaram, por categoria, por modalidade e por
 * turma. Só lê - não tem entidade, porque não há regra a proteger - e serve a
 * duas saídas, a tela e o CSV, que precisam dar os mesmos números.
 */
export abstract class ReportRepository {
  /** Tudo contado de uma vez; nenhuma linha de aluno sobe para a aplicação. */
  abstract summarize(): Promise<AdministratorReportShowResponse>
}
