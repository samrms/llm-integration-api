import type { APIKeyRepository } from '../../domain/ports/APIKeyRepository.js'
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js'
import { UserRole } from '../../domain/entities/User.js'
import {
  AuthorizationError,
  NotFoundError,
} from '../../domain/errors/AppError.js'

export interface RevokeAPIKeyInput {
  organizationId: string
  apiKeyId: string
  userId: string
}

export class RevokeAPIKeyUseCase {
  constructor(
    private readonly apiKeyRepo: APIKeyRepository,
    private readonly memberRepo: OrganizationMemberRepository,
  ) {}

  async execute(input: RevokeAPIKeyInput): Promise<void> {
    // Verify user has permission
    const membership = await this.memberRepo.findByOrganizationAndUser(
      input.organizationId,
      input.userId,
    )

    if (!membership || !membership.hasMinimumRole(UserRole.ADMIN)) {
      throw new AuthorizationError('Only admins or owners can revoke API keys')
    }

    const apiKey = await this.apiKeyRepo.findById(input.apiKeyId)
    if (!apiKey || apiKey.organizationId !== input.organizationId) {
      throw new NotFoundError('API key')
    }

    await this.apiKeyRepo.revoke(input.apiKeyId)
  }
}
