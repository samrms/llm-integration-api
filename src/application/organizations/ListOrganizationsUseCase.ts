import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js'
import type { OrganizationMember } from '../../domain/entities/OrganizationMember.js'

export class ListOrganizationsUseCase {
  constructor(
    private readonly memberRepo: OrganizationMemberRepository,
  ) {}

  async execute(params: { userId: string }): Promise<OrganizationMember[]> {
    return this.memberRepo.findByUserId(params.userId)
  }
}
