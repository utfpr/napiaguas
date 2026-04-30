import { sql } from 'drizzle-orm'

import { db } from '../db/connection'

interface IndicatorDataFeature {
  type: 'Feature'
  id: string
  geometry: {
    type: string
    coordinates: number[][][] | number[][]
  }
  properties: {
    name: string
    value: number
    normalizedValue: number | null
    metadata?: Record<string, unknown>
  }
}

interface IndicatorResolution {
  id: string
  code: string
  workgroupId: string
}

interface IndicatorValueRow {
  hybasId: string
  value: number
  normalizedValue: number | null
}

export class IndicatorValuesRepository {
  private async resolveIndicator(
    indicatorIdentifier: string,
  ): Promise<IndicatorResolution | null> {
    const result = await db.execute<{
      id: string
      code: string
      workgroup_id: string
    }>(sql`
      SELECT id::text AS id, code, workgroup_id
      FROM indicator_hierarchy
      WHERE code = ${indicatorIdentifier} OR id::text = ${indicatorIdentifier}
      LIMIT 1
    `)

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]

    return {
      id: row.id,
      code: row.code,
      workgroupId: row.workgroup_id,
    }
  }

  async getIndicatorData(
    indicatorIdentifier: string,
  ): Promise<IndicatorDataFeature[]> {
    const indicator = await this.resolveIndicator(indicatorIdentifier)
    if (!indicator) {
      return []
    }

    const result = await db.execute<{
      hybas_id: string
      value: string
      normalized_value: string | null
      geometry: string
      properties: any
    }>(sql`
      SELECT
        iv.value::text,
        iv.normalized_value::text,
        h.hybas_id,
        h.properties,
        ST_AsGeoJSON(
          COALESCE(h.simplified_geometry, h.geometry)
        ) AS geometry
      FROM indicator_values iv
      JOIN hydrobasins_geometries h ON iv.hybas_id = h.hybas_id
      WHERE iv.indicator_id = ${indicator.id}
    `)

    return result.rows.map((row) => {
      let parsedGeometry
      try {
        parsedGeometry = JSON.parse(row.geometry)
      } catch (error) {
        console.error(
          `Invalid JSON in geometry for indicator value ${row.hybas_id}:`,
          error,
        )
        parsedGeometry = { type: 'Point', coordinates: [0, 0] }
      }

      let parsedProperties: Record<string, unknown> = {}
      if (row.properties) {
        try {
          parsedProperties =
            typeof row.properties === 'string'
              ? JSON.parse(row.properties)
              : row.properties
        } catch (error) {
          console.error(
            `Invalid properties JSON for hydrobasin ${row.hybas_id}`,
            error,
          )
          parsedProperties = {}
        }
      }

      const name =
        (parsedProperties.name as string | undefined) ??
        `HYBAS ${row.hybas_id}`

      return {
        type: 'Feature',
        id: row.hybas_id,
        geometry: parsedGeometry,
        properties: {
          name,
          value: Number(row.value),
          normalizedValue: row.normalized_value
            ? Number(row.normalized_value)
            : null,
          metadata: parsedProperties,
        },
      }
    })
  }

  async getIndicatorValues(
    indicatorIdentifier: string,
  ): Promise<IndicatorValueRow[]> {
    const indicator = await this.resolveIndicator(indicatorIdentifier)
    if (!indicator) {
      return []
    }

    const result = await db.execute<{
      hybas_id: string
      value: string
      normalized_value: string | null
    }>(sql`
      SELECT
        iv.hybas_id,
        iv.value::text AS value,
        iv.normalized_value::text AS normalized_value
      FROM indicator_values iv
      WHERE iv.indicator_id = ${indicator.id}
      ORDER BY iv.hybas_id
    `)

    return result.rows.map((row) => ({
      hybasId: row.hybas_id,
      value: Number(row.value),
      normalizedValue: row.normalized_value ? Number(row.normalized_value) : null,
    }))
  }

  async indicatorExists(
    indicatorIdentifier: string,
    workgroupId?: string,
  ): Promise<boolean> {
    const indicator = await this.resolveIndicator(indicatorIdentifier)
    if (!indicator) {
      return false
    }

    if (workgroupId && indicator.workgroupId !== workgroupId) {
      return false
    }

    return true
  }
}

export const indicatorValuesRepository = new IndicatorValuesRepository()
