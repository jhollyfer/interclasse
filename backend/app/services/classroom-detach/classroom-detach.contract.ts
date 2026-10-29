/**
 * Soltar as turmas de uma conta que deixou de ser o que era: o papel mudou, ou
 * ela foi arquivada.
 *
 * Ponte temporária para o módulo de turmas, que ainda não tem repository: o
 * use-case de usuário pede a intenção, e o `ClassroomDetachService` a cumpre
 * com o `ClassroomService#detach`. Quando as turmas ganharem repository, esta
 * pasta sai e o use-case chama o contrato novo.
 */
export abstract class ClassroomDetachContract {
  /** Zera o conselheiro e o representante das turmas que apontam para a conta. */
  abstract detach(userId: string): Promise<void>
}
