import { z } from 'zod'

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  timestamp: z.number(),
  version: z.string(),
  database: z.string().optional(),
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>
