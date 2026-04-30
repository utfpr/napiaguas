import { z } from 'zod'

export const getAggregationsQuerySchema = z.object({
  indicatorId: z.string().uuid().or(z.literal('all')).optional(),
})

export const aggregationItemSchema = z.object({
  comite_nome: z.string(),
  indicator_id: z.string().uuid(),
  indicator_name: z.string(),
  indicator_unit: z.string().nullable(),
  mean_value: z.number(),
  count: z.number().int(),
  min_value: z.number(),
  max_value: z.number(),
})

export const getAggregationsResponseSchema = z.object({
  data: z.array(aggregationItemSchema),
  metadata: z.object({
    total_comites: z.number().int(),
    indicator: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
        unit: z.string().nullable(),
      })
      .nullable(),
  }),
})

export type GetAggregationsQuery = z.infer<typeof getAggregationsQuerySchema>
export type AggregationItem = z.infer<typeof aggregationItemSchema>
export type GetAggregationsResponse = z.infer<typeof getAggregationsResponseSchema>
