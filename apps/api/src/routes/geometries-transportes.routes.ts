import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  FeatureCollectionSchema,
  geometriesGeoJSONResponseSchema,
} from '@napi-aguas/shared'

import { geometryTransportesService } from '@/services/geometry-transportes.service'

const booleanParam = (defaultValue: boolean) =>
  z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) =>
      value === undefined ? defaultValue : value === 'true',
    )

const geometriesQuerySchema = z.object({
  road_type: z.enum(['federal', 'estadual']).optional(),
  simplify: booleanParam(false),
  include_background: booleanParam(false),
})

const backgroundQuerySchema = z.object({
  simplify: booleanParam(true),
})

export async function geometriesTransportesRoutes(server: FastifyInstance) {
  server.get(
    '/workgroups/transportes/geometries',
    async (request, reply) => {
      const query = geometriesQuerySchema.parse(request.query)

      const response =
        await geometryTransportesService.getGeometriesGeoJSON({
          roadType: query.road_type,
          simplify: query.simplify,
          includeBackgroundLayer: query.include_background,
        })

      const payload =
        typeof (geometriesGeoJSONResponseSchema as any)?.parse === 'function'
          ? geometriesGeoJSONResponseSchema.parse(response)
          : response

      reply.type('application/geo+json')
      reply.header('Cache-Control', 'public, max-age=300')
      return payload
    },
  )

  server.get(
    '/workgroups/transportes/geometries/background',
    async (request, reply) => {
      const query = backgroundQuerySchema.parse(request.query)

      const backgroundLayer =
        await geometryTransportesService.getBackgroundLayer({
          simplify: query.simplify,
        })

      const payload = FeatureCollectionSchema.parse(backgroundLayer)

      reply.header('Cache-Control', 'public, max-age=86400')
      return payload
    },
  )
}
