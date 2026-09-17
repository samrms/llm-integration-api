import type { RefreshTokenRepository } from '../../domain/ports/RefreshTokenRepository.js'
import type { TokenService } from '../../domain/ports/TokenService.js'
import type { UserRepository } from '../../domain/ports/UserRepository.js'
import { AuthenticationError } from '../../domain/errors/AppError.js'

export interface RefreshTokenInput {
  refreshToken: string
  userId: string
}

export interface RefreshTokenOutput {
  accessToken: string
  refreshToken: string
}

export class RefreshTokenUseCase {
  constructor(
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly userRepo: UserRepository,
    private readonly refreshTokenExpiresInDays: number,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    const tokenHash = await this.tokenService.hashToken(input.refreshToken)
    const existing = await this.refreshTokenRepo.findByTokenHash(tokenHash)

    if (!existing) {
      throw new AuthenticationError('Invalid refresh token')
    }

    if (existing.revokedAt !== null) {
      // Token reuse detected — revoke the entire family
      await this.refreshTokenRepo.revokeByFamily(existing.family)
      throw new AuthenticationError(
        'Refresh token reuse detected. All sessions revoked.',
      )
    }

    if (new Date(existing.expiresAt) < new Date()) {
      await this.refreshTokenRepo.revokeById(existing.id)
      throw new AuthenticationError('Refresh token expired')
    }

    // Revoke the old token
    await this.refreshTokenRepo.revokeById(existing.id)

    // Generate new token pair in the same family
    const newRefreshToken = await this.tokenService.generateRefreshToken()
    const newTokenHash = await this.tokenService.hashToken(newRefreshToken)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiresInDays)

    await this.refreshTokenRepo.create({
      userId: input.userId,
      tokenHash: newTokenHash,
      family: existing.family,
      expiresAt,
    })

    const user = await this.userRepo.findById(input.userId)
    if (!user) {
      throw new AuthenticationError('User not found')
    }

    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
    })

    return { accessToken, refreshToken: newRefreshToken }
  }
}
