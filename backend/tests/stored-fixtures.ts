import type { DateTime } from 'luxon'

import AnnouncementModel from '#models/announcement'
import BracketModel from '#models/bracket'
import ClassroomModel from '#models/classroom'
import EnrollmentModel from '#models/enrollment'
import EnrollmentRemovalModel from '#models/enrollment-removal'
import MatchCardModel from '#models/match-card'
import MatchModel from '#models/match'
import SportModel from '#models/sport'
import StorageModel from '#models/storage'
import StudentModel from '#models/student'
import TeamModel from '#models/team'
import UserModel from '#models/user'

/**
 * O que ficou gravado no banco, lido para a asserção "gravou" / "não gravou"
 * (`_standards/backend.md` §7). A spec de `features/` não importa model
 * (`architecture.md` §2): o e2e confere o estado por aqui, e semeia pelas
 * factories de `database/factories/`.
 *
 * `x(id)` devolve `null` quando a linha não existe; `xOrFail` falha o teste.
 */
export class Stored {
  static announcement(id: string) {
    return AnnouncementModel.find(id)
  }

  static announcementByTitle(title: string) {
    return AnnouncementModel.findBy('title', title)
  }

  static announcementOrFail(id: string) {
    return AnnouncementModel.findOrFail(id)
  }

  static brackets() {
    return BracketModel.all()
  }

  static bracketOrFail(id: string) {
    return BracketModel.findOrFail(id)
  }

  static cards() {
    return MatchCardModel.all()
  }

  static card(id: string) {
    return MatchCardModel.find(id)
  }

  static classrooms() {
    return ClassroomModel.all()
  }

  static classroom(id: string) {
    return ClassroomModel.find(id)
  }

  static classroomOrFail(id: string) {
    return ClassroomModel.findOrFail(id)
  }

  static enrollmentsOfSport(sportId: string) {
    return EnrollmentModel.query().where('sportId', sportId)
  }

  static enrollmentsOfStudent(studentId: string) {
    return EnrollmentModel.query().where('studentId', studentId)
  }

  static matchesOfBracket(bracketId: string) {
    return MatchModel.query().where('bracketId', bracketId)
  }

  /** Grava `updatedAt` direto, sem o hook do model que o regravaria com agora. */
  static async touchMatch(id: string, updatedAt: DateTime) {
    await MatchModel.query().where('id', id).update({ updatedAt: updatedAt.toSQL() })
  }

  static removalsOfClassroom(classroomId: string) {
    return EnrollmentRemovalModel.query().where('classroomId', classroomId)
  }

  static removalOfClassroomOrFail(classroomId: string) {
    return EnrollmentRemovalModel.findByOrFail('classroomId', classroomId)
  }

  static sport(id: string) {
    return SportModel.find(id)
  }

  static sportByName(name: string) {
    return SportModel.findBy('name', name)
  }

  static sportOrFail(id: string) {
    return SportModel.findOrFail(id)
  }

  static storages() {
    return StorageModel.all()
  }

  static storage(id: string) {
    return StorageModel.find(id)
  }

  static storageOrFail(id: string) {
    return StorageModel.findOrFail(id)
  }

  static student(id: string) {
    return StudentModel.find(id)
  }

  static studentsOfClassroom(classroomId: string) {
    return StudentModel.query().where('classroomId', classroomId)
  }

  static teamsOfBracket(bracketId: string) {
    return TeamModel.query().where('bracketId', bracketId)
  }

  static user(id: string) {
    return UserModel.find(id)
  }

  static userByEmailOrFail(email: string) {
    return UserModel.findByOrFail('email', email)
  }

  static userOrFail(id: string) {
    return UserModel.findOrFail(id)
  }

  /** Abre uma sessão para a conta, como o sign-in faz. */
  static issueToken(user: UserModel) {
    return UserModel.accessTokens.create(user)
  }
}
