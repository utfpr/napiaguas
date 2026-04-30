import { sql } from 'drizzle-orm'

import { db } from '../db/connection'
import { municipalityGeometriesRepository } from './municipality-geometries.repository'

interface GeometryFeature {
  type: 'Feature'
  id: string
  geometry: {
    type: string
    coordinates: number[][][] | number[][]
  }
  properties: Record<string, unknown> & { name: string }
}

export class GeometriesRepository {
  async getGeometriesByWorkgroup(
    workgroupId: string,
    simplified = true,
  ): Promise<GeometryFeature[]> {
    if (workgroupId === 'agua-doce') {
      return this.getHydrobasinsGeometries(simplified)
    }

    if (workgroupId === 'saude') {
      const allFeatures = await municipalityGeometriesRepository.getMunicipalityGeometries(simplified)
      const healthFeatures = allFeatures.filter(
        feature => feature.properties.codigo.length === 6
      )
      return healthFeatures.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          name: feature.properties.municipio
        }
      })) as GeometryFeature[]
    }

    if (workgroupId === 'litoral') {
      const allFeatures = await municipalityGeometriesRepository.getMunicipalityGeometries(simplified)
      const coastalFeatures = allFeatures.filter(
        feature => feature.properties.codigo.length === 7
      )
      return coastalFeatures.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          name: feature.properties.municipio
        }
      })) as GeometryFeature[]
    }

    return this.getLegacyGeometries(workgroupId, simplified)
  }

  private async getHydrobasinsGeometries(
    simplified: boolean,
  ): Promise<GeometryFeature[]> {
    const geometryExpression = simplified
      ? sql`COALESCE(simplified_geometry, geometry)`
      : sql`geometry`

    const result = await db.execute<{
      hybas_id: string
      geometry: string
      properties: string | null
    }>(sql`
      SELECT
        hybas_id,
        ST_AsGeoJSON(${geometryExpression}) AS geometry,
        properties::text
      FROM hydrobasins_geometries
      ORDER BY hybas_id
    `)

    return result.rows.map((row) => {
      let parsedGeometry
      try {
        parsedGeometry = JSON.parse(row.geometry)
      } catch (error) {
        console.error(`Invalid JSON in hydrobasin geometry ${row.hybas_id}`, error)
        parsedGeometry = { type: 'Point', coordinates: [0, 0] }
      }

      let parsedProperties: Record<string, unknown> = {}
      if (row.properties) {
        try {
          parsedProperties = JSON.parse(row.properties)
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
        (parsedProperties.NOME_COMIT as string | undefined) ??
        `HYBAS ${row.hybas_id}`

      const properties = {
        ...parsedProperties,
        name,
        hybasId: row.hybas_id,
        hybas_id: row.hybas_id,
        HYBAS_ID: row.hybas_id,
        nomeComite: parsedProperties.NOME_COMIT as string | undefined,
      }

      return {
        type: 'Feature' as const,
        id: row.hybas_id,
        geometry: parsedGeometry,
        properties,
      }
    })
  }

  private async getLegacyGeometries(
    workgroupId: string,
    simplified: boolean,
  ): Promise<GeometryFeature[]> {
    const tolerance = simplified ? 0.001 : 0
    const geometryExpression =
      tolerance > 0
        ? sql`ST_Simplify(geometry, ${tolerance})`
        : sql`geometry`

    const result = await db.execute<{
      id: string
      name: string
      properties: string | null
      geometry: string
    }>(sql`
      SELECT
        id,
        name,
        properties,
        ST_AsGeoJSON(${geometryExpression}) as geometry
      FROM geometries_agua_doce
      WHERE workgroup_id = ${workgroupId}
    `)

    return result.rows.map((row) => {
      let parsedProperties: Record<string, unknown> = {}
      try {
        parsedProperties = row.properties ? JSON.parse(row.properties) : {}
      } catch (error) {
        console.error(
          `Invalid JSON in properties for geometry ${row.id}:`,
          error,
        )
      }

      let parsedGeometry
      try {
        parsedGeometry = JSON.parse(row.geometry)
      } catch (error) {
        console.error(`Invalid JSON in geometry for ${row.id}:`, error)
        parsedGeometry = { type: 'Point', coordinates: [0, 0] }
      }

      return {
        type: 'Feature' as const,
        id: row.id,
        geometry: parsedGeometry,
        properties: {
          name: row.name,
          ...parsedProperties,
        },
      }
    })
  }
}

export const geometriesRepository = new GeometriesRepository()
