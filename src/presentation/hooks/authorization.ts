import type { FastifyRequest, FastifyReply } from 'fastify'
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js'
import { UserRole } from '../../domain/entities/User.js'
import {
  AuthenticationError,
  AuthorizationError,
} from '../../domain/errors/AppError.js'

export function requireRole(
  memberRepo: OrganizationMemberRepository,
  minimumRole: UserRole,
) {
  return async function roleAuthorizationHandler(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.userId) {
      throw new AuthenticationError()
    }

    const organizationId = request.organizationId
    if (!organizationId) {
      throw new AuthorizationError('Organization context required')
    }

    const membership = await memberRepo.findByOrganizationAndUser(
      organizationId,
      request.userId,
    )

    if (!membership) {
      throw new AuthorizationError('Not a member of this organization')
    }

    if (!membership.hasMinimumRole(minimumRole)) {
      throw new AuthorizationError(`Requires ${minimumRole} role or higher`)
    }
  }
}

export function requireOwnership(memberRepo: OrganizationMemberRepository) {
  return requireRole(memberRepo, UserRole.OWNER)
}

export function requireAdminOrOwner(memberRepo: OrganizationMemberRepository) {
  return requireRole(memberRepo, UserRole.ADMIN)
}
