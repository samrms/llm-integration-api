import type { FastifyRequest, FastifyReply } from 'fastify'
import type { SignupUseCase } from '../../application/auth/SignupUseCase.js'
import type { SigninUseCase } from '../../application/auth/SigninUseCase.js'
import type { RefreshTokenUseCase } from '../../application/auth/RefreshTokenUseCase.js'
import type { LogoutUseCase } from '../../application/auth/LogoutUseCase.js'
import type { GetUserProfileUseCase } from '../../application/auth/GetUserProfileUseCase.js'

export interface AuthControllerDeps {
  signupUseCase: SignupUseCase
  signinUseCase: SigninUseCase
  refreshTokenUseCase: RefreshTokenUseCase
  logoutUseCase: LogoutUseCase
  getUserProfileUseCase: GetUserProfileUseCase
}

export function createAuthController(deps: AuthControllerDeps) {
  return {
    async signup(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as {
        email: string
        password: string
        name?: string
      }

      const result = await deps.signupUseCase.execute({
        email: body.email,
        password: body.password,
        name: body.name,
      })

      reply.code(201).send({
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          createdAt: result.user.createdAt.toISOString(),
          updatedAt: result.user.updatedAt.toISOString(),
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          ownerId: result.organization.ownerId,
          createdAt: result.organization.createdAt.toISOString(),
          updatedAt: result.organization.updatedAt.toISOString(),
        },
        membership: {
          id: result.membership.id,
          organizationId: result.membership.organizationId,
          userId: result.membership.userId,
          role: result.membership.role,
          createdAt: result.membership.createdAt.toISOString(),
          updatedAt: result.membership.updatedAt.toISOString(),
        },
      })
    },

    async signin(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as { email: string; password: string }

      const result = await deps.signinUseCase.execute({
        email: body.email,
        password: body.password,
      })

      reply.send({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          createdAt: result.user.createdAt.toISOString(),
          updatedAt: result.user.updatedAt.toISOString(),
        },
      })
    },

    async refresh(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as { refreshToken: string }

      const result = await deps.refreshTokenUseCase.execute({
        refreshToken: body.refreshToken,
        userId: request.userId!,
      })

      reply.send({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      })
    },

    async logout(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as { refreshToken?: string }

      await deps.logoutUseCase.execute({
        userId: request.userId!,
        refreshToken: body.refreshToken,
      })

      reply.code(204).send()
    },

    async me(request: FastifyRequest, reply: FastifyReply) {
      const user = await deps.getUserProfileUseCase.execute({
        userId: request.userId!,
      })

      reply.send({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })
    },
  }
}
