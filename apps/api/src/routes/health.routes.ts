import type { FastifyPluginAsync } from 'fastify'
import { sql } from 'drizzle-orm'
import { HealthResponseSchema } from '@napi-aguas/shared'

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/health', async (request, reply) => {
    const version = process.env.npm_package_version ?? '0.0.0'
    const timestamp = Date.now()

    try {
      await fastify.db.execute(sql`SELECT 1`)

      const payload = HealthResponseSchema.parse({
        status: 'ok',
        timestamp,
        version,
        database: 'connected',
      })

      return payload
    } catch (error) {
      fastify.log.error({ err: error }, 'health_check_failed')

      const payload = HealthResponseSchema.parse({
        status: 'down',
        timestamp,
        version,
        database: 'unreachable',
      })

      return reply.status(503).send(payload)
    }
  })
}
