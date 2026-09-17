import type { UserRepository } from '../../domain/ports/UserRepository.js'
import type { RefreshTokenRepository } from '../../domain/ports/RefreshTokenRepository.js'
import type { TokenService } from '../../domain/ports/TokenService.js'
import type { PasswordHasher } from '../../domain/ports/PasswordHasher.js'
import { AuthenticationError } from '../../domain/errors/AppError.js'
import type { User } from '../../domain/entities/User.js'

export interface SigninInput {
  email: string
  password: string
}

export interface SigninOutput {
  accessToken: string
  refreshToken: string
  user: User
}

export class SigninUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly hasher: PasswordHasher,
    private readonly refreshTokenExpiresInDays: number,
  ) {}

  async execute(input: SigninInput): Promise<SigninOutput> {
    const email = input.email.toLowerCase().trim()

    const user = await this.userRepo.findByEmail(email)
    if (!user) {
      throw new AuthenticationError('Invalid email or password')
    }

    const valid = await this.hasher.verify(user.passwordHash, input.password)
    if (!valid) {
      throw new AuthenticationError('Invalid email or password')
    }

    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
    })

    const refreshToken = await this.tokenService.generateRefreshToken()
    const tokenHash = await this.tokenService.hashToken(refreshToken)
    const family = this.tokenService.generateId()

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiresInDays)

    await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      family,
      expiresAt,
    })

    return { accessToken, refreshToken, user }
  }
}
