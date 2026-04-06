import type { FastifyPluginAsync } from 'fastify';

export const kitRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    // TODO: query packages/db for latest/popular kits
    return { kits: [] };
  });

  fastify.get('/:slug', async (request, reply) => {
    const { slug } = request.params as any;
    return { slug, title: 'Mock Kit v1' };
  });

  fastify.get('/:slug/install', async (request, reply) => {
    const { target } = request.query as any;
    if (!target) {
      return reply.code(400).send({ error: '?target= required (e.g. generic, claude-code, mcp, codex)' });
    }
    
    // Return target specific install payload
    return { 
      instructions: `Agent instructions for target: ${target}`,
      target,
      payload: {}
    };
  });

  fastify.post('/', async (request, reply) => {
    // TODO: parse kit.md via @kithub/schema, run safety scan
    return { status: 'created', score: 10, findings: [] };
  });
};
