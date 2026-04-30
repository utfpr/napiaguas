import { FastifyInstance } from 'fastify'
import { z } from 'zod'

const uploadIdSchema = z.object({
  uploadId: z.string().uuid('ID de upload deve ser um UUID válido')
})

export async function stagingRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/staging/:uploadId - Obter preview de dados em staging
  fastify.get<{
    Params: { uploadId: string }
  }>('/staging/:uploadId', async (request, reply) => {
    try {
      const { uploadId } = uploadIdSchema.parse(request.params)

      const { db } = fastify
      const { stagingUploads } = await import('../../db/schema')
      const { eq } = await import('drizzle-orm')

      const [stagingData] = await db
        .select()
        .from(stagingUploads)
        .where(eq(stagingUploads.id, uploadId))

      if (!stagingData) {
        return reply.status(404).send({
          error: 'Upload não encontrado'
        })
      }

      const records = Array.isArray(stagingData.data)
        ? stagingData.data
        : JSON.parse(stagingData.data as string)

      const values = records.map((r: any) => Number(r.indicator_value))
      const validGeometries = records.filter((r: any) =>
        r.geometry_valid !== false
      ).length

      const statistics = {
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((a: number, b: number) => a + b, 0) / values.length,
        valid_geometries: validGeometries,
        invalid_geometries: records.length - validGeometries
      }

      const sampleData = records.slice(0, 50)

      const fileType = stagingData.filename.toLowerCase().endsWith('.gpkg')
        ? 'gpkg'
        : 'csv'

      return reply.send({
        id: stagingData.id,
        filename: stagingData.filename,
        workgroup_id: stagingData.workgroupId,
        indicator_id: stagingData.indicatorId,
        records_count: records.length,
        statistics,
        sample_data: sampleData,
        file_size_bytes: 0,
        file_type: fileType
      })
    } catch (error) {
      fastify.log.error(error)

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors
        })
      }

      return reply.status(500).send({
        error: 'Erro ao buscar preview'
      })
    }
  })

  // GET /api/v1/admin/staging/:uploadId/geojson - Obter GeoJSON para mapa
  fastify.get<{
    Params: { uploadId: string }
  }>('/staging/:uploadId/geojson', async (request, reply) => {
    try {
      const { uploadId } = uploadIdSchema.parse(request.params)

      const { db } = fastify
      const { stagingUploads } = await import('../../db/schema')
      const { eq } = await import('drizzle-orm')

      const [stagingData] = await db
        .select()
        .from(stagingUploads)
        .where(eq(stagingUploads.id, uploadId))

      if (!stagingData) {
        return reply.status(404).send({
          error: 'Upload não encontrado'
        })
      }

      const records = Array.isArray(stagingData.data)
        ? stagingData.data
        : JSON.parse(stagingData.data as string)

      const features = records
        .filter((record: any) => {
          return record.geometry || (record.lat && record.lng)
        })
        .map((record: any) => {
          let geometry

          if (record.geometry) {
            geometry = typeof record.geometry === 'string'
              ? JSON.parse(record.geometry)
              : record.geometry
          } else if (record.lat && record.lng) {
            geometry = {
              type: 'Point',
              coordinates: [Number(record.lng), Number(record.lat)]
            }
          }

          return {
            type: 'Feature',
            geometry,
            properties: {
              id: record.id,
              name: record.name,
              indicator_value: Number(record.indicator_value),
              geometry_type: record.geometry_type || 'Point'
            }
          }
        })

      const geojson = {
        type: 'FeatureCollection',
        features
      }

      return reply.send(geojson)
    } catch (error) {
      fastify.log.error(error)

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors
        })
      }

      return reply.status(500).send({
        error: 'Erro ao gerar GeoJSON'
      })
    }
  })

  // POST /api/v1/admin/staging/:uploadId/commit - Confirmar upload e mover para produção
  fastify.post<{
    Params: { uploadId: string }
  }>('/staging/:uploadId/commit', async (request, reply) => {
    try {
      const { uploadId } = uploadIdSchema.parse(request.params)

      const { db } = fastify
      const { stagingUploads, indicatorData } = await import('../../db/schema')
      const { eq } = await import('drizzle-orm')

      const [stagingData] = await db
        .select()
        .from(stagingUploads)
        .where(eq(stagingUploads.id, uploadId))

      if (!stagingData) {
        return reply.status(404).send({
          error: 'Upload não encontrado'
        })
      }

      const records = Array.isArray(stagingData.data)
        ? stagingData.data
        : JSON.parse(stagingData.data as string)

      let recordsInserted = 0

      try {
        await db.transaction(async (tx) => {
          await tx
            .delete(indicatorData)
            .where(eq(indicatorData.indicatorId, stagingData.indicatorId))

          const newData = records.map((record: any) => ({
            geometryId: record.geometry_id,
            indicatorId: stagingData.indicatorId,
            value: record.indicator_value,
            metadata: record.metadata || null
          }))

          await tx.insert(indicatorData).values(newData)
          recordsInserted = newData.length

          await tx
            .delete(stagingUploads)
            .where(eq(stagingUploads.id, uploadId))
        })
      } catch (dbError: any) {
        fastify.log.error(dbError)

        if (dbError.message && (dbError.message.includes('geometry_id') || dbError.message.includes('not-null'))) {
          return reply.status(400).send({
            error: 'Erro de validação: geometry_id obrigatório',
            message: 'Os dados não possuem referências de geometria (geometry_id) necessárias para commit.',
            details: {
              type: 'MISSING_GEOMETRY_ID',
              suggestion: 'Use arquivos GPKG ou adicione coluna geometry_id com IDs válidos no CSV.',
              technicalError: dbError.message
            }
          })
        }

        throw dbError
      }

      return reply.send({
        message: 'Dados atualizados com sucesso',
        records_inserted: recordsInserted
      })
    } catch (error) {
      fastify.log.error(error)

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors
        })
      }

      return reply.status(500).send({
        error: 'Erro ao confirmar upload. Transação revertida.',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  })

  // DELETE /api/v1/admin/staging/:uploadId - Cancelar upload
  fastify.delete<{
    Params: { uploadId: string }
  }>('/staging/:uploadId', async (request, reply) => {
    try {
      const { uploadId } = uploadIdSchema.parse(request.params)

      const { db } = fastify
      const { stagingUploads } = await import('../../db/schema')
      const { eq } = await import('drizzle-orm')

      const [stagingData] = await db
        .select()
        .from(stagingUploads)
        .where(eq(stagingUploads.id, uploadId))

      if (!stagingData) {
        return reply.status(404).send({
          error: 'Upload não encontrado'
        })
      }

      await db
        .delete(stagingUploads)
        .where(eq(stagingUploads.id, uploadId))

      return reply.status(204).send()
    } catch (error) {
      fastify.log.error(error)

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors
        })
      }

      return reply.status(500).send({
        error: 'Erro ao cancelar upload'
      })
    }
  })
}
