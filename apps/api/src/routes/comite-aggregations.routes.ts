import type { FastifyPluginAsync } from 'fastify'

import type { GetAggregationsQuery, GetAggregationsResponse } from '../schemas/comite-aggregations.schema'

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const comiteAggregationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: GetAggregationsQuery
    Reply: GetAggregationsResponse | { error: { message: string; code: string } }
  }>(
    '/workgroups/agua-doce/comites/aggregations',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            indicatorId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { indicatorId } = request.query

      // Validar indicatorId: deve ser undefined, 'all', ou UUID válido
      if (indicatorId && indicatorId !== 'all' && !UUID_REGEX.test(indicatorId)) {
        return reply.code(400).send({
          error: {
            message: 'Parâmetro indicatorId inválido - deve ser um UUID válido ou "all"',
            code: 'INVALID_INDICATOR_ID',
          },
        })
      }

      // Buscar agregações (ordenação já é feita no repository)
      let aggregations
      let isMultipleIndicators = false

      if (!indicatorId || indicatorId === 'all') {
        aggregations = await fastify.comiteAggregationService.getAll()
        isMultipleIndicators = true
      } else {
        // Verificar se o indicador existe antes de buscar agregações
        const indicatorExists = await fastify.comiteAggregationService.indicatorExists(indicatorId)

        if (!indicatorExists) {
          return reply.code(404).send({
            error: {
              message: 'Indicador não encontrado',
              code: 'INDICATOR_NOT_FOUND',
            },
          })
        }

        aggregations = await fastify.comiteAggregationService.getByIndicatorId(indicatorId)
      }

      // Cache headers
      reply.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')

      // Montar metadata
      // Quando múltiplos indicadores, retorna null (evita confusão)
      // Quando indicador específico, retorna detalhes do indicador
      const uniqueComites = new Set(aggregations.map((a) => a.comite_nome))
      const indicator = !isMultipleIndicators && aggregations[0]
        ? {
            id: aggregations[0].indicator_id,
            name: aggregations[0].indicator_name,
            unit: aggregations[0].indicator_unit,
          }
        : null

      return {
        data: aggregations,
        metadata: {
          total_comites: uniqueComites.size,
          indicator,
        },
      }
    },
  )
}
