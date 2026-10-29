/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  healthCheck: typeof routes['health-check']
  documentation: {
    openapi: typeof routes['documentation.openapi']
    reference: typeof routes['documentation.reference']
  }
  storefront: {
    sports: typeof routes['storefront.sports']
    announcements: typeof routes['storefront.announcements']
    matches: typeof routes['storefront.matches']
    site: typeof routes['storefront.site']
    brackets: {
      paginate: typeof routes['storefront.brackets.paginate']
      show: typeof routes['storefront.brackets.show']
    }
  }
  authentication: {
    signIn: typeof routes['authentication.sign_in']
    signOut: typeof routes['authentication.sign_out']
    refresh: typeof routes['authentication.refresh']
  }
  profile: {
    show: typeof routes['profile.show']
    update: typeof routes['profile.update']
  }
  storages: {
    paginate: typeof routes['storages.paginate']
    create: typeof routes['storages.create']
    complete: typeof routes['storages.complete']
    parts: typeof routes['storages.parts']
    show: typeof routes['storages.show']
    delete: typeof routes['storages.delete']
    download: typeof routes['storages.download']
  }
  administrator: {
    classrooms: {
      paginate: typeof routes['administrator.classrooms.paginate']
      create: typeof routes['administrator.classrooms.create']
      show: typeof routes['administrator.classrooms.show']
      update: typeof routes['administrator.classrooms.update']
      delete: typeof routes['administrator.classrooms.delete']
    }
    sports: {
      paginate: typeof routes['administrator.sports.paginate']
      create: typeof routes['administrator.sports.create']
      show: typeof routes['administrator.sports.show']
      update: typeof routes['administrator.sports.update']
      delete: typeof routes['administrator.sports.delete']
    }
    site: {
      show: typeof routes['administrator.site.show']
      update: typeof routes['administrator.site.update']
    }
    announcements: {
      paginate: typeof routes['administrator.announcements.paginate']
      create: typeof routes['administrator.announcements.create']
      show: typeof routes['administrator.announcements.show']
      update: typeof routes['administrator.announcements.update']
      delete: typeof routes['administrator.announcements.delete']
    }
    brackets: {
      paginate: typeof routes['administrator.brackets.paginate']
      create: typeof routes['administrator.brackets.create']
      preview: typeof routes['administrator.brackets.preview']
      show: typeof routes['administrator.brackets.show']
      delete: typeof routes['administrator.brackets.delete']
    }
    matches: {
      paginate: typeof routes['administrator.matches.paginate']
      update: typeof routes['administrator.matches.update']
      score: typeof routes['administrator.matches.score']
      athletes: typeof routes['administrator.matches.athletes']
      unscore: typeof routes['administrator.matches.unscore']
    }
    cards: {
      paginate: typeof routes['administrator.cards.paginate']
      create: typeof routes['administrator.cards.create']
      delete: typeof routes['administrator.cards.delete']
    }
    enrollmentRemovals: {
      paginate: typeof routes['administrator.enrollmentRemovals.paginate']
      acknowledge: typeof routes['administrator.enrollmentRemovals.acknowledge']
    }
    users: {
      paginate: typeof routes['administrator.users.paginate']
      create: typeof routes['administrator.users.create']
      show: typeof routes['administrator.users.show']
      update: typeof routes['administrator.users.update']
    }
    lifecycle: {
      users: {
        archive: typeof routes['administrator.lifecycle.users.archive']
        unarchive: typeof routes['administrator.lifecycle.users.unarchive']
        purge: typeof routes['administrator.lifecycle.users.purge']
      }
    }
  }
  advisor: {
    classrooms: typeof routes['advisor.classrooms']
    cards: typeof routes['advisor.cards']
    students: {
      paginate: typeof routes['advisor.students.paginate']
      create: typeof routes['advisor.students.create']
      update: typeof routes['advisor.students.update']
      delete: typeof routes['advisor.students.delete']
    }
    enrollments: {
      show: typeof routes['advisor.enrollments.show']
      update: typeof routes['advisor.enrollments.update']
    }
  }
  representative: {
    enrollments: {
      show: typeof routes['representative.enrollments.show']
      update: typeof routes['representative.enrollments.update']
    }
  }
}
