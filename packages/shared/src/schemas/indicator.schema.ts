import { z } from 'zod'

export interface IndicatorNode {
  id: string
  name: string
  description?: string
  unit?: string
  type: 'index' | 'subindex' | 'indicator'
  order: number
  children: IndicatorNode[]
}

export const IndicatorNodeSchema: z.ZodType<IndicatorNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    unit: z.string().optional(),
    type: z.enum(['index', 'subindex', 'indicator']),
    order: z.number(),
    children: z.array(IndicatorNodeSchema),
  }),
)

export const IndicatorTreeSchema = z.array(IndicatorNodeSchema)
