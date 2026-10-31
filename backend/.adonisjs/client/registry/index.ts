/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'health-check': {
    methods: ["GET","HEAD"],
    pattern: '/health-check',
    tokens: [[0,"health-check"]],
    types: placeholder as Registry['health-check']['types'],
  },
  'documentation.openapi': {
    methods: ["GET","HEAD"],
    pattern: '/openapi.json',
    tokens: [[0,"openapi.json"]],
    types: placeholder as Registry['documentation.openapi']['types'],
  },
  'documentation.reference': {
    methods: ["GET","HEAD"],
    pattern: '/documentation',
    tokens: [[0,"documentation"]],
    types: placeholder as Registry['documentation.reference']['types'],
  },
  'storefront.sports': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/sports',
    tokens: [[0,"storefront"],[0,"sports"]],
    types: placeholder as Registry['storefront.sports']['types'],
  },
  'storefront.announcements': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/announcements',
    tokens: [[0,"storefront"],[0,"announcements"]],
    types: placeholder as Registry['storefront.announcements']['types'],
  },
  'storefront.matches': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/matches',
    tokens: [[0,"storefront"],[0,"matches"]],
    types: placeholder as Registry['storefront.matches']['types'],
  },
  'storefront.site': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/site',
    tokens: [[0,"storefront"],[0,"site"]],
    types: placeholder as Registry['storefront.site']['types'],
  },
  'storefront.photos': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/photos',
    tokens: [[0,"storefront"],[0,"photos"]],
    types: placeholder as Registry['storefront.photos']['types'],
  },
  'storefront.brackets.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/brackets',
    tokens: [[0,"storefront"],[0,"brackets"]],
    types: placeholder as Registry['storefront.brackets.paginate']['types'],
  },
  'storefront.brackets.show': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/brackets/:id',
    tokens: [[0,"storefront"],[0,"brackets"],[1,"id"]],
    types: placeholder as Registry['storefront.brackets.show']['types'],
  },
  'authentication.sign_in': {
    methods: ["POST"],
    pattern: '/authentication/sign-in',
    tokens: [[0,"authentication"],[0,"sign-in"]],
    types: placeholder as Registry['authentication.sign_in']['types'],
  },
  'authentication.sign_out': {
    methods: ["POST"],
    pattern: '/authentication/sign-out',
    tokens: [[0,"authentication"],[0,"sign-out"]],
    types: placeholder as Registry['authentication.sign_out']['types'],
  },
  'authentication.refresh': {
    methods: ["POST"],
    pattern: '/authentication/refresh',
    tokens: [[0,"authentication"],[0,"refresh"]],
    types: placeholder as Registry['authentication.refresh']['types'],
  },
  'profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/account',
    tokens: [[0,"account"]],
    types: placeholder as Registry['profile.show']['types'],
  },
  'profile.update': {
    methods: ["PUT"],
    pattern: '/account',
    tokens: [[0,"account"]],
    types: placeholder as Registry['profile.update']['types'],
  },
  'storages.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storages',
    tokens: [[0,"storages"]],
    types: placeholder as Registry['storages.paginate']['types'],
  },
  'storages.create': {
    methods: ["POST"],
    pattern: '/storages',
    tokens: [[0,"storages"]],
    types: placeholder as Registry['storages.create']['types'],
  },
  'storages.complete': {
    methods: ["POST"],
    pattern: '/storages/:id/complete',
    tokens: [[0,"storages"],[1,"id"],[0,"complete"]],
    types: placeholder as Registry['storages.complete']['types'],
  },
  'storages.parts': {
    methods: ["GET","HEAD"],
    pattern: '/storages/:id/parts',
    tokens: [[0,"storages"],[1,"id"],[0,"parts"]],
    types: placeholder as Registry['storages.parts']['types'],
  },
  'storages.show': {
    methods: ["GET","HEAD"],
    pattern: '/storages/:id',
    tokens: [[0,"storages"],[1,"id"]],
    types: placeholder as Registry['storages.show']['types'],
  },
  'storages.delete': {
    methods: ["DELETE"],
    pattern: '/storages/:id',
    tokens: [[0,"storages"],[1,"id"]],
    types: placeholder as Registry['storages.delete']['types'],
  },
  'storages.download': {
    methods: ["GET","HEAD"],
    pattern: '/storages/:id/download',
    tokens: [[0,"storages"],[1,"id"],[0,"download"]],
    types: placeholder as Registry['storages.download']['types'],
  },
  'administrator.classrooms.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/classrooms',
    tokens: [[0,"administrator"],[0,"classrooms"]],
    types: placeholder as Registry['administrator.classrooms.paginate']['types'],
  },
  'administrator.classrooms.create': {
    methods: ["POST"],
    pattern: '/administrator/classrooms',
    tokens: [[0,"administrator"],[0,"classrooms"]],
    types: placeholder as Registry['administrator.classrooms.create']['types'],
  },
  'administrator.classrooms.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/classrooms/:id',
    tokens: [[0,"administrator"],[0,"classrooms"],[1,"id"]],
    types: placeholder as Registry['administrator.classrooms.show']['types'],
  },
  'administrator.classrooms.update': {
    methods: ["PUT"],
    pattern: '/administrator/classrooms/:id',
    tokens: [[0,"administrator"],[0,"classrooms"],[1,"id"]],
    types: placeholder as Registry['administrator.classrooms.update']['types'],
  },
  'administrator.classrooms.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/classrooms/:id',
    tokens: [[0,"administrator"],[0,"classrooms"],[1,"id"]],
    types: placeholder as Registry['administrator.classrooms.delete']['types'],
  },
  'administrator.sports.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/sports',
    tokens: [[0,"administrator"],[0,"sports"]],
    types: placeholder as Registry['administrator.sports.paginate']['types'],
  },
  'administrator.sports.create': {
    methods: ["POST"],
    pattern: '/administrator/sports',
    tokens: [[0,"administrator"],[0,"sports"]],
    types: placeholder as Registry['administrator.sports.create']['types'],
  },
  'administrator.sports.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/sports/:id',
    tokens: [[0,"administrator"],[0,"sports"],[1,"id"]],
    types: placeholder as Registry['administrator.sports.show']['types'],
  },
  'administrator.sports.update': {
    methods: ["PUT"],
    pattern: '/administrator/sports/:id',
    tokens: [[0,"administrator"],[0,"sports"],[1,"id"]],
    types: placeholder as Registry['administrator.sports.update']['types'],
  },
  'administrator.sports.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/sports/:id',
    tokens: [[0,"administrator"],[0,"sports"],[1,"id"]],
    types: placeholder as Registry['administrator.sports.delete']['types'],
  },
  'administrator.reports.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/reports',
    tokens: [[0,"administrator"],[0,"reports"]],
    types: placeholder as Registry['administrator.reports.show']['types'],
  },
  'administrator.reports.export': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/reports/csv',
    tokens: [[0,"administrator"],[0,"reports"],[0,"csv"]],
    types: placeholder as Registry['administrator.reports.export']['types'],
  },
  'administrator.photos.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/photos',
    tokens: [[0,"administrator"],[0,"photos"]],
    types: placeholder as Registry['administrator.photos.paginate']['types'],
  },
  'administrator.photos.create': {
    methods: ["POST"],
    pattern: '/administrator/photos',
    tokens: [[0,"administrator"],[0,"photos"]],
    types: placeholder as Registry['administrator.photos.create']['types'],
  },
  'administrator.photos.review': {
    methods: ["PUT"],
    pattern: '/administrator/photos/:id/review',
    tokens: [[0,"administrator"],[0,"photos"],[1,"id"],[0,"review"]],
    types: placeholder as Registry['administrator.photos.review']['types'],
  },
  'administrator.photos.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/photos/:id',
    tokens: [[0,"administrator"],[0,"photos"],[1,"id"]],
    types: placeholder as Registry['administrator.photos.delete']['types'],
  },
  'administrator.site.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/site',
    tokens: [[0,"administrator"],[0,"site"]],
    types: placeholder as Registry['administrator.site.show']['types'],
  },
  'administrator.site.update': {
    methods: ["PUT"],
    pattern: '/administrator/site',
    tokens: [[0,"administrator"],[0,"site"]],
    types: placeholder as Registry['administrator.site.update']['types'],
  },
  'administrator.announcements.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/announcements',
    tokens: [[0,"administrator"],[0,"announcements"]],
    types: placeholder as Registry['administrator.announcements.paginate']['types'],
  },
  'administrator.announcements.create': {
    methods: ["POST"],
    pattern: '/administrator/announcements',
    tokens: [[0,"administrator"],[0,"announcements"]],
    types: placeholder as Registry['administrator.announcements.create']['types'],
  },
  'administrator.announcements.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/announcements/:id',
    tokens: [[0,"administrator"],[0,"announcements"],[1,"id"]],
    types: placeholder as Registry['administrator.announcements.show']['types'],
  },
  'administrator.announcements.update': {
    methods: ["PUT"],
    pattern: '/administrator/announcements/:id',
    tokens: [[0,"administrator"],[0,"announcements"],[1,"id"]],
    types: placeholder as Registry['administrator.announcements.update']['types'],
  },
  'administrator.announcements.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/announcements/:id',
    tokens: [[0,"administrator"],[0,"announcements"],[1,"id"]],
    types: placeholder as Registry['administrator.announcements.delete']['types'],
  },
  'administrator.brackets.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/brackets',
    tokens: [[0,"administrator"],[0,"brackets"]],
    types: placeholder as Registry['administrator.brackets.paginate']['types'],
  },
  'administrator.brackets.create': {
    methods: ["POST"],
    pattern: '/administrator/brackets',
    tokens: [[0,"administrator"],[0,"brackets"]],
    types: placeholder as Registry['administrator.brackets.create']['types'],
  },
  'administrator.brackets.preview': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/brackets/preview',
    tokens: [[0,"administrator"],[0,"brackets"],[0,"preview"]],
    types: placeholder as Registry['administrator.brackets.preview']['types'],
  },
  'administrator.brackets.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/brackets/:id',
    tokens: [[0,"administrator"],[0,"brackets"],[1,"id"]],
    types: placeholder as Registry['administrator.brackets.show']['types'],
  },
  'administrator.brackets.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/brackets/:id',
    tokens: [[0,"administrator"],[0,"brackets"],[1,"id"]],
    types: placeholder as Registry['administrator.brackets.delete']['types'],
  },
  'administrator.matches.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/matches',
    tokens: [[0,"administrator"],[0,"matches"]],
    types: placeholder as Registry['administrator.matches.paginate']['types'],
  },
  'administrator.matches.update': {
    methods: ["PUT"],
    pattern: '/administrator/matches/:id',
    tokens: [[0,"administrator"],[0,"matches"],[1,"id"]],
    types: placeholder as Registry['administrator.matches.update']['types'],
  },
  'administrator.matches.score': {
    methods: ["PUT"],
    pattern: '/administrator/matches/:id/score',
    tokens: [[0,"administrator"],[0,"matches"],[1,"id"],[0,"score"]],
    types: placeholder as Registry['administrator.matches.score']['types'],
  },
  'administrator.matches.athletes': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/matches/:id/athletes',
    tokens: [[0,"administrator"],[0,"matches"],[1,"id"],[0,"athletes"]],
    types: placeholder as Registry['administrator.matches.athletes']['types'],
  },
  'administrator.matches.unscore': {
    methods: ["DELETE"],
    pattern: '/administrator/matches/:id/score',
    tokens: [[0,"administrator"],[0,"matches"],[1,"id"],[0,"score"]],
    types: placeholder as Registry['administrator.matches.unscore']['types'],
  },
  'administrator.cards.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/cards',
    tokens: [[0,"administrator"],[0,"cards"]],
    types: placeholder as Registry['administrator.cards.paginate']['types'],
  },
  'administrator.cards.create': {
    methods: ["POST"],
    pattern: '/administrator/cards',
    tokens: [[0,"administrator"],[0,"cards"]],
    types: placeholder as Registry['administrator.cards.create']['types'],
  },
  'administrator.cards.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/cards/:id',
    tokens: [[0,"administrator"],[0,"cards"],[1,"id"]],
    types: placeholder as Registry['administrator.cards.delete']['types'],
  },
  'administrator.enrollmentRemovals.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/enrollment-removals',
    tokens: [[0,"administrator"],[0,"enrollment-removals"]],
    types: placeholder as Registry['administrator.enrollmentRemovals.paginate']['types'],
  },
  'administrator.enrollmentRemovals.acknowledge': {
    methods: ["PATCH"],
    pattern: '/administrator/enrollment-removals/:id/acknowledge',
    tokens: [[0,"administrator"],[0,"enrollment-removals"],[1,"id"],[0,"acknowledge"]],
    types: placeholder as Registry['administrator.enrollmentRemovals.acknowledge']['types'],
  },
  'administrator.users.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/users',
    tokens: [[0,"administrator"],[0,"users"]],
    types: placeholder as Registry['administrator.users.paginate']['types'],
  },
  'administrator.users.create': {
    methods: ["POST"],
    pattern: '/administrator/users',
    tokens: [[0,"administrator"],[0,"users"]],
    types: placeholder as Registry['administrator.users.create']['types'],
  },
  'administrator.users.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/users/:id',
    tokens: [[0,"administrator"],[0,"users"],[1,"id"]],
    types: placeholder as Registry['administrator.users.show']['types'],
  },
  'administrator.users.update': {
    methods: ["PUT"],
    pattern: '/administrator/users/:id',
    tokens: [[0,"administrator"],[0,"users"],[1,"id"]],
    types: placeholder as Registry['administrator.users.update']['types'],
  },
  'administrator.lifecycle.users.archive': {
    methods: ["PATCH"],
    pattern: '/administrator/users/:id/archive',
    tokens: [[0,"administrator"],[0,"users"],[1,"id"],[0,"archive"]],
    types: placeholder as Registry['administrator.lifecycle.users.archive']['types'],
  },
  'administrator.lifecycle.users.unarchive': {
    methods: ["PATCH"],
    pattern: '/administrator/users/:id/unarchive',
    tokens: [[0,"administrator"],[0,"users"],[1,"id"],[0,"unarchive"]],
    types: placeholder as Registry['administrator.lifecycle.users.unarchive']['types'],
  },
  'administrator.lifecycle.users.purge': {
    methods: ["DELETE"],
    pattern: '/administrator/users/:id',
    tokens: [[0,"administrator"],[0,"users"],[1,"id"]],
    types: placeholder as Registry['administrator.lifecycle.users.purge']['types'],
  },
  'advisor.classrooms': {
    methods: ["GET","HEAD"],
    pattern: '/advisor/classrooms',
    tokens: [[0,"advisor"],[0,"classrooms"]],
    types: placeholder as Registry['advisor.classrooms']['types'],
  },
  'advisor.cards': {
    methods: ["GET","HEAD"],
    pattern: '/advisor/cards',
    tokens: [[0,"advisor"],[0,"cards"]],
    types: placeholder as Registry['advisor.cards']['types'],
  },
  'advisor.students.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/advisor/students',
    tokens: [[0,"advisor"],[0,"students"]],
    types: placeholder as Registry['advisor.students.paginate']['types'],
  },
  'advisor.students.create': {
    methods: ["POST"],
    pattern: '/advisor/students',
    tokens: [[0,"advisor"],[0,"students"]],
    types: placeholder as Registry['advisor.students.create']['types'],
  },
  'advisor.students.update': {
    methods: ["PUT"],
    pattern: '/advisor/students/:id',
    tokens: [[0,"advisor"],[0,"students"],[1,"id"]],
    types: placeholder as Registry['advisor.students.update']['types'],
  },
  'advisor.students.delete': {
    methods: ["DELETE"],
    pattern: '/advisor/students/:id',
    tokens: [[0,"advisor"],[0,"students"],[1,"id"]],
    types: placeholder as Registry['advisor.students.delete']['types'],
  },
  'advisor.photos.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/advisor/photos',
    tokens: [[0,"advisor"],[0,"photos"]],
    types: placeholder as Registry['advisor.photos.paginate']['types'],
  },
  'advisor.photos.create': {
    methods: ["POST"],
    pattern: '/advisor/photos',
    tokens: [[0,"advisor"],[0,"photos"]],
    types: placeholder as Registry['advisor.photos.create']['types'],
  },
  'advisor.photos.delete': {
    methods: ["DELETE"],
    pattern: '/advisor/photos/:id',
    tokens: [[0,"advisor"],[0,"photos"],[1,"id"]],
    types: placeholder as Registry['advisor.photos.delete']['types'],
  },
  'advisor.enrollments.show': {
    methods: ["GET","HEAD"],
    pattern: '/advisor/enrollments',
    tokens: [[0,"advisor"],[0,"enrollments"]],
    types: placeholder as Registry['advisor.enrollments.show']['types'],
  },
  'advisor.enrollments.update': {
    methods: ["PUT"],
    pattern: '/advisor/enrollments',
    tokens: [[0,"advisor"],[0,"enrollments"]],
    types: placeholder as Registry['advisor.enrollments.update']['types'],
  },
  'representative.enrollments.show': {
    methods: ["GET","HEAD"],
    pattern: '/representative/enrollments',
    tokens: [[0,"representative"],[0,"enrollments"]],
    types: placeholder as Registry['representative.enrollments.show']['types'],
  },
  'representative.enrollments.update': {
    methods: ["PUT"],
    pattern: '/representative/enrollments',
    tokens: [[0,"representative"],[0,"enrollments"]],
    types: placeholder as Registry['representative.enrollments.update']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
