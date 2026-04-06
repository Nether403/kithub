import type { FastifyPluginAsync } from 'fastify';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {
    // TODO: implement email verification flow via @kithub/db
    return { status: 'pending', message: 'Verification email sent.' };
  });

  fastify.post('/verify-email', async (request, reply) => {
    return { status: 'success', message: 'Email verified.' };
  });

  fastify.post('/login', async (request, reply) => {
    return { token: 'mock-token-for-v1' };
  });

  fastify.post('/logout', async (request, reply) => {
    return { status: 'success' };
  });
};
