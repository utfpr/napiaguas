import { z } from 'zod'

export const WorkgroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string(),
  color: z.string(),
  geometryType: z.enum(['polygon', 'linestring']),
  active: z.boolean(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export type Workgroup = z.infer<typeof WorkgroupSchema>
