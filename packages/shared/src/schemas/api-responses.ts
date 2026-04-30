import { z } from 'zod'

import {
  FeatureCollectionSchema,
  FeatureSchema,
} from './geometry.schema'

const roadTypeEnum = z.enum(['federal', 'estadual'])

const transportesGeometryPropertiesSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable(),
  roadType: roadTypeEnum,
  lengthKm: z.number().nullable(),
  metadata: z.record(z.unknown()).optional(),
})

const multiLineGeometrySchema = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z
    .array(z.array(z.tuple([z.number(), z.number()])))
    .min(1),
})

export const geometriesGeoJSONResponseSchema = FeatureCollectionSchema.extend({
  features: z.array(
    FeatureSchema.extend({
      geometry: multiLineGeometrySchema,
      properties: transportesGeometryPropertiesSchema,
    }),
  ),
  backgroundLayer: FeatureCollectionSchema.optional(),
})

interface IndicatorHierarchyNode {
  id: string
  name: string
  description?: string | null
  unit?: string | null
  level: 'index' | 'subindex' | 'indicator'
  order: number
  metadata?: Record<string, unknown> | null
  children: IndicatorHierarchyNode[]
}

const indicatorHierarchyNodeSchema: z.ZodType<IndicatorHierarchyNode> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable().optional(),
    unit: z.string().nullable().optional(),
    level: z.enum(['index', 'subindex', 'indicator']),
    order: z.number(),
    metadata: z.record(z.unknown()).nullable().optional(),
    children: z.array(indicatorHierarchyNodeSchema),
  }),
)

export const indicatorHierarchyResponseSchema = z.array(
  indicatorHierarchyNodeSchema,
)

const indicatorDataPropertiesSchema = z.object({
  geometryId: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable(),
  roadType: roadTypeEnum,
  lengthKm: z.number().nullable(),
  value: z.number().min(0),
  normalizedValue: z.number().min(0).max(1),
  indicatorMetadata: z.record(z.unknown()).nullable().optional(),
  geometryMetadata: z.record(z.unknown()).nullable().optional(),
})

// Metadata estatística para respostas de dados de indicadores
export const metadataStatsSchema = z.object({
  indicatorId: z.string().uuid(),
  min: z.number(),
  max: z.number(),
  median: z.number(),
  lastUpdated: z.string().datetime(),
})

export const indicatorDataResponseSchema = FeatureCollectionSchema.extend({
  features: z.array(
    FeatureSchema.extend({
      geometry: multiLineGeometrySchema,
      properties: indicatorDataPropertiesSchema,
    }),
  ),
})

// Response com metadata estatística dos indicadores (min, max, média, quartis).
export const indicatorDataWithMetadataResponseSchema =
  indicatorDataResponseSchema.extend({
    metadata: metadataStatsSchema,
  })

export type GeometriesGeoJSONResponse = z.infer<
  typeof geometriesGeoJSONResponseSchema
>
export type IndicatorHierarchyResponse = z.infer<
  typeof indicatorHierarchyResponseSchema
>
export type IndicatorDataResponse = z.infer<
  typeof indicatorDataResponseSchema
>
export type MetadataStats = z.infer<typeof metadataStatsSchema>
export type IndicatorDataWithMetadataResponse = z.infer<
  typeof indicatorDataWithMetadataResponseSchema
>
