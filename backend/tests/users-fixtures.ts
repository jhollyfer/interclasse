import User from '#models/user'

/** The account by e-mail, read straight from the database: the spec checks the effect without importing the model. */
export function findUserByEmail(email: string): Promise<User> {
  return User.findByOrFail('email', email)
}

/** Whether the account row still exists, deleted for good or not. */
export async function userExists(id: string): Promise<boolean> {
  return (await User.find(id)) !== null
}
