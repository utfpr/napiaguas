import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  indicatorDataResponseSchema as _indicatorDataResponseSchema,
  indicatorHierarchyResponseSchema,
} from '@napi-aguas/shared'

import { indicatorsService } from '@/services/indicators.service'

const workgroupParamsSchema = z.object({
  workgroupId: z.literal('transportes'),
})

const indicatorParamsSchema = workgroupParamsSchema.extend({
  id: z.string().uuid(),
})

export async function indicatorsRoutes(server: FastifyInstance) {
  server.get(
    '/workgroups/transportes/indicators',
    async (_request, reply) => {
      const { workgroupId } = workgroupParamsSchema.parse({
        workgroupId: 'transportes',
      })

      const hierarchy =
        await indicatorsService.getIndicatorHierarchy(workgroupId)
      const payload =
        typeof (indicatorHierarchyResponseSchema as any)?.parse === 'function'
          ? indicatorHierarchyResponseSchema.parse(hierarchy)
          : hierarchy

      reply.header('Cache-Control', 'public, max-age=300')
      return payload
    },
  )

  server.get(
    '/workgroups/transportes/indicators/:id/data',
    async (request, reply) => {
      const params = request.params as any
      const { id } = indicatorParamsSchema.parse({
        ...params,
        workgroupId: 'transportes',
      })

      try {
        const data = await indicatorsService.getIndicatorData(id)

        // Não aplicar schema pois remove campos adicionais como metadata
        reply.type('application/geo+json')
        reply.header('Cache-Control', 'public, max-age=300')
        return data
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode === 404) {
          return reply.status(404).send({
            error: 'Not Found',
            message: (error as Error).message,
          })
        }

        throw error
      }
    },
  )
}
