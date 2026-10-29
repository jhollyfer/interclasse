import { ClassroomDetachContract } from '#services/classroom-detach/classroom-detach.contract'

/** Registra as contas cujas turmas o teste viu serem soltas. */
export class ClassroomDetachFake extends ClassroomDetachContract {
  readonly detached: string[] = []

  async detach(userId: string): Promise<void> {
    this.detached.push(userId)
  }
}
