import { FastifyInstance, FastifyReply } from 'fastify'

import { geometriesRepository } from '../repositories/geometries.repository'
import {
  indicatorsRepository,
  type IndicatorHierarchyTreeNode,
} from '../repositories/indicators.repository'
import { indicatorValuesRepository } from '../repositories/indicator-values.repository'
import { healthIndicatorValuesRepository } from '../repositories/health-indicator-values.repository'
import { coastalIndicatorValuesRepository } from '../repositories/coastal-indicator-values.repository'
import { workgroupsService } from '../services/workgroups.service'
import { db } from '../db/connection'
import { sql } from 'drizzle-orm'

function calculateThresholds(values: number[]): {
  min: number
  q1: number
  median: number
  q3: number
  max: number
} {
  if (values.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0 }
  }

  const sorted = values.filter((v) => v !== null && !isNaN(v)).sort((a, b) => a - b)

  if (sorted.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0 }
  }

  return {
    min: sorted[0],
    q1: sorted[Math.floor(sorted.length * 0.25)],
    median: sorted[Math.floor(sorted.length * 0.5)],
    q3: sorted[Math.floor(sorted.length * 0.75)],
    max: sorted[sorted.length - 1],
  }
}

interface GeometriesQuery {
  simplified?: string
}

interface IndicatorsQuery {
  flat?: string
}

interface WorkgroupParams {
  workgroupId: string
}

interface IndicatorDataParams extends WorkgroupParams {
  id: string
}

const WORKGROUP_ALIASES = new Map<string, string>([
  ['agua', 'agua-doce'],
  ['aguadoce', 'agua-doce'],
  ['agua-doce', 'agua-doce'],
  ['ecosistemas-agua-doce', 'agua-doce'],
  ['ecossistemas-agua-doce', 'agua-doce'],
  ['gt-agua-doce', 'agua-doce'],
  ['gt-ecossistemas-agua-doce', 'agua-doce'],
  ['zonacosteira', 'litoral'],
  ['zona-costeira', 'litoral'],
  ['costa', 'litoral'],
  ['litoral', 'litoral'],
  ['saude', 'saude'],
  ['saude-ambiental', 'saude'],
  ['transportes', 'transportes'],
])

