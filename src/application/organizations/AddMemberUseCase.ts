import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js'
import type { UserRepository } from '../../domain/ports/UserRepository.js'
import type { OrganizationRepository } from '../../domain/ports/OrganizationRepository.js'
import { UserRole } from '../../domain/entities/User.js'
import type { OrganizationMember } from '../../domain/entities/OrganizationMember.js'
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from '../../domain/errors/AppError.js'

export interface AddMemberInput {
  organizationId: string
  requesterId: string
  targetEmail: string
  role: UserRole
}

export class AddMemberUseCase {
  constructor(
    private readonly memberRepo: OrganizationMemberRepository,
    private readonly userRepo: UserRepository,
    private readonly orgRepo: OrganizationRepository,
  ) {}

  async execute(input: AddMemberInput): Promise<OrganizationMember> {
    // Verify the organization exists
    const org = await this.orgRepo.findById(input.organizationId)
    if (!org) {
      throw new NotFoundError('Organization')
    }

    // Verify requester has ADMIN or OWNER role
    const requesterMembership = await this.memberRepo.findByOrganizationAndUser(
      input.organizationId,

      input.requesterId,
    )

    if (
      !requesterMembership ||
      !requesterMembership.hasMinimumRole(UserRole.ADMIN)
    ) {
      throw new AuthorizationError('Only admins or owners can add members')
    }

    // Find target user by email
    const targetUser = await this.userRepo.findByEmail(
      input.targetEmail.toLowerCase().trim(),
    )
    if (!targetUser) {
      throw new NotFoundError('User with this email')
    }

    // Check if already a member
    const existingMembership = await this.memberRepo.findByOrganizationAndUser(
      input.organizationId,

      targetUser.id,
    )
    if (existingMembership) {
      throw new ConflictError('User is already a member of this organization')
    }

    // Admins can only assign MEMBER role
    if (
      requesterMembership.role === UserRole.ADMIN &&
      input.role !== UserRole.MEMBER
    ) {
      throw new AuthorizationError('Admins can only assign the MEMBER role')
    }

    return this.memberRepo.add({
      organizationId: input.organizationId,
      userId: targetUser.id,
      role: input.role,
    })
  }
}
