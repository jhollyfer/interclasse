export const policies = {
  ClassroomPolicy: () => import('#policies/classroom.policy'),
  StoragePolicy: () => import('#policies/storage.policy'),
  UserPolicy: () => import('#policies/user.policy'),
}

