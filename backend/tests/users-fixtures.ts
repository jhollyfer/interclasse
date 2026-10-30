import User from '#models/user'

/** A conta pelo e-mail, lida direto do banco: o spec confere o efeito sem importar o model. */
export function findUserByEmail(email: string): Promise<User> {
  return User.findByOrFail('email', email)
}

/** Se a linha da conta ainda existe, apagada de vez ou não. */
export async function userExists(id: string): Promise<boolean> {
  return (await User.find(id)) !== null
}
