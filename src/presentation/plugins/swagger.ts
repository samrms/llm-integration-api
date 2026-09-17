import type { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

export async function registerSwagger(fastify: FastifyInstance): Promise<void> {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'LLM Integration API',
        description:
          'Multi-tenant LLM gateway REST API providing a unified interface to multiple LLM providers with organization-based access control, API key management, conversation tracking, and usage monitoring.',
        version: '0.1.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT access token obtained from /api/v1/auth/signin',
          },
          apiKeyHeader: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Api-Key',
            description:
              'API key for programmatic access. Obtain from /api/v1/organizations/:id/api-keys',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'auth', description: 'Authentication and user management' },
        {
          name: 'organizations',
          description: 'Organization and member management',
        },
        { name: 'api-keys', description: 'API key management' },
        { name: 'models', description: 'Available LLM models' },
        { name: 'completions', description: 'LLM chat completions' },
        {
          name: 'conversations',
          description: 'Conversation and message management',
        },
        { name: 'usage', description: 'Usage metrics and reporting' },
      ],
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  })
}
