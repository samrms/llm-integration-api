import { randomBytes, createHash } from 'node:crypto'
import type { APIKeyRepository } from '../../domain/ports/APIKeyRepository.js'
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js'
import { UserRole } from '../../domain/entities/User.js'
import { APIKey, APIKeyScope } from '../../domain/entities/APIKey.js'
import { AuthorizationError } from '../../domain/errors/AppError.js'

const API_KEY_PREFIX = 'llm_live_'

export interface CreateAPIKeyInput {
  organizationId: string
  userId: string
  name: string
  scopes: APIKeyScope[]
  expiresAt?: Date
}

export interface CreateAPIKeyOutput {
  rawKey: string
  apiKey: APIKey
}

export class CreateAPIKeyUseCase {
  constructor(
    private readonly apiKeyRepo: APIKeyRepository,
    private readonly memberRepo: OrganizationMemberRepository,
  ) {}

  async execute(input: CreateAPIKeyInput): Promise<CreateAPIKeyOutput> {
    // Verify user is OWNER or ADMIN of the organization
    const membership = await this.memberRepo.findByOrganizationAndUser(
      input.organizationId,
      input.userId,
    )

    if (!membership || !membership.hasMinimumRole(UserRole.ADMIN)) {
      throw new AuthorizationError('Only admins or owners can create API keys')
    }

    // Generate random bytes for the key
    const randomPart = randomBytes(32).toString('hex')
    const rawKey = `${API_KEY_PREFIX}${randomPart}`

    // Hash the full key with SHA-256 for storage
    const keyHash = createHash('sha256').update(rawKey).digest('hex')

    // Create prefix: "llm_live_" + first 8 chars of the random hex
    const prefix = `${API_KEY_PREFIX}${randomPart.substring(0, 8)}`

    const apiKey = await this.apiKeyRepo.create({
      organizationId: input.organizationId,
      name: input.name,
      prefix,
      keyHash,
      scopes: input.scopes,
      expiresAt: input.expiresAt,
    })

    // Return raw key ONLY at creation — it is never retrievable again
    return { rawKey, apiKey }
  }
}
