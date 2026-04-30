import { sql } from 'drizzle-orm'

import { db } from '../db/connection'

interface MunicipalityGeometryFeature {
  type: 'Feature'
  id: string
  geometry: {
    type: string
    coordinates: number[][][] | number[][]
  }
  properties: Record<string, unknown> & {
    codigo: string
    municipio: string
  }
}

export class MunicipalityGeometriesRepository {
  /**
   * Busca geometrias de municípios do Paraná (workgroup saúde)
   * @param simplified - Se true, usa simplified_geometry; caso contrário, geometry
   * @returns Array de features GeoJSON
   */
  async getMunicipalityGeometries(
    simplified = true,
  ): Promise<MunicipalityGeometryFeature[]> {
    const geometryExpression = simplified
      ? sql`COALESCE(simplified_geometry, geometry)`
      : sql`geometry`

    const result = await db.execute<{
      codigo: string
      municipio: string
      geometry: string
      properties: string | null
    }>(sql`
      SELECT
        codigo,
        municipio,
        ST_AsGeoJSON(${geometryExpression}) AS geometry,
        properties::text
      FROM municipality_geometries
      ORDER BY municipio
    `)

    return result.rows.map((row) => {
      let parsedGeometry
      try {
        parsedGeometry = JSON.parse(row.geometry)
      } catch (error) {
        console.error(`Invalid JSON in municipality geometry ${row.codigo}`, error)
        parsedGeometry = { type: 'Point', coordinates: [0, 0] }
      }

      let parsedProperties: Record<string, unknown> = {}
      if (row.properties) {
        try {
          parsedProperties = JSON.parse(row.properties)
        } catch (error) {
          console.error(
            `Invalid properties JSON for municipality ${row.codigo}`,
            error,
          )
          parsedProperties = {}
        }
      }

      const properties = {
        ...parsedProperties,
        codigo: row.codigo,
        municipio: row.municipio,
      }

      return {
        type: 'Feature' as const,
        id: row.codigo,
        geometry: parsedGeometry,
        properties,
      }
    })
  }

  /**
   * Busca uma geometria de município específica pelo código IBGE
   * @param codigo - Código IBGE do município (7 dígitos)
   * @param simplified - Se true, usa simplified_geometry
   * @returns Feature GeoJSON ou undefined
   */
  async getMunicipalityByCode(
    codigo: string,
    simplified = true,
  ): Promise<MunicipalityGeometryFeature | undefined> {
    const geometryExpression = simplified
      ? sql`COALESCE(simplified_geometry, geometry)`
      : sql`geometry`

    const result = await db.execute<{
      codigo: string
      municipio: string
      geometry: string
      properties: string | null
    }>(sql`
      SELECT
        codigo,
        municipio,
        ST_AsGeoJSON(${geometryExpression}) AS geometry,
        properties::text
      FROM municipality_geometries
      WHERE codigo = ${codigo}
      LIMIT 1
    `)

    if (result.rows.length === 0) {
      return undefined
    }

    const row = result.rows[0]

    let parsedGeometry
    try {
      parsedGeometry = JSON.parse(row.geometry)
    } catch (error) {
      console.error(`Invalid JSON in municipality geometry ${row.codigo}`, error)
      parsedGeometry = { type: 'Point', coordinates: [0, 0] }
    }

    let parsedProperties: Record<string, unknown> = {}
    if (row.properties) {
      try {
        parsedProperties = JSON.parse(row.properties)
      } catch (error) {
        console.error(
          `Invalid properties JSON for municipality ${row.codigo}`,
          error,
        )
        parsedProperties = {}
      }
    }

    return {
      type: 'Feature' as const,
      id: row.codigo,
      geometry: parsedGeometry,
      properties: {
        ...parsedProperties,
        codigo: row.codigo,
        municipio: row.municipio,
      },
    }
  }
}

export const municipalityGeometriesRepository = new MunicipalityGeometriesRepository()
