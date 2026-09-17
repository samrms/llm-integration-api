import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Container } from './Container.js';
import { registerRoutes } from './Router.js';
import { requestIdHook } from '../presentation/hooks/requestId.js';
import { createErrorHandler } from '../presentation/hooks/errorHandler.js';
import { registerSwagger } from '../presentation/plugins/swagger.js';

export interface Application {
  start(): Promise<void>;
  stop(): Promise<void>;
  getServer(): ReturnType<typeof Fastify>;
}

export function createApplication(container: Container): Application {
  const fastify = Fastify({
    logger: {
      level: container.config.LOG_LEVEL,
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            hostname: request.hostname,
            remoteAddress: request.ip,
            requestId: (request as unknown as { requestId?: string }).requestId,
          };
        },
        res(reply) {
          return {
            statusCode: reply.statusCode,
          };
        },
      },
    },
    trustProxy: true,
    bodyLimit: 1_048_576,
  });

  let server: string | null = null;

  async function start(): Promise<void> {
    // Swagger (before other plugins that modify schema)
    await registerSwagger(fastify);

    // Plugins
    await fastify.register(cors, {
      origin: container.config.CORS_ORIGINS,
      credentials: true,
    });

    await fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    // Global hooks
    await fastify.addHook('onRequest', requestIdHook);

    // Error handler
    fastify.setErrorHandler(createErrorHandler(fastify.log));

    // Register routes
    await registerRoutes(fastify, container);

    // Start server
    await fastify.ready();
    server = await fastify.listen({
      port: container.config.PORT,
      host: '0.0.0.0',
    });
    fastify.log.info(`Server listening on ${server}`);
  }

  async function stop(): Promise<void> {
    if (server) {
      await fastify.close();
    }
    await container.db.disconnect();
    await container.redis.disconnect();
  }

  return {
    start,
    stop,
    getServer() {
      return fastify;
    },
  };
}