function normalizeWorkgroupId(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ensureValidWorkgroup(
  workgroupId: string,
  reply: FastifyReply,
): Promise<string | null> {
  const workgroups = await workgroupsService.getAllWorkgroups()
  const normalizedInput = normalizeWorkgroupId(workgroupId)

  const alias = WORKGROUP_ALIASES.get(normalizedInput)

  const matched = workgroups.find((workgroup) => {
    const normalizedId = normalizeWorkgroupId(workgroup.id)
    const normalizedName = normalizeWorkgroupId(workgroup.name)
    const target = alias ?? normalizedInput

    return (
      workgroup.active &&
      (normalizedId === target ||
        normalizedName === target ||
        normalizedId === normalizedInput)
    )
  })

  if (!matched) {
    await reply.status(400).send({
      error: 'Invalid workgroupId',
      message: `workgroupId "${workgroupId}" não é suportado`,
    })
    return null
  }

  return matched.id
}

export async function aguaDoceRoutes(server: FastifyInstance) {
  // Generic route: GET /workgroups/:workgroupId/geometries
  server.get<{
    Params: WorkgroupParams
    Querystring: GeometriesQuery
  }>(
    '/workgroups/:workgroupId/geometries',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            simplified: { type: 'string', enum: ['true', 'false'], default: 'true' },
          },
        },
      },
    },
    async (request, reply) => {
      const { workgroupId } = request.params
      const { simplified = 'true' } = request.query

      const resolvedWorkgroupId = await ensureValidWorkgroup(
        workgroupId,
        reply,
      )
      if (!resolvedWorkgroupId) {
        return
      }

      const simplifiedBool = simplified === 'true'

      const features = await geometriesRepository.getGeometriesByWorkgroup(
        resolvedWorkgroupId,
        simplifiedBool,
      )

      const payload = {
        type: 'FeatureCollection',
        features,
      }

      reply.type('application/geo+json')
      reply.header(
        'Cache-Control',
        'public, max-age=3600, stale-while-revalidate=86400',
      )

      return payload
    },
  )

  // Generic route: GET /workgroups/:workgroupId/indicators
  server.get<{
    Params: WorkgroupParams
    Querystring: IndicatorsQuery
  }>(
    '/workgroups/:workgroupId/indicators',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            flat: { type: 'boolean', default: false },
          },
        },
      },
    },
    async (request, reply) => {
      const { workgroupId } = request.params
      const { flat = false } = request.query

      const resolvedWorkgroupId = await ensureValidWorkgroup(
        workgroupId,
        reply,
      )
      if (!resolvedWorkgroupId) {
        return
      }

      const flatBool = flat === 'true'

      if (flatBool) {
        return await indicatorsRepository.getIndicatorsFlatByWorkgroup(
          resolvedWorkgroupId,
        )
      }

      return await indicatorsRepository.getIndicatorsByWorkgroup(
        resolvedWorkgroupId,
      )
    },
  )

  // Agua Doce hierarchy route: GET /workgroups/:workgroupId/indicators/hierarchy
  server.get<{
    Params: WorkgroupParams
  }>('/workgroups/:workgroupId/indicators/hierarchy', async (request, reply) => {
    const { workgroupId } = request.params

    const resolvedWorkgroupId = await ensureValidWorkgroup(workgroupId, reply)
    if (!resolvedWorkgroupId) {
      return
    }

    const hierarchy =
      await indicatorsRepository.getIndicatorHierarchyTree(resolvedWorkgroupId)

    const payload = hierarchy.map(transformHierarchyNode)
    return payload
  })

  // Generic values route: GET /workgroups/:workgroupId/indicators/:id/values
  server.get<{ Params: IndicatorDataParams }>(
    '/workgroups/:workgroupId/indicators/:id/values',
    async (request, reply) => {
      const { id, workgroupId } = request.params

      const resolvedWorkgroupId = await ensureValidWorkgroup(
        workgroupId,
        reply,
      )
      if (!resolvedWorkgroupId) {
        return
      }

      // Roteamento por workgroup
      if (resolvedWorkgroupId === 'agua-doce') {
        // Validar que indicatorId existe
        const exists = await indicatorValuesRepository.indicatorExists(
          id,
          resolvedWorkgroupId,
        )
        if (!exists) {
          return reply.status(404).send({ error: 'Indicator not found' })
        }

        const values = await indicatorValuesRepository.getIndicatorValues(id)

        return values.map((value) => ({
          hybas_id: value.hybasId,
          value: value.value,
          normalized_value: value.normalizedValue,
        }))
      }

      if (resolvedWorkgroupId === 'saude') {
        // Validar que indicatorId existe
        const exists = await healthIndicatorValuesRepository.indicatorExists(id)
        if (!exists) {
          return reply.status(404).send({ error: 'Indicator not found' })
        }

        const values = await healthIndicatorValuesRepository.getIndicatorValues(id)

        return values.map((value) => ({
          codigo_municipio: value.codigoMunicipio,
          municipio: value.municipio,
          value: value.value,
          normalized_value: value.normalizedValue,
        }))
      }

      if (resolvedWorkgroupId === 'litoral') {
        // Validar que indicatorId existe
        const exists = await coastalIndicatorValuesRepository.indicatorExists(id)
        if (!exists) {
          return reply.status(404).send({
            error: 'Indicator not found',
            message: `Indicador ${id} não encontrado para workgroup litoral`,
          })
        }

        const values = await coastalIndicatorValuesRepository.getIndicatorValues(id)

        return values.map((value) => ({
          codigo_municipio: value.codigoMunicipio,
          municipio: value.municipio,
          value: value.value,
          normalized_value: value.normalizedValue,
        }))
      }

      return reply
        .status(404)
        .send({ error: 'Indicator values not available for this workgroup' })
    },
  )

  server.get<{ Params: IndicatorDataParams }>(
    '/workgroups/:workgroupId/indicators/:id/data',
    async (request, reply) => {
      const { id, workgroupId } = request.params

      const resolvedWorkgroupId = await ensureValidWorkgroup(
        workgroupId,
        reply,
      )
      if (!resolvedWorkgroupId) {
        return
      }

      // Apenas litoral suportado neste endpoint (saúde e água-doce usam endpoints específicos)
      if (resolvedWorkgroupId !== 'litoral') {
        return reply.status(404).send({
          error: 'Endpoint not available for this workgroup',
          message: `Use /workgroups/${resolvedWorkgroupId}/indicators/${id}/values para este workgroup`,
        })
      }

      // Validar que indicador existe
      const exists = await coastalIndicatorValuesRepository.indicatorExists(id)
      if (!exists) {
        return reply.status(404).send({
          error: 'Indicator not found',
          message: `Indicador ${id} não encontrado para workgroup litoral`,
        })
      }

      // Buscar valores + geometrias em uma única query otimizada
      const result = await db.execute<{
        type: 'Feature'
        id: string
        geometry: unknown
        properties: {
          codigo: string
          municipio: string
          value: number
          normalized_value: number | null
        }
      }>(sql`
        SELECT
          'Feature' AS type,
          mg.codigo AS id,
          ST_AsGeoJSON(mg.geometry)::json AS geometry,
          jsonb_build_object(
            'codigo', mg.codigo,
            'municipio', mg.municipio,
            'value', civ.value,
            'normalized_value', civ.normalized_value
          ) AS properties
        FROM coastal_indicator_values civ
        JOIN municipality_geometries mg ON civ.codigo_municipio = mg.codigo
        JOIN indicator_hierarchy ih ON civ.indicator_id = ih.id
        WHERE (ih.code = ${id} OR ih.id::text = ${id})
          AND ih.workgroup_id = 'litoral'
        ORDER BY mg.municipio
      `)

      const features = result.rows

      // Calcular thresholds estatísticos
      const values = features.map((f) => f.properties.value)
      const thresholds = calculateThresholds(values)

      const geojson = {
        type: 'FeatureCollection' as const,
        features,
        metadata: {
          indicator_id: id,
          workgroup_id: 'litoral',
          feature_count: features.length,
          thresholds,
        },
      }

      reply.header('Cache-Control', 'public, max-age=300')
      return geojson
    },
  )
}

interface IndicatorHierarchyResponseNode {
  id: string
  code: string
  name: string
  type: IndicatorHierarchyTreeNode['type']
  parent_id: string | null
  order: number
  unit?: string | null
  description?: string | null
  children: IndicatorHierarchyResponseNode[]
}

function transformHierarchyNode(
  node: IndicatorHierarchyTreeNode,
): IndicatorHierarchyResponseNode {
  return {
    id: node.id,
    code: node.code,
    name: node.name,
    type: node.type,
    parent_id: node.parentId,
    order: node.order,
    unit: node.unit,
    description: node.description,
    children: node.children.map(transformHierarchyNode),
  }
}
