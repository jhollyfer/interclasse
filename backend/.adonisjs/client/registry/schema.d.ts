/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'health_check': {
    methods: ["GET","HEAD"]
    pattern: '/health-check'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#features/health-check.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/health-check.controller').default['handle']>>>
    }
  }
  'storefront.sports': {
    methods: ["GET","HEAD"]
    pattern: '/storefront/sports'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').PaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storefront/sports/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storefront/sports/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storefront.announcements': {
    methods: ["GET","HEAD"]
    pattern: '/storefront/announcements'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').PaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storefront/announcements/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storefront/announcements/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storefront.matches': {
    methods: ["GET","HEAD"]
    pattern: '/storefront/matches'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#features/storefront/matches/matches.validator').StorefrontMatchPaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storefront/matches/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storefront/matches/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storefront.brackets.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/storefront/brackets'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#features/storefront/brackets/brackets.validator').StorefrontBracketPaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storefront/brackets/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storefront/brackets/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storefront.brackets.show': {
    methods: ["GET","HEAD"]
    pattern: '/storefront/brackets/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storefront/brackets/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storefront/brackets/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'authentication.sign_in': {
    methods: ["POST"]
    pattern: '/authentication/sign-in'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/authentication/sessions/sessions.validator').AuthenticationSignInValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#features/authentication/sessions/sessions.validator').AuthenticationSignInValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/authentication/sessions/sign-in/sign-in.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/authentication/sessions/sign-in/sign-in.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'authentication.sign_out': {
    methods: ["POST"]
    pattern: '/authentication/sign-out'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#features/authentication/sessions/sign-out/sign-out.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/authentication/sessions/sign-out/sign-out.controller').default['handle']>>>
    }
  }
  'authentication.refresh': {
    methods: ["POST"]
    pattern: '/authentication/refresh'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#features/authentication/sessions/refresh/refresh.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/authentication/sessions/refresh/refresh.controller').default['handle']>>>
    }
  }
  'profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/account'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#features/account/profile/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/account/profile/show/show.controller').default['handle']>>>
    }
  }
  'profile.update': {
    methods: ["PUT"]
    pattern: '/account'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/account/profile/profile.validator').AccountUpdateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#features/account/profile/profile.validator').AccountUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/account/profile/update/update.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/account/profile/update/update.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/storages'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#features/storages/files/files.validator').StoragePaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storages/files/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storages/files/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.create': {
    methods: ["POST"]
    pattern: '/storages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/storages/files/files.validator').StorageCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#features/storages/files/files.validator').StorageCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storages/files/create/create.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storages/files/create/create.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.complete': {
    methods: ["POST"]
    pattern: '/storages/:id/complete'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/storages/files/files.validator').StorageCompleteValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#features/storages/files/files.validator').StorageCompleteValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storages/files/complete/complete.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storages/files/complete/complete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.parts': {
    methods: ["GET","HEAD"]
    pattern: '/storages/:id/parts'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storages/files/parts/parts.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storages/files/parts/parts.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.show': {
    methods: ["GET","HEAD"]
    pattern: '/storages/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storages/files/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storages/files/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.delete': {
    methods: ["DELETE"]
    pattern: '/storages/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storages/files/delete/delete.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storages/files/delete/delete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storages.download': {
    methods: ["GET","HEAD"]
    pattern: '/storages/:id/download'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/storages/files/download/download.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/storages/files/download/download.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.classrooms.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/administrator/classrooms'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#features/administrator/classrooms/classrooms.validator').AdministratorClassroomPaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/classrooms/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/classrooms/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.classrooms.create': {
    methods: ["POST"]
    pattern: '/administrator/classrooms'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/administrator/classrooms/classrooms.validator').AdministratorClassroomCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#features/administrator/classrooms/classrooms.validator').AdministratorClassroomCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/classrooms/create/create.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/classrooms/create/create.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.classrooms.show': {
    methods: ["GET","HEAD"]
    pattern: '/administrator/classrooms/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/classrooms/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/classrooms/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.classrooms.update': {
    methods: ["PUT"]
    pattern: '/administrator/classrooms/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/administrator/classrooms/classrooms.validator').AdministratorClassroomUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#features/administrator/classrooms/classrooms.validator').AdministratorClassroomUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/classrooms/update/update.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/classrooms/update/update.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.classrooms.delete': {
    methods: ["DELETE"]
    pattern: '/administrator/classrooms/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/classrooms/delete/delete.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/classrooms/delete/delete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.sports.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/administrator/sports'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#features/administrator/sports/sports.validator').AdministratorSportPaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/sports/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/sports/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.sports.create': {
    methods: ["POST"]
    pattern: '/administrator/sports'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/administrator/sports/sports.validator').AdministratorSportCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#features/administrator/sports/sports.validator').AdministratorSportCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/sports/create/create.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/sports/create/create.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.sports.show': {
    methods: ["GET","HEAD"]
    pattern: '/administrator/sports/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/sports/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/sports/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.sports.update': {
    methods: ["PUT"]
    pattern: '/administrator/sports/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/administrator/sports/sports.validator').AdministratorSportUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#features/administrator/sports/sports.validator').AdministratorSportUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/sports/update/update.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/sports/update/update.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.sports.delete': {
    methods: ["DELETE"]
    pattern: '/administrator/sports/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/sports/delete/delete.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/sports/delete/delete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.announcements.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/administrator/announcements'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#features/administrator/announcements/announcements.validator').AdministratorAnnouncementPaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/announcements/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/announcements/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.announcements.create': {
    methods: ["POST"]
    pattern: '/administrator/announcements'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/administrator/announcements/announcements.validator').AdministratorAnnouncementCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#features/administrator/announcements/announcements.validator').AdministratorAnnouncementCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/announcements/create/create.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/announcements/create/create.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.announcements.show': {
    methods: ["GET","HEAD"]
    pattern: '/administrator/announcements/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/announcements/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/announcements/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.announcements.update': {
    methods: ["PUT"]
    pattern: '/administrator/announcements/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/administrator/announcements/announcements.validator').AdministratorAnnouncementUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#features/administrator/announcements/announcements.validator').AdministratorAnnouncementUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/announcements/update/update.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/announcements/update/update.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.announcements.delete': {
    methods: ["DELETE"]
    pattern: '/administrator/announcements/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/announcements/delete/delete.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/announcements/delete/delete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.brackets.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/administrator/brackets'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#features/administrator/brackets/brackets.validator').AdministratorBracketPaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/brackets/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/brackets/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.brackets.create': {
    methods: ["POST"]
    pattern: '/administrator/brackets'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/administrator/brackets/brackets.validator').AdministratorBracketCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#features/administrator/brackets/brackets.validator').AdministratorBracketCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/brackets/create/create.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/brackets/create/create.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.brackets.show': {
    methods: ["GET","HEAD"]
    pattern: '/administrator/brackets/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/brackets/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/brackets/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.brackets.delete': {
    methods: ["DELETE"]
    pattern: '/administrator/brackets/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/brackets/delete/delete.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/brackets/delete/delete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.matches.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/administrator/matches'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#features/administrator/matches/matches.validator').AdministratorMatchPaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/matches/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/matches/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.matches.update': {
    methods: ["PUT"]
    pattern: '/administrator/matches/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/administrator/matches/matches.validator').AdministratorMatchUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#features/administrator/matches/matches.validator').AdministratorMatchUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/matches/update/update.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/matches/update/update.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.matches.score': {
    methods: ["PUT"]
    pattern: '/administrator/matches/:id/score'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/administrator/matches/matches.validator').AdministratorMatchScoreValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#features/administrator/matches/matches.validator').AdministratorMatchScoreValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/matches/score/score.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/matches/score/score.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.matches.unscore': {
    methods: ["DELETE"]
    pattern: '/administrator/matches/:id/score'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/matches/unscore/unscore.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/matches/unscore/unscore.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.users.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/administrator/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#features/administrator/users/users.validator').AdministratorUserPaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/users/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/users/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.users.create': {
    methods: ["POST"]
    pattern: '/administrator/users'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/administrator/users/users.validator').AdministratorUserCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#features/administrator/users/users.validator').AdministratorUserCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/users/create/create.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/users/create/create.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.users.show': {
    methods: ["GET","HEAD"]
    pattern: '/administrator/users/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/users/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/users/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.users.update': {
    methods: ["PUT"]
    pattern: '/administrator/users/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/administrator/users/users.validator').AdministratorUserUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#features/administrator/users/users.validator').AdministratorUserUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/users/update/update.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/users/update/update.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.lifecycle.users.archive': {
    methods: ["PATCH"]
    pattern: '/administrator/users/:id/archive'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/users/archive/archive.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/users/archive/archive.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.lifecycle.users.unarchive': {
    methods: ["PATCH"]
    pattern: '/administrator/users/:id/unarchive'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/users/unarchive/unarchive.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/users/unarchive/unarchive.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'administrator.lifecycle.users.purge': {
    methods: ["DELETE"]
    pattern: '/administrator/users/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/administrator/users/delete/delete.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/administrator/users/delete/delete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'advisor.classrooms': {
    methods: ["GET","HEAD"]
    pattern: '/advisor/classrooms'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#core/validator').PaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/advisor/classrooms/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/advisor/classrooms/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'advisor.students.paginate': {
    methods: ["GET","HEAD"]
    pattern: '/advisor/students'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#features/advisor/students/students.validator').AdvisorStudentPaginationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/advisor/students/paginate/paginate.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/advisor/students/paginate/paginate.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'advisor.students.create': {
    methods: ["POST"]
    pattern: '/advisor/students'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/advisor/students/students.validator').AdvisorStudentCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#features/advisor/students/students.validator').AdvisorStudentCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/advisor/students/create/create.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/advisor/students/create/create.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'advisor.students.update': {
    methods: ["PUT"]
    pattern: '/advisor/students/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/advisor/students/students.validator').AdvisorStudentUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#features/advisor/students/students.validator').AdvisorStudentUpdateValidator)>|InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/advisor/students/update/update.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/advisor/students/update/update.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'advisor.students.delete': {
    methods: ["DELETE"]
    pattern: '/advisor/students/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#core/validator').IdentifierValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/advisor/students/delete/delete.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/advisor/students/delete/delete.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'advisor.enrollments.show': {
    methods: ["GET","HEAD"]
    pattern: '/advisor/enrollments'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#features/advisor/enrollments/enrollments.validator').AdvisorEnrollmentShowValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/advisor/enrollments/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/advisor/enrollments/show/show.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'advisor.enrollments.update': {
    methods: ["PUT"]
    pattern: '/advisor/enrollments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/advisor/enrollments/enrollments.validator').AdvisorEnrollmentUpdateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#features/advisor/enrollments/enrollments.validator').AdvisorEnrollmentUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/advisor/enrollments/update/update.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/advisor/enrollments/update/update.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'representative.enrollments.show': {
    methods: ["GET","HEAD"]
    pattern: '/representative/enrollments'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#features/representative/enrollments/show/show.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/representative/enrollments/show/show.controller').default['handle']>>>
    }
  }
  'representative.enrollments.update': {
    methods: ["PUT"]
    pattern: '/representative/enrollments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#features/representative/enrollments/enrollments.validator').RepresentativeEnrollmentUpdateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#features/representative/enrollments/enrollments.validator').RepresentativeEnrollmentUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#features/representative/enrollments/update/update.controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#features/representative/enrollments/update/update.controller').default['handle']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
}
