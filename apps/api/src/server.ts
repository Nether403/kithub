import createFastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { authRoutes } from './routes/auth';
import { kitRoutes } from './routes/kits';

const fastify = createFastify({ logger: true });

async function start() {
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'KitHub API',
        description: 'Agent-First API for the KitHub Platform',
        version: '0.1.0'
      },
      host: 'localhost:8080',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(kitRoutes, { prefix: '/api/kits' });

  try {
    await fastify.listen({ port: 8080, host: '0.0.0.0' });
    console.log(`Server listening at http://localhost:8080`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
