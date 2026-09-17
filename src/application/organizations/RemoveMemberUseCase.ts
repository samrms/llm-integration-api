import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js'
import { UserRole } from '../../domain/entities/User.js'
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '../../domain/errors/AppError.js'

export interface RemoveMemberInput {
  organizationId: string
  requesterId: string
  targetUserId: string
}

export class RemoveMemberUseCase {
  constructor(private readonly memberRepo: OrganizationMemberRepository) {}

  async execute(input: RemoveMemberInput): Promise<void> {
    // Verify requester is OWNER or ADMIN
    const requesterMembership = await this.memberRepo.findByOrganizationAndUser(
      input.organizationId,
      input.requesterId,
    )

    if (
      !requesterMembership ||
      !requesterMembership.hasMinimumRole(UserRole.ADMIN)
    ) {
      throw new AuthorizationError('Only admins or owners can remove members')
    }

    // Prevent removing the OWNER
    const targetMembership = await this.memberRepo.findByOrganizationAndUser(
      input.organizationId,
      input.targetUserId,
    )

    if (!targetMembership) {
      throw new NotFoundError('Member')
    }

    if (targetMembership.role === UserRole.OWNER) {
      throw new ValidationError('Cannot remove the organization owner')
    }

    // Admins cannot remove other admins
    if (
      requesterMembership.role === UserRole.ADMIN &&
      targetMembership.role === UserRole.ADMIN
    ) {
      throw new AuthorizationError('Admins cannot remove other admins')
    }

    await this.memberRepo.remove(targetMembership.id)
  }
}
