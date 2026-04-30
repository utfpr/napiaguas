import { sql, type SQL } from 'drizzle-orm'

import { db } from '@/db/connection'

export type RoadType = 'federal' | 'estadual'

export interface GeometryTransportesRow {
  id: string
  name: string
  code: string | null
  roadType: RoadType
  lengthKm: number | null
  geometry: string
  metadata: Record<string, unknown> | null
}

export interface BackgroundGeometryRow {
  [key: string]: unknown
  id: string
  name: string
  geometry: string
}

interface GeometryQueryOptions {
  simplify?: boolean
  simplifyTolerance?: number
  workgroupId?: string
}

interface BackgroundLayerOptions {
  simplifyTolerance?: number
}

const DEFAULT_SIMPLIFY_TOLERANCE = 0.001

export class GeometryTransportesRepository {
  async findAll(
    options: GeometryQueryOptions = {},
  ): Promise<GeometryTransportesRow[]> {
    return this.executeGeometryQuery(undefined, options)
  }

  async findByRoadType(
    roadType: RoadType,
    options: GeometryQueryOptions = {},
  ): Promise<GeometryTransportesRow[]> {
    return this.executeGeometryQuery(roadType, options)
  }

  async findBackgroundLayer(
    options: BackgroundLayerOptions = {},
  ): Promise<BackgroundGeometryRow[]> {
    const tolerance = options.simplifyTolerance ?? DEFAULT_SIMPLIFY_TOLERANCE

    const result = await db.execute<BackgroundGeometryRow>(sql`
      -- Índices utilizados:
      --  * idx_geometries_saude_workgroup (WHERE workgroup_id)
      --  * idx_geometries_saude_geometry (ST_Simplify/AsGeoJSON com GIST)
      SELECT
        id,
        name,
        ST_AsGeoJSON(
          CASE
            WHEN ${tolerance}::double precision > 0 THEN ST_Simplify(geometry, ${tolerance}::double precision)
            ELSE geometry
          END
        ) AS geometry
      FROM geometries_saude
      WHERE workgroup_id = 'saude'
      ORDER BY name
    `)

    return result.rows
  }

  private async executeGeometryQuery(
    roadType: RoadType | undefined,
    options: GeometryQueryOptions,
  ): Promise<GeometryTransportesRow[]> {
    const tolerance = options.simplifyTolerance ?? DEFAULT_SIMPLIFY_TOLERANCE
    const shouldSimplify = options.simplify ?? false
    const workgroupId = options.workgroupId ?? 'transportes'

    const geometryExpression: SQL = shouldSimplify
      ? sql`ST_Simplify(geometry, ${tolerance}::double precision)`
      : sql`geometry`

    const roadTypePredicate: SQL = roadType
      ? sql`AND road_type = ${roadType}`
      : sql``

    const result = await db.execute<{
      id: string
      name: string
      code: string | null
      road_type: RoadType
      length_km: number | null
      geometry: string
      metadata: Record<string, unknown> | null
    }>(sql`
      -- Índices utilizados:
      --  * idx_geometries_transportes_workgroup (WHERE workgroup_id)
      --  * idx_geometries_transportes_geometry (ST_AsGeoJSON -> GIST)
      SELECT
        id,
        name,
        code,
        road_type,
        length_km::float AS length_km,
        ST_AsGeoJSON(${geometryExpression}) AS geometry,
        metadata
      FROM geometries_transportes
      WHERE workgroup_id = ${workgroupId}
      ${roadTypePredicate}
      ORDER BY name
    `)

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      roadType: row.road_type,
      lengthKm: row.length_km,
      geometry: row.geometry,
      metadata: row.metadata,
    }))
  }
}

export const geometryTransportesRepository = new GeometryTransportesRepository()
