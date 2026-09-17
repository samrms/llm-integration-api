import type { User } from '../entities/User.js'

export interface CreateUserParams {
  email: string
  passwordHash: string
  name?: string
}

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(params: CreateUserParams): Promise<User>
  update(
    id: string,
    data: Partial<Pick<User, 'name' | 'passwordHash'>>,
  ): Promise<User>
  delete(id: string): Promise<void>
}
