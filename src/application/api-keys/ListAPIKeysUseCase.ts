import type { APIKeyRepository } from '../../domain/ports/APIKeyRepository.js'
import type { APIKey } from '../../domain/entities/APIKey.js'

export class ListAPIKeysUseCase {
  constructor(private readonly apiKeyRepo: APIKeyRepository) {}

  async execute(organizationId: string): Promise<APIKey[]> {
    return this.apiKeyRepo.findByOrganizationId(organizationId)
  }
}
