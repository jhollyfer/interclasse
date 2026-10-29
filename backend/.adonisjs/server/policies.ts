export const policies = {
  ClassroomPolicy: () => import('#policies/classroom.policy'),
  PhotoPolicy: () => import('#policies/photo.policy'),
  StoragePolicy: () => import('#policies/storage.policy'),
  UserPolicy: () => import('#policies/user.policy'),
}

