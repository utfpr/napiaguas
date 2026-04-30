import { FastifyInstance } from 'fastify'
import { WorkgroupSchema } from '@napi-aguas/shared'
import { workgroupsService } from '@/services/workgroups.service'
import { z } from 'zod'

export const workgroupsRoutes = async (server: FastifyInstance) => {
  server.get('/workgroups', async () => {
    const workgroups = await workgroupsService.getAllWorkgroups()

    const validated = z.array(WorkgroupSchema).parse(workgroups)
    return validated
  })
}
