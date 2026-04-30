import { z } from 'zod'
import { FeatureCollectionSchema } from './geometry.schema'

// Indicator Data é um FeatureCollection com properties específicas
export const IndicatorDataFeaturePropertiesSchema = z.object({
  name: z.string(),
  value: z.number(),
})

export const IndicatorDataFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.string().optional(),
  geometry: z.any(), // GeometrySchema importado causaria circular dependency
  properties: IndicatorDataFeaturePropertiesSchema,
})

export const IndicatorDataSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(IndicatorDataFeatureSchema),
})

// Re-export FeatureCollectionSchema para uso geral
export { FeatureCollectionSchema }

export type IndicatorDataFeatureProperties = z.infer<
  typeof IndicatorDataFeaturePropertiesSchema
>
export type IndicatorDataFeature = z.infer<typeof IndicatorDataFeatureSchema>
export type IndicatorData = z.infer<typeof IndicatorDataSchema>
