/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'health-check': {
    methods: ["GET","HEAD"],
    pattern: '/health-check',
    tokens: [{"old":"/health-check","type":0,"val":"health-check","end":""}],
    types: placeholder as Registry['health-check']['types'],
  },
  'documentation.openapi': {
    methods: ["GET","HEAD"],
    pattern: '/openapi.json',
    tokens: [{"old":"/openapi.json","type":0,"val":"openapi.json","end":""}],
    types: placeholder as Registry['documentation.openapi']['types'],
  },
  'documentation.reference': {
    methods: ["GET","HEAD"],
    pattern: '/documentation',
    tokens: [{"old":"/documentation","type":0,"val":"documentation","end":""}],
    types: placeholder as Registry['documentation.reference']['types'],
  },
  'storefront.sports': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/sports',
    tokens: [{"old":"/storefront/sports","type":0,"val":"storefront","end":""},{"old":"/storefront/sports","type":0,"val":"sports","end":""}],
    types: placeholder as Registry['storefront.sports']['types'],
  },
  'storefront.announcements': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/announcements',
    tokens: [{"old":"/storefront/announcements","type":0,"val":"storefront","end":""},{"old":"/storefront/announcements","type":0,"val":"announcements","end":""}],
    types: placeholder as Registry['storefront.announcements']['types'],
  },
  'storefront.matches': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/matches',
    tokens: [{"old":"/storefront/matches","type":0,"val":"storefront","end":""},{"old":"/storefront/matches","type":0,"val":"matches","end":""}],
    types: placeholder as Registry['storefront.matches']['types'],
  },
  'storefront.site': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/site',
    tokens: [{"old":"/storefront/site","type":0,"val":"storefront","end":""},{"old":"/storefront/site","type":0,"val":"site","end":""}],
    types: placeholder as Registry['storefront.site']['types'],
  },
  'storefront.photos': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/photos',
    tokens: [{"old":"/storefront/photos","type":0,"val":"storefront","end":""},{"old":"/storefront/photos","type":0,"val":"photos","end":""}],
    types: placeholder as Registry['storefront.photos']['types'],
  },
  'storefront.brackets.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/brackets',
    tokens: [{"old":"/storefront/brackets","type":0,"val":"storefront","end":""},{"old":"/storefront/brackets","type":0,"val":"brackets","end":""}],
    types: placeholder as Registry['storefront.brackets.paginate']['types'],
  },
  'storefront.brackets.show': {
    methods: ["GET","HEAD"],
    pattern: '/storefront/brackets/:id',
    tokens: [{"old":"/storefront/brackets/:id","type":0,"val":"storefront","end":""},{"old":"/storefront/brackets/:id","type":0,"val":"brackets","end":""},{"old":"/storefront/brackets/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['storefront.brackets.show']['types'],
  },
  'authentication.sign_in': {
    methods: ["POST"],
    pattern: '/authentication/sign-in',
    tokens: [{"old":"/authentication/sign-in","type":0,"val":"authentication","end":""},{"old":"/authentication/sign-in","type":0,"val":"sign-in","end":""}],
    types: placeholder as Registry['authentication.sign_in']['types'],
  },
  'authentication.sign_out': {
    methods: ["POST"],
    pattern: '/authentication/sign-out',
    tokens: [{"old":"/authentication/sign-out","type":0,"val":"authentication","end":""},{"old":"/authentication/sign-out","type":0,"val":"sign-out","end":""}],
    types: placeholder as Registry['authentication.sign_out']['types'],
  },
  'authentication.refresh': {
    methods: ["POST"],
    pattern: '/authentication/refresh',
    tokens: [{"old":"/authentication/refresh","type":0,"val":"authentication","end":""},{"old":"/authentication/refresh","type":0,"val":"refresh","end":""}],
    types: placeholder as Registry['authentication.refresh']['types'],
  },
  'profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/account',
    tokens: [{"old":"/account","type":0,"val":"account","end":""}],
    types: placeholder as Registry['profile.show']['types'],
  },
  'profile.update': {
    methods: ["PUT"],
    pattern: '/account',
    tokens: [{"old":"/account","type":0,"val":"account","end":""}],
    types: placeholder as Registry['profile.update']['types'],
  },
  'storages.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/storages',
    tokens: [{"old":"/storages","type":0,"val":"storages","end":""}],
    types: placeholder as Registry['storages.paginate']['types'],
  },
  'storages.create': {
    methods: ["POST"],
    pattern: '/storages',
    tokens: [{"old":"/storages","type":0,"val":"storages","end":""}],
    types: placeholder as Registry['storages.create']['types'],
  },
  'storages.complete': {
    methods: ["POST"],
    pattern: '/storages/:id/complete',
    tokens: [{"old":"/storages/:id/complete","type":0,"val":"storages","end":""},{"old":"/storages/:id/complete","type":1,"val":"id","end":""},{"old":"/storages/:id/complete","type":0,"val":"complete","end":""}],
    types: placeholder as Registry['storages.complete']['types'],
  },
  'storages.parts': {
    methods: ["GET","HEAD"],
    pattern: '/storages/:id/parts',
    tokens: [{"old":"/storages/:id/parts","type":0,"val":"storages","end":""},{"old":"/storages/:id/parts","type":1,"val":"id","end":""},{"old":"/storages/:id/parts","type":0,"val":"parts","end":""}],
    types: placeholder as Registry['storages.parts']['types'],
  },
  'storages.show': {
    methods: ["GET","HEAD"],
    pattern: '/storages/:id',
    tokens: [{"old":"/storages/:id","type":0,"val":"storages","end":""},{"old":"/storages/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['storages.show']['types'],
  },
  'storages.delete': {
    methods: ["DELETE"],
    pattern: '/storages/:id',
    tokens: [{"old":"/storages/:id","type":0,"val":"storages","end":""},{"old":"/storages/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['storages.delete']['types'],
  },
  'storages.download': {
    methods: ["GET","HEAD"],
    pattern: '/storages/:id/download',
    tokens: [{"old":"/storages/:id/download","type":0,"val":"storages","end":""},{"old":"/storages/:id/download","type":1,"val":"id","end":""},{"old":"/storages/:id/download","type":0,"val":"download","end":""}],
    types: placeholder as Registry['storages.download']['types'],
  },
  'administrator.classrooms.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/classrooms',
    tokens: [{"old":"/administrator/classrooms","type":0,"val":"administrator","end":""},{"old":"/administrator/classrooms","type":0,"val":"classrooms","end":""}],
    types: placeholder as Registry['administrator.classrooms.paginate']['types'],
  },
  'administrator.classrooms.create': {
    methods: ["POST"],
    pattern: '/administrator/classrooms',
    tokens: [{"old":"/administrator/classrooms","type":0,"val":"administrator","end":""},{"old":"/administrator/classrooms","type":0,"val":"classrooms","end":""}],
    types: placeholder as Registry['administrator.classrooms.create']['types'],
  },
  'administrator.classrooms.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/classrooms/:id',
    tokens: [{"old":"/administrator/classrooms/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/classrooms/:id","type":0,"val":"classrooms","end":""},{"old":"/administrator/classrooms/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.classrooms.show']['types'],
  },
  'administrator.classrooms.update': {
    methods: ["PUT"],
    pattern: '/administrator/classrooms/:id',
    tokens: [{"old":"/administrator/classrooms/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/classrooms/:id","type":0,"val":"classrooms","end":""},{"old":"/administrator/classrooms/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.classrooms.update']['types'],
  },
  'administrator.classrooms.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/classrooms/:id',
    tokens: [{"old":"/administrator/classrooms/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/classrooms/:id","type":0,"val":"classrooms","end":""},{"old":"/administrator/classrooms/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.classrooms.delete']['types'],
  },
  'administrator.sports.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/sports',
    tokens: [{"old":"/administrator/sports","type":0,"val":"administrator","end":""},{"old":"/administrator/sports","type":0,"val":"sports","end":""}],
    types: placeholder as Registry['administrator.sports.paginate']['types'],
  },
  'administrator.sports.create': {
    methods: ["POST"],
    pattern: '/administrator/sports',
    tokens: [{"old":"/administrator/sports","type":0,"val":"administrator","end":""},{"old":"/administrator/sports","type":0,"val":"sports","end":""}],
    types: placeholder as Registry['administrator.sports.create']['types'],
  },
  'administrator.sports.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/sports/:id',
    tokens: [{"old":"/administrator/sports/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/sports/:id","type":0,"val":"sports","end":""},{"old":"/administrator/sports/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.sports.show']['types'],
  },
  'administrator.sports.update': {
    methods: ["PUT"],
    pattern: '/administrator/sports/:id',
    tokens: [{"old":"/administrator/sports/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/sports/:id","type":0,"val":"sports","end":""},{"old":"/administrator/sports/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.sports.update']['types'],
  },
  'administrator.sports.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/sports/:id',
    tokens: [{"old":"/administrator/sports/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/sports/:id","type":0,"val":"sports","end":""},{"old":"/administrator/sports/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.sports.delete']['types'],
  },
  'administrator.reports.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/reports',
    tokens: [{"old":"/administrator/reports","type":0,"val":"administrator","end":""},{"old":"/administrator/reports","type":0,"val":"reports","end":""}],
    types: placeholder as Registry['administrator.reports.show']['types'],
  },
  'administrator.reports.export': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/reports/csv',
    tokens: [{"old":"/administrator/reports/csv","type":0,"val":"administrator","end":""},{"old":"/administrator/reports/csv","type":0,"val":"reports","end":""},{"old":"/administrator/reports/csv","type":0,"val":"csv","end":""}],
    types: placeholder as Registry['administrator.reports.export']['types'],
  },
  'administrator.photos.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/photos',
    tokens: [{"old":"/administrator/photos","type":0,"val":"administrator","end":""},{"old":"/administrator/photos","type":0,"val":"photos","end":""}],
    types: placeholder as Registry['administrator.photos.paginate']['types'],
  },
  'administrator.photos.create': {
    methods: ["POST"],
    pattern: '/administrator/photos',
    tokens: [{"old":"/administrator/photos","type":0,"val":"administrator","end":""},{"old":"/administrator/photos","type":0,"val":"photos","end":""}],
    types: placeholder as Registry['administrator.photos.create']['types'],
  },
  'administrator.photos.review': {
    methods: ["PUT"],
    pattern: '/administrator/photos/:id/review',
    tokens: [{"old":"/administrator/photos/:id/review","type":0,"val":"administrator","end":""},{"old":"/administrator/photos/:id/review","type":0,"val":"photos","end":""},{"old":"/administrator/photos/:id/review","type":1,"val":"id","end":""},{"old":"/administrator/photos/:id/review","type":0,"val":"review","end":""}],
    types: placeholder as Registry['administrator.photos.review']['types'],
  },
  'administrator.photos.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/photos/:id',
    tokens: [{"old":"/administrator/photos/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/photos/:id","type":0,"val":"photos","end":""},{"old":"/administrator/photos/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.photos.delete']['types'],
  },
  'administrator.site.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/site',
    tokens: [{"old":"/administrator/site","type":0,"val":"administrator","end":""},{"old":"/administrator/site","type":0,"val":"site","end":""}],
    types: placeholder as Registry['administrator.site.show']['types'],
  },
  'administrator.site.update': {
    methods: ["PUT"],
    pattern: '/administrator/site',
    tokens: [{"old":"/administrator/site","type":0,"val":"administrator","end":""},{"old":"/administrator/site","type":0,"val":"site","end":""}],
    types: placeholder as Registry['administrator.site.update']['types'],
  },
  'administrator.announcements.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/announcements',
    tokens: [{"old":"/administrator/announcements","type":0,"val":"administrator","end":""},{"old":"/administrator/announcements","type":0,"val":"announcements","end":""}],
    types: placeholder as Registry['administrator.announcements.paginate']['types'],
  },
  'administrator.announcements.create': {
    methods: ["POST"],
    pattern: '/administrator/announcements',
    tokens: [{"old":"/administrator/announcements","type":0,"val":"administrator","end":""},{"old":"/administrator/announcements","type":0,"val":"announcements","end":""}],
    types: placeholder as Registry['administrator.announcements.create']['types'],
  },
  'administrator.announcements.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/announcements/:id',
    tokens: [{"old":"/administrator/announcements/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/announcements/:id","type":0,"val":"announcements","end":""},{"old":"/administrator/announcements/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.announcements.show']['types'],
  },
  'administrator.announcements.update': {
    methods: ["PUT"],
    pattern: '/administrator/announcements/:id',
    tokens: [{"old":"/administrator/announcements/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/announcements/:id","type":0,"val":"announcements","end":""},{"old":"/administrator/announcements/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.announcements.update']['types'],
  },
  'administrator.announcements.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/announcements/:id',
    tokens: [{"old":"/administrator/announcements/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/announcements/:id","type":0,"val":"announcements","end":""},{"old":"/administrator/announcements/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.announcements.delete']['types'],
  },
  'administrator.brackets.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/brackets',
    tokens: [{"old":"/administrator/brackets","type":0,"val":"administrator","end":""},{"old":"/administrator/brackets","type":0,"val":"brackets","end":""}],
    types: placeholder as Registry['administrator.brackets.paginate']['types'],
  },
  'administrator.brackets.create': {
    methods: ["POST"],
    pattern: '/administrator/brackets',
    tokens: [{"old":"/administrator/brackets","type":0,"val":"administrator","end":""},{"old":"/administrator/brackets","type":0,"val":"brackets","end":""}],
    types: placeholder as Registry['administrator.brackets.create']['types'],
  },
  'administrator.brackets.preview': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/brackets/preview',
    tokens: [{"old":"/administrator/brackets/preview","type":0,"val":"administrator","end":""},{"old":"/administrator/brackets/preview","type":0,"val":"brackets","end":""},{"old":"/administrator/brackets/preview","type":0,"val":"preview","end":""}],
    types: placeholder as Registry['administrator.brackets.preview']['types'],
  },
  'administrator.brackets.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/brackets/:id',
    tokens: [{"old":"/administrator/brackets/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/brackets/:id","type":0,"val":"brackets","end":""},{"old":"/administrator/brackets/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.brackets.show']['types'],
  },
  'administrator.brackets.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/brackets/:id',
    tokens: [{"old":"/administrator/brackets/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/brackets/:id","type":0,"val":"brackets","end":""},{"old":"/administrator/brackets/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.brackets.delete']['types'],
  },
  'administrator.matches.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/matches',
    tokens: [{"old":"/administrator/matches","type":0,"val":"administrator","end":""},{"old":"/administrator/matches","type":0,"val":"matches","end":""}],
    types: placeholder as Registry['administrator.matches.paginate']['types'],
  },
  'administrator.matches.update': {
    methods: ["PUT"],
    pattern: '/administrator/matches/:id',
    tokens: [{"old":"/administrator/matches/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/matches/:id","type":0,"val":"matches","end":""},{"old":"/administrator/matches/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.matches.update']['types'],
  },
  'administrator.matches.score': {
    methods: ["PUT"],
    pattern: '/administrator/matches/:id/score',
    tokens: [{"old":"/administrator/matches/:id/score","type":0,"val":"administrator","end":""},{"old":"/administrator/matches/:id/score","type":0,"val":"matches","end":""},{"old":"/administrator/matches/:id/score","type":1,"val":"id","end":""},{"old":"/administrator/matches/:id/score","type":0,"val":"score","end":""}],
    types: placeholder as Registry['administrator.matches.score']['types'],
  },
  'administrator.matches.athletes': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/matches/:id/athletes',
    tokens: [{"old":"/administrator/matches/:id/athletes","type":0,"val":"administrator","end":""},{"old":"/administrator/matches/:id/athletes","type":0,"val":"matches","end":""},{"old":"/administrator/matches/:id/athletes","type":1,"val":"id","end":""},{"old":"/administrator/matches/:id/athletes","type":0,"val":"athletes","end":""}],
    types: placeholder as Registry['administrator.matches.athletes']['types'],
  },
  'administrator.matches.unscore': {
    methods: ["DELETE"],
    pattern: '/administrator/matches/:id/score',
    tokens: [{"old":"/administrator/matches/:id/score","type":0,"val":"administrator","end":""},{"old":"/administrator/matches/:id/score","type":0,"val":"matches","end":""},{"old":"/administrator/matches/:id/score","type":1,"val":"id","end":""},{"old":"/administrator/matches/:id/score","type":0,"val":"score","end":""}],
    types: placeholder as Registry['administrator.matches.unscore']['types'],
  },
  'administrator.cards.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/cards',
    tokens: [{"old":"/administrator/cards","type":0,"val":"administrator","end":""},{"old":"/administrator/cards","type":0,"val":"cards","end":""}],
    types: placeholder as Registry['administrator.cards.paginate']['types'],
  },
  'administrator.cards.create': {
    methods: ["POST"],
    pattern: '/administrator/cards',
    tokens: [{"old":"/administrator/cards","type":0,"val":"administrator","end":""},{"old":"/administrator/cards","type":0,"val":"cards","end":""}],
    types: placeholder as Registry['administrator.cards.create']['types'],
  },
  'administrator.cards.delete': {
    methods: ["DELETE"],
    pattern: '/administrator/cards/:id',
    tokens: [{"old":"/administrator/cards/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/cards/:id","type":0,"val":"cards","end":""},{"old":"/administrator/cards/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.cards.delete']['types'],
  },
  'administrator.enrollmentRemovals.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/enrollment-removals',
    tokens: [{"old":"/administrator/enrollment-removals","type":0,"val":"administrator","end":""},{"old":"/administrator/enrollment-removals","type":0,"val":"enrollment-removals","end":""}],
    types: placeholder as Registry['administrator.enrollmentRemovals.paginate']['types'],
  },
  'administrator.enrollmentRemovals.acknowledge': {
    methods: ["PATCH"],
    pattern: '/administrator/enrollment-removals/:id/acknowledge',
    tokens: [{"old":"/administrator/enrollment-removals/:id/acknowledge","type":0,"val":"administrator","end":""},{"old":"/administrator/enrollment-removals/:id/acknowledge","type":0,"val":"enrollment-removals","end":""},{"old":"/administrator/enrollment-removals/:id/acknowledge","type":1,"val":"id","end":""},{"old":"/administrator/enrollment-removals/:id/acknowledge","type":0,"val":"acknowledge","end":""}],
    types: placeholder as Registry['administrator.enrollmentRemovals.acknowledge']['types'],
  },
  'administrator.users.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/users',
    tokens: [{"old":"/administrator/users","type":0,"val":"administrator","end":""},{"old":"/administrator/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['administrator.users.paginate']['types'],
  },
  'administrator.users.create': {
    methods: ["POST"],
    pattern: '/administrator/users',
    tokens: [{"old":"/administrator/users","type":0,"val":"administrator","end":""},{"old":"/administrator/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['administrator.users.create']['types'],
  },
  'administrator.users.show': {
    methods: ["GET","HEAD"],
    pattern: '/administrator/users/:id',
    tokens: [{"old":"/administrator/users/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/users/:id","type":0,"val":"users","end":""},{"old":"/administrator/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.users.show']['types'],
  },
  'administrator.users.update': {
    methods: ["PUT"],
    pattern: '/administrator/users/:id',
    tokens: [{"old":"/administrator/users/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/users/:id","type":0,"val":"users","end":""},{"old":"/administrator/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.users.update']['types'],
  },
  'administrator.lifecycle.users.archive': {
    methods: ["PATCH"],
    pattern: '/administrator/users/:id/archive',
    tokens: [{"old":"/administrator/users/:id/archive","type":0,"val":"administrator","end":""},{"old":"/administrator/users/:id/archive","type":0,"val":"users","end":""},{"old":"/administrator/users/:id/archive","type":1,"val":"id","end":""},{"old":"/administrator/users/:id/archive","type":0,"val":"archive","end":""}],
    types: placeholder as Registry['administrator.lifecycle.users.archive']['types'],
  },
  'administrator.lifecycle.users.unarchive': {
    methods: ["PATCH"],
    pattern: '/administrator/users/:id/unarchive',
    tokens: [{"old":"/administrator/users/:id/unarchive","type":0,"val":"administrator","end":""},{"old":"/administrator/users/:id/unarchive","type":0,"val":"users","end":""},{"old":"/administrator/users/:id/unarchive","type":1,"val":"id","end":""},{"old":"/administrator/users/:id/unarchive","type":0,"val":"unarchive","end":""}],
    types: placeholder as Registry['administrator.lifecycle.users.unarchive']['types'],
  },
  'administrator.lifecycle.users.purge': {
    methods: ["DELETE"],
    pattern: '/administrator/users/:id',
    tokens: [{"old":"/administrator/users/:id","type":0,"val":"administrator","end":""},{"old":"/administrator/users/:id","type":0,"val":"users","end":""},{"old":"/administrator/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['administrator.lifecycle.users.purge']['types'],
  },
  'advisor.classrooms': {
    methods: ["GET","HEAD"],
    pattern: '/advisor/classrooms',
    tokens: [{"old":"/advisor/classrooms","type":0,"val":"advisor","end":""},{"old":"/advisor/classrooms","type":0,"val":"classrooms","end":""}],
    types: placeholder as Registry['advisor.classrooms']['types'],
  },
  'advisor.cards': {
    methods: ["GET","HEAD"],
    pattern: '/advisor/cards',
    tokens: [{"old":"/advisor/cards","type":0,"val":"advisor","end":""},{"old":"/advisor/cards","type":0,"val":"cards","end":""}],
    types: placeholder as Registry['advisor.cards']['types'],
  },
  'advisor.students.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/advisor/students',
    tokens: [{"old":"/advisor/students","type":0,"val":"advisor","end":""},{"old":"/advisor/students","type":0,"val":"students","end":""}],
    types: placeholder as Registry['advisor.students.paginate']['types'],
  },
  'advisor.students.create': {
    methods: ["POST"],
    pattern: '/advisor/students',
    tokens: [{"old":"/advisor/students","type":0,"val":"advisor","end":""},{"old":"/advisor/students","type":0,"val":"students","end":""}],
    types: placeholder as Registry['advisor.students.create']['types'],
  },
  'advisor.students.update': {
    methods: ["PUT"],
    pattern: '/advisor/students/:id',
    tokens: [{"old":"/advisor/students/:id","type":0,"val":"advisor","end":""},{"old":"/advisor/students/:id","type":0,"val":"students","end":""},{"old":"/advisor/students/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['advisor.students.update']['types'],
  },
  'advisor.students.delete': {
    methods: ["DELETE"],
    pattern: '/advisor/students/:id',
    tokens: [{"old":"/advisor/students/:id","type":0,"val":"advisor","end":""},{"old":"/advisor/students/:id","type":0,"val":"students","end":""},{"old":"/advisor/students/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['advisor.students.delete']['types'],
  },
  'advisor.photos.paginate': {
    methods: ["GET","HEAD"],
    pattern: '/advisor/photos',
    tokens: [{"old":"/advisor/photos","type":0,"val":"advisor","end":""},{"old":"/advisor/photos","type":0,"val":"photos","end":""}],
    types: placeholder as Registry['advisor.photos.paginate']['types'],
  },
  'advisor.photos.create': {
    methods: ["POST"],
    pattern: '/advisor/photos',
    tokens: [{"old":"/advisor/photos","type":0,"val":"advisor","end":""},{"old":"/advisor/photos","type":0,"val":"photos","end":""}],
    types: placeholder as Registry['advisor.photos.create']['types'],
  },
  'advisor.photos.delete': {
    methods: ["DELETE"],
    pattern: '/advisor/photos/:id',
    tokens: [{"old":"/advisor/photos/:id","type":0,"val":"advisor","end":""},{"old":"/advisor/photos/:id","type":0,"val":"photos","end":""},{"old":"/advisor/photos/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['advisor.photos.delete']['types'],
  },
  'advisor.enrollments.show': {
    methods: ["GET","HEAD"],
    pattern: '/advisor/enrollments',
    tokens: [{"old":"/advisor/enrollments","type":0,"val":"advisor","end":""},{"old":"/advisor/enrollments","type":0,"val":"enrollments","end":""}],
    types: placeholder as Registry['advisor.enrollments.show']['types'],
  },
  'advisor.enrollments.update': {
    methods: ["PUT"],
    pattern: '/advisor/enrollments',
    tokens: [{"old":"/advisor/enrollments","type":0,"val":"advisor","end":""},{"old":"/advisor/enrollments","type":0,"val":"enrollments","end":""}],
    types: placeholder as Registry['advisor.enrollments.update']['types'],
  },
  'representative.enrollments.show': {
    methods: ["GET","HEAD"],
    pattern: '/representative/enrollments',
    tokens: [{"old":"/representative/enrollments","type":0,"val":"representative","end":""},{"old":"/representative/enrollments","type":0,"val":"enrollments","end":""}],
    types: placeholder as Registry['representative.enrollments.show']['types'],
  },
  'representative.enrollments.update': {
    methods: ["PUT"],
    pattern: '/representative/enrollments',
    tokens: [{"old":"/representative/enrollments","type":0,"val":"representative","end":""},{"old":"/representative/enrollments","type":0,"val":"enrollments","end":""}],
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
