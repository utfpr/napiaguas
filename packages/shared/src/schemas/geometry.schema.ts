import { z } from 'zod'

const PointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
})

const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
})

const LineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
})

const MultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(
    z.array(z.array(z.tuple([z.number(), z.number()]))),
  ),
})

const MultiLineStringSchema = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
})

export const GeometrySchema = z.union([
  PointSchema,
  PolygonSchema,
  LineStringSchema,
  MultiPolygonSchema,
  MultiLineStringSchema,
])

export const FeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.string().optional(),
  geometry: GeometrySchema,
  properties: z.record(z.any()),
})

export const FeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(FeatureSchema),
})

export type Geometry = z.infer<typeof GeometrySchema>
export type Feature = z.infer<typeof FeatureSchema>
export type FeatureCollection = z.infer<typeof FeatureCollectionSchema>
