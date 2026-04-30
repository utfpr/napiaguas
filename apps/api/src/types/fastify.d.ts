import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from '@/db/schema'
import type { ComiteAggregationService } from '@/services/comite-aggregation.service'

declare module 'fastify' {
  interface FastifyInstance {
    db: NodePgDatabase<typeof schema>
    comiteAggregationService: ComiteAggregationService
  }

  interface FastifyRequest {
    user?: {
      userId: string
      email: string
      role: string
      workgroupId: string | null
    }
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string
      email: string
      role: string
      workgroupId: string | null
    }
    user: {
      userId: string
      email: string
      role: string
      workgroupId: string | null
    }
  }
}
