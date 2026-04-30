import { z } from 'zod'

import { FeatureSchema } from './geometry.schema'
import { GTType } from '../types/gt-common.types'

export const gtTransportesGeometrySchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
})

export const gtTransportesIndicatorsSchema = z.object({
  inundacao_risco: z
    .number({ required_error: 'inundacao_risco é obrigatório' })
    .min(0, 'inundacao_risco deve ser ≥ 0')
    .max(1, 'inundacao_risco deve ser ≤ 1'),
  deslizamento_risco: z
    .number({ required_error: 'deslizamento_risco é obrigatório' })
    .min(0, 'deslizamento_risco deve ser ≥ 0')
    .max(1, 'deslizamento_risco deve ser ≤ 1'),
  pavimento_degradado: z
    .number({ required_error: 'pavimento_degradado é obrigatório' })
    .min(0, 'pavimento_degradado deve ser ≥ 0')
    .max(1, 'pavimento_degradado deve ser ≤ 1'),
  pontes_risco: z
    .number({ required_error: 'pontes_risco é obrigatório' })
    .min(0, 'pontes_risco deve ser ≥ 0')
    .max(1, 'pontes_risco deve ser ≤ 1'),
})

export const gtTransportesRoadSegmentSchema = z.object({
  id: z.string().uuid('id deve ser um UUID válido'),
  workgroup_id: z.literal(GTType.TRANSPORTES),
  name: z.string().min(1, 'name é obrigatório').max(255),
  code: z.string().min(1, 'code é obrigatório').max(50),
  road_type: z.enum(['federal', 'estadual']),
  geometry: gtTransportesGeometrySchema,
  length_km: z
    .number({ required_error: 'length_km é obrigatório' })
    .positive('length_km deve ser maior que zero'),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  indicadores: gtTransportesIndicatorsSchema.optional(),
})

export const gtTransportesFeatureSchema = FeatureSchema.extend({
  properties: z.object({
    roadSegmentId: z.string().uuid('roadSegmentId deve ser um UUID válido'),
  }),
})

export type GTTransportesRoadSegmentSchema = z.infer<
  typeof gtTransportesRoadSegmentSchema
>
export type GTTransportesIndicatorsSchema = z.infer<
  typeof gtTransportesIndicatorsSchema
>
