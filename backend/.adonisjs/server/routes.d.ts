import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'health-check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
    'storefront.sports': { paramsTuple?: []; params?: {} }
    'storefront.announcements': { paramsTuple?: []; params?: {} }
    'storefront.matches': { paramsTuple?: []; params?: {} }
    'storefront.site': { paramsTuple?: []; params?: {} }
    'storefront.brackets.paginate': { paramsTuple?: []; params?: {} }
    'storefront.brackets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'authentication.sign_in': { paramsTuple?: []; params?: {} }
    'authentication.sign_out': { paramsTuple?: []; params?: {} }
    'authentication.refresh': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'storages.paginate': { paramsTuple?: []; params?: {} }
    'storages.create': { paramsTuple?: []; params?: {} }
    'storages.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.parts': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.classrooms.paginate': { paramsTuple?: []; params?: {} }
    'administrator.classrooms.create': { paramsTuple?: []; params?: {} }
    'administrator.classrooms.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.classrooms.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.classrooms.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.sports.paginate': { paramsTuple?: []; params?: {} }
    'administrator.sports.create': { paramsTuple?: []; params?: {} }
    'administrator.sports.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.sports.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.sports.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.site.show': { paramsTuple?: []; params?: {} }
    'administrator.site.update': { paramsTuple?: []; params?: {} }
    'administrator.announcements.paginate': { paramsTuple?: []; params?: {} }
    'administrator.announcements.create': { paramsTuple?: []; params?: {} }
    'administrator.announcements.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.announcements.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.announcements.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.brackets.paginate': { paramsTuple?: []; params?: {} }
    'administrator.brackets.create': { paramsTuple?: []; params?: {} }
    'administrator.brackets.preview': { paramsTuple?: []; params?: {} }
    'administrator.brackets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.brackets.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.matches.paginate': { paramsTuple?: []; params?: {} }
    'administrator.matches.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.matches.score': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.matches.athletes': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.matches.unscore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.cards.paginate': { paramsTuple?: []; params?: {} }
    'administrator.cards.create': { paramsTuple?: []; params?: {} }
    'administrator.cards.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.enrollmentRemovals.paginate': { paramsTuple?: []; params?: {} }
    'administrator.enrollmentRemovals.acknowledge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.users.paginate': { paramsTuple?: []; params?: {} }
    'administrator.users.create': { paramsTuple?: []; params?: {} }
    'administrator.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'advisor.classrooms': { paramsTuple?: []; params?: {} }
    'advisor.cards': { paramsTuple?: []; params?: {} }
    'advisor.students.paginate': { paramsTuple?: []; params?: {} }
    'advisor.students.create': { paramsTuple?: []; params?: {} }
    'advisor.students.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'advisor.students.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'advisor.enrollments.show': { paramsTuple?: []; params?: {} }
    'advisor.enrollments.update': { paramsTuple?: []; params?: {} }
    'representative.enrollments.show': { paramsTuple?: []; params?: {} }
    'representative.enrollments.update': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'health-check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
    'storefront.sports': { paramsTuple?: []; params?: {} }
    'storefront.announcements': { paramsTuple?: []; params?: {} }
    'storefront.matches': { paramsTuple?: []; params?: {} }
    'storefront.site': { paramsTuple?: []; params?: {} }
    'storefront.brackets.paginate': { paramsTuple?: []; params?: {} }
    'storefront.brackets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'storages.paginate': { paramsTuple?: []; params?: {} }
    'storages.parts': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.classrooms.paginate': { paramsTuple?: []; params?: {} }
    'administrator.classrooms.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.sports.paginate': { paramsTuple?: []; params?: {} }
    'administrator.sports.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.site.show': { paramsTuple?: []; params?: {} }
    'administrator.announcements.paginate': { paramsTuple?: []; params?: {} }
    'administrator.announcements.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.brackets.paginate': { paramsTuple?: []; params?: {} }
    'administrator.brackets.preview': { paramsTuple?: []; params?: {} }
    'administrator.brackets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.matches.paginate': { paramsTuple?: []; params?: {} }
    'administrator.matches.athletes': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.cards.paginate': { paramsTuple?: []; params?: {} }
    'administrator.enrollmentRemovals.paginate': { paramsTuple?: []; params?: {} }
    'administrator.users.paginate': { paramsTuple?: []; params?: {} }
    'administrator.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'advisor.classrooms': { paramsTuple?: []; params?: {} }
    'advisor.cards': { paramsTuple?: []; params?: {} }
    'advisor.students.paginate': { paramsTuple?: []; params?: {} }
    'advisor.enrollments.show': { paramsTuple?: []; params?: {} }
    'representative.enrollments.show': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'health-check': { paramsTuple?: []; params?: {} }
    'documentation.openapi': { paramsTuple?: []; params?: {} }
    'documentation.reference': { paramsTuple?: []; params?: {} }
    'storefront.sports': { paramsTuple?: []; params?: {} }
    'storefront.announcements': { paramsTuple?: []; params?: {} }
    'storefront.matches': { paramsTuple?: []; params?: {} }
    'storefront.site': { paramsTuple?: []; params?: {} }
    'storefront.brackets.paginate': { paramsTuple?: []; params?: {} }
    'storefront.brackets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'storages.paginate': { paramsTuple?: []; params?: {} }
    'storages.parts': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storages.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.classrooms.paginate': { paramsTuple?: []; params?: {} }
    'administrator.classrooms.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.sports.paginate': { paramsTuple?: []; params?: {} }
    'administrator.sports.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.site.show': { paramsTuple?: []; params?: {} }
    'administrator.announcements.paginate': { paramsTuple?: []; params?: {} }
    'administrator.announcements.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.brackets.paginate': { paramsTuple?: []; params?: {} }
    'administrator.brackets.preview': { paramsTuple?: []; params?: {} }
    'administrator.brackets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.matches.paginate': { paramsTuple?: []; params?: {} }
    'administrator.matches.athletes': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.cards.paginate': { paramsTuple?: []; params?: {} }
    'administrator.enrollmentRemovals.paginate': { paramsTuple?: []; params?: {} }
    'administrator.users.paginate': { paramsTuple?: []; params?: {} }
    'administrator.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'advisor.classrooms': { paramsTuple?: []; params?: {} }
    'advisor.cards': { paramsTuple?: []; params?: {} }
    'advisor.students.paginate': { paramsTuple?: []; params?: {} }
    'advisor.enrollments.show': { paramsTuple?: []; params?: {} }
    'representative.enrollments.show': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'authentication.sign_in': { paramsTuple?: []; params?: {} }
    'authentication.sign_out': { paramsTuple?: []; params?: {} }
    'authentication.refresh': { paramsTuple?: []; params?: {} }
    'storages.create': { paramsTuple?: []; params?: {} }
    'storages.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.classrooms.create': { paramsTuple?: []; params?: {} }
    'administrator.sports.create': { paramsTuple?: []; params?: {} }
    'administrator.announcements.create': { paramsTuple?: []; params?: {} }
    'administrator.brackets.create': { paramsTuple?: []; params?: {} }
    'administrator.cards.create': { paramsTuple?: []; params?: {} }
    'administrator.users.create': { paramsTuple?: []; params?: {} }
    'advisor.students.create': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'profile.update': { paramsTuple?: []; params?: {} }
    'administrator.classrooms.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.sports.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.site.update': { paramsTuple?: []; params?: {} }
    'administrator.announcements.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.matches.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.matches.score': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'advisor.students.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'advisor.enrollments.update': { paramsTuple?: []; params?: {} }
    'representative.enrollments.update': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'storages.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.classrooms.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.sports.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.announcements.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.brackets.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.matches.unscore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.cards.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'advisor.students.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'administrator.enrollmentRemovals.acknowledge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'administrator.lifecycle.users.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}