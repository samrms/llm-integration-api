import type { OrganizationRepository } from '../../domain/ports/OrganizationRepository.js'
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js'
import { UserRole } from '../../domain/entities/User.js'
import type { Organization } from '../../domain/entities/Organization.js'
import { ValidationError } from '../../domain/errors/AppError.js'

export interface CreateOrganizationInput {
  userId: string
  name: string
}

export class CreateOrganizationUseCase {
  constructor(
    private readonly orgRepo: OrganizationRepository,
    private readonly memberRepo: OrganizationMemberRepository,
  ) {}

  async execute(input: CreateOrganizationInput): Promise<Organization> {
    const name = input.name.trim()
    if (!name) {
      throw new ValidationError('Organization name is required')
    }

    const org = await this.orgRepo.create({
      name,
      ownerId: input.userId,
    })

    await this.memberRepo.add({
      organizationId: org.id,
      userId: input.userId,
      role: UserRole.OWNER,
    })

    return org
  }
}
