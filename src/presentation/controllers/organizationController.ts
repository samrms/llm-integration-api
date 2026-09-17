import type { FastifyRequest, FastifyReply } from 'fastify'
import type { CreateOrganizationUseCase } from '../../application/organizations/CreateOrganizationUseCase.js'
import type { ListOrganizationsUseCase } from '../../application/organizations/ListOrganizationsUseCase.js'
import type { AddMemberUseCase } from '../../application/organizations/AddMemberUseCase.js'
import type { RemoveMemberUseCase } from '../../application/organizations/RemoveMemberUseCase.js'
import { UserRole } from '../../domain/entities/User.js'

export interface OrganizationControllerDeps {
  createOrganizationUseCase: CreateOrganizationUseCase
  listOrganizationsUseCase: ListOrganizationsUseCase
  addMemberUseCase: AddMemberUseCase
  removeMemberUseCase: RemoveMemberUseCase
}

function serializeOrganization(org: {
  id: string
  name: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: org.id,
    name: org.name,
    ownerId: org.ownerId,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  }
}

export function createOrganizationController(deps: OrganizationControllerDeps) {
  return {
    async create(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as { name: string }

      const org = await deps.createOrganizationUseCase.execute({
        userId: request.userId!,
        name: body.name,
      })

      reply.code(201).send(serializeOrganization(org))
    },

    async list(request: FastifyRequest, reply: FastifyReply) {
      const memberships = await deps.listOrganizationsUseCase.execute({
        userId: request.userId!,
      })

      reply.send(
        memberships.map((m) => ({
          id: m.id,
          organizationId: m.organizationId,
          userId: m.userId,
          role: m.role,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
      )
    },

    async addMember(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { organizationId: string }
      const body = request.body as { email: string; role?: string }

      const membership = await deps.addMemberUseCase.execute({
        organizationId: params.organizationId,
        requesterId: request.userId!,
        targetEmail: body.email,
        role: (body.role as UserRole) ?? UserRole.MEMBER,
      })

      reply.code(201).send({
        id: membership.id,
        organizationId: membership.organizationId,
        userId: membership.userId,
        role: membership.role,
        createdAt: membership.createdAt.toISOString(),
        updatedAt: membership.updatedAt.toISOString(),
      })
    },

    async removeMember(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as {
        organizationId: string
        userId: string
      }

      await deps.removeMemberUseCase.execute({
        organizationId: params.organizationId,
        requesterId: request.userId!,
        targetUserId: params.userId,
      })

      reply.code(204).send()
    },
  }
}
