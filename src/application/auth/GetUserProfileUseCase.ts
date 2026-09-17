import type { UserRepository } from '../../domain/ports/UserRepository.js'
import type { User } from '../../domain/entities/User.js'
import { NotFoundError } from '../../domain/errors/AppError.js'

export class GetUserProfileUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(params: { userId: string }): Promise<User> {
    const user = await this.userRepo.findById(params.userId)
    if (!user) {
      throw new NotFoundError('User')
    }
    return user
  }
}
