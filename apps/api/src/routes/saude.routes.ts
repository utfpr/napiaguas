import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql, type SQL } from 'drizzle-orm'

import { db } from '../db/connection'
import { municipalityGeometriesRepository as _municipalityGeometriesRepository } from '../repositories/municipality-geometries.repository'
import { healthIndicatorValuesRepository as _healthIndicatorValuesRepository } from '../repositories/health-indicator-values.repository'

// Schemas de validação
const GetMunicipiosQuerySchema = z.object({
  simplified: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
  nome: z.string().optional(),
  codigo_ibge: z.string().regex(/^\d{6,7}$/).optional(),
  regional_saude: z.string().optional(),
  periodo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

interface MunicipioWithIndicators {
  id: string
  nome: string
  codigo_ibge: string
  regional_saude: string | null
  geometry: unknown
  properties: Record<string, unknown>
  indicadores: Record<string, number | null>
}

export async function saudeRoutes(server: FastifyInstance) {
  /**
   * GET /saude/municipios
   * Retorna municípios do Paraná com indicadores de saúde
   */
  server.get<{
    Querystring: z.infer<typeof GetMunicipiosQuerySchema>
  }>('/saude/municipios', {
    handler: async (request, reply) => {
      // Validar query params manualmente
      const queryValidation = GetMunicipiosQuerySchema.safeParse(request.query)
      if (!queryValidation.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Parâmetros de consulta inválidos',
          details: queryValidation.error.errors,
        })
      }
      const { simplified, nome, codigo_ibge, regional_saude, page, limit } = request.query

      // Query para buscar municípios com indicadores
      const geometryExpression = simplified
        ? sql`COALESCE(mg.simplified_geometry, mg.geometry)`
        : sql`mg.geometry`

      let whereConditions = sql``
      const conditions: SQL<unknown>[] = []

      if (nome) {
        conditions.push(sql`mg.municipio ILIKE ${`%${nome}%`}`)
      }

      if (codigo_ibge) {
        conditions.push(sql`mg.codigo = ${codigo_ibge}`)
      }

      if (regional_saude) {
        // Regional saúde pode estar nas properties JSONB
        conditions.push(sql`mg.properties->>'regional_saude' = ${regional_saude}`)
      }

      if (conditions.length > 0) {
        whereConditions = sql`WHERE ${sql.join(conditions, sql` AND `)}`
      }

      const offset = (page - 1) * limit

      // Buscar municípios com seus indicadores
      const result = await db.execute<{
        codigo: string
        municipio: string
        regional_saude: string | null
        geometry: string
        properties: string | null
        indicadores: string | null
      }>(sql`
        SELECT
          mg.codigo,
          mg.municipio,
          mg.properties->>'regional_saude' AS regional_saude,
          ST_AsGeoJSON(${geometryExpression}) AS geometry,
          mg.properties::text,
          jsonb_object_agg(
            ih.code,
            hiv.value
          ) FILTER (WHERE ih.code IS NOT NULL) AS indicadores
        FROM municipality_geometries mg
        LEFT JOIN health_indicator_values hiv ON mg.codigo = hiv.codigo_municipio
        LEFT JOIN indicator_hierarchy ih ON hiv.indicator_id = ih.id
        ${whereConditions}
        GROUP BY mg.codigo, mg.municipio, mg.properties, mg.geometry, mg.simplified_geometry
        ORDER BY mg.municipio
        LIMIT ${limit}
        OFFSET ${offset}
      `)

      const municipios: MunicipioWithIndicators[] = result.rows.map((row) => {
        let parsedGeometry
        try {
          parsedGeometry = JSON.parse(row.geometry)
        } catch (error) {
          server.log.error(`Invalid JSON in municipality geometry ${row.codigo}`, error)
          parsedGeometry = { type: 'Point', coordinates: [0, 0] }
        }

        let parsedProperties: Record<string, unknown> = {}
        if (row.properties) {
          try {
            parsedProperties = JSON.parse(row.properties)
          } catch (error) {
            server.log.error(`Invalid properties JSON for municipality ${row.codigo}`, error)
            parsedProperties = {}
          }
        }

        let parsedIndicadores: Record<string, number | null> = {}
        if (row.indicadores) {
          try {
            parsedIndicadores = JSON.parse(row.indicadores)
          } catch (error) {
            server.log.error(`Invalid indicadores JSON for municipality ${row.codigo}`, error)
            parsedIndicadores = {}
          }
        }

        return {
          id: row.codigo,
          nome: row.municipio,
          codigo_ibge: row.codigo,
          regional_saude: row.regional_saude,
          geometry: parsedGeometry,
          properties: parsedProperties,
          indicadores: parsedIndicadores,
        }
      })

      return reply.send(municipios)
    },
  })

  /**
   * GET /saude/municipios/:codigo
   * Retorna um município específico com seus indicadores
   */
  server.get<{
    Params: { codigo: string }
    Querystring: Pick<z.infer<typeof GetMunicipiosQuerySchema>, 'simplified'>
  }>('/saude/municipios/:codigo', {
    handler: async (request, reply) => {
      // Validar params manualmente
      const paramsSchema = z.object({
        codigo: z.string().regex(/^\d{6,7}$/),
      })
      const paramsValidation = paramsSchema.safeParse(request.params)
      if (!paramsValidation.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Código do município inválido',
          details: paramsValidation.error.errors,
        })
      }

      // Validar query params manualmente
      const querySchema = z.object({
        simplified: z
          .enum(['true', 'false'])
          .default('true')
          .transform((val) => val === 'true'),
      })
      const queryValidation = querySchema.safeParse(request.query)
      if (!queryValidation.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Parâmetros de consulta inválidos',
          details: queryValidation.error.errors,
        })
      }

      const { codigo } = paramsValidation.data
      const { simplified } = queryValidation.data

      const geometryExpression = simplified
        ? sql`COALESCE(mg.simplified_geometry, mg.geometry)`
        : sql`mg.geometry`

      const result = await db.execute<{
        codigo: string
        municipio: string
        regional_saude: string | null
        geometry: string
        properties: string | null
        indicadores: string | null
      }>(sql`
        SELECT
          mg.codigo,
          mg.municipio,
          mg.properties->>'regional_saude' AS regional_saude,
          ST_AsGeoJSON(${geometryExpression}) AS geometry,
          mg.properties::text,
          jsonb_object_agg(
            ih.code,
            hiv.value
          ) FILTER (WHERE ih.code IS NOT NULL) AS indicadores
        FROM municipality_geometries mg
        LEFT JOIN health_indicator_values hiv ON mg.codigo = hiv.codigo_municipio
        LEFT JOIN indicator_hierarchy ih ON hiv.indicator_id = ih.id
        WHERE mg.codigo = ${codigo}
        GROUP BY mg.codigo, mg.municipio, mg.properties, mg.geometry, mg.simplified_geometry
        LIMIT 1
      `)

      if (result.rows.length === 0) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Município com código ${codigo} não encontrado`,
        })
      }

      const row = result.rows[0]

      let parsedGeometry
      try {
        parsedGeometry = JSON.parse(row.geometry)
      } catch (error) {
        server.log.error(`Invalid JSON in municipality geometry ${row.codigo}`, error)
        parsedGeometry = { type: 'Point', coordinates: [0, 0] }
      }

      let parsedProperties: Record<string, unknown> = {}
      if (row.properties) {
        try {
          parsedProperties = JSON.parse(row.properties)
        } catch (error) {
          server.log.error(`Invalid properties JSON for municipality ${row.codigo}`, error)
          parsedProperties = {}
        }
      }

      let parsedIndicadores: Record<string, number | null> = {}
      if (row.indicadores) {
        try {
          parsedIndicadores = JSON.parse(row.indicadores)
        } catch (error) {
          server.log.error(`Invalid indicadores JSON for municipality ${row.codigo}`, error)
          parsedIndicadores = {}
        }
      }

      const municipio: MunicipioWithIndicators = {
        id: row.codigo,
        nome: row.municipio,
        codigo_ibge: row.codigo,
        regional_saude: row.regional_saude,
        geometry: parsedGeometry,
        properties: parsedProperties,
        indicadores: parsedIndicadores,
      }

      return reply.send(municipio)
    },
  })

  /**
   * GET /saude/indicadores
   * Retorna lista de indicadores disponíveis
   */
  server.get('/saude/indicadores', {
    handler: async (_request, reply) => {
      const result = await db.execute<{
        id: string
        code: string
        name: string
        type: string
        parent_id: string | null
        order: number
        description: string | null
      }>(sql`
        SELECT
          id::text AS id,
          code,
          name,
          type,
          parent_id::text AS parent_id,
          "order",
          description
        FROM indicator_hierarchy
        WHERE workgroup_id = 'saude'
        ORDER BY "order", name
      `)

      return reply.send(result.rows)
    },
  })
}
