import { sql } from 'drizzle-orm'

import { db } from '../db/connection'

export interface ExportDataRecord {
  [key: string]: unknown
  id: string
  name: string
  indicator_value: string
  lat: number
  lng: number
}

export interface ExportPreviewResult {
  data: ExportDataRecord[]
  total_records: number
  preview_count: number
}

export interface ExportFilters {
  municipality_ids?: string[]
  subbacia_ids?: string[]
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: any // GeoJSON geometry object
  properties: {
    id: string
    name: string
    indicator_value: string
  }
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export class ExportTooLargeError extends Error {
  constructor(
    public recordsFound: number,
    public maxRecords: number = 10000
  ) {
    super('Export exceeds maximum record limit')
    this.name = 'ExportTooLargeError'
  }
}

export class ExportRepository {
  private readonly MAX_RECORDS = 10000

  private getTableConfig(workgroup: string): {
    geometryTable: string
    geometryIdColumn: string
    indicatorValuesTable: string
    indicatorValuesGeometryColumn: string
    indicatorTable: string
    nameColumn: string
  } {
    switch (workgroup) {
      case 'agua-doce':
        return {
          geometryTable: 'hydrobasins_geometries',
          geometryIdColumn: 'hybas_id',
          indicatorValuesTable: 'indicator_values',
          indicatorValuesGeometryColumn: 'hybas_id',
          indicatorTable: 'indicator_hierarchy',
          nameColumn: 'hybas_id',
        }
      case 'litoral':
        return {
          geometryTable: 'municipality_geometries',
          geometryIdColumn: 'codigo',
          indicatorValuesTable: 'coastal_indicator_values',
          indicatorValuesGeometryColumn: 'codigo_municipio',
          indicatorTable: 'indicator_hierarchy',
          nameColumn: 'municipio',
        }
      case 'saude':
        return {
          geometryTable: 'municipality_geometries',
          geometryIdColumn: 'codigo',
          indicatorValuesTable: 'health_indicator_values',
          indicatorValuesGeometryColumn: 'codigo_municipio',
          indicatorTable: 'indicator_hierarchy',
          nameColumn: 'municipio',
        }
      case 'transportes':
        return {
          geometryTable: 'geometries_transportes',
          geometryIdColumn: 'id',
          indicatorValuesTable: 'indicator_data',
          indicatorValuesGeometryColumn: 'geometry_id',
          indicatorTable: 'indicators_transportes',
          nameColumn: 'name',
        }
      default:
        throw new Error(`Workgroup desconhecido: ${workgroup}`)
    }
  }

  async getExportData(
    workgroup: string,
    indicatorId: string,
    filters?: ExportFilters
  ): Promise<ExportDataRecord[]> {
    const count = await this.getRecordCount(workgroup, indicatorId, filters)

    if (count > this.MAX_RECORDS) {
      throw new ExportTooLargeError(count, this.MAX_RECORDS)
    }

    return this.fetchData(workgroup, indicatorId, filters)
  }

  async getPreview(
    workgroup: string,
    indicatorId: string,
    filters?: ExportFilters
  ): Promise<ExportPreviewResult> {
    const totalRecords = await this.getRecordCount(workgroup, indicatorId, filters)
    const data = await this.fetchData(workgroup, indicatorId, filters, 10)

    return {
      data,
      total_records: totalRecords,
      preview_count: data.length,
    }
  }

  async getGeoJSONForExport(
    workgroup: string,
    indicatorId: string,
    filters?: ExportFilters
  ): Promise<GeoJSONFeatureCollection> {
    const count = await this.getRecordCount(workgroup, indicatorId, filters)

    if (count > this.MAX_RECORDS) {
      throw new ExportTooLargeError(count, this.MAX_RECORDS)
    }

    const config = this.getTableConfig(workgroup)

    let query = `
      SELECT
        jsonb_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(g.geometry, 15, 0)::jsonb,
          'properties', jsonb_build_object(
            'id', g.${config.geometryIdColumn},
            'name', g.${config.nameColumn},
            'indicator_value', iv.value::TEXT
          )
        ) as feature
      FROM ${config.indicatorValuesTable} iv
      INNER JOIN ${config.geometryTable} g ON iv.${config.indicatorValuesGeometryColumn} = g.${config.geometryIdColumn}
      INNER JOIN ${config.indicatorTable} i ON iv.indicator_id = i.id
      WHERE i.id = $1
    `

    const params: any[] = [indicatorId]

    // Adiciona filtros
    if (filters?.municipality_ids && filters.municipality_ids.length > 0) {
      query += ` AND g.${config.geometryIdColumn} = ANY($${params.length + 1})`
      params.push(filters.municipality_ids)
    }

    if (filters?.subbacia_ids && filters.subbacia_ids.length > 0) {
      query += ` AND g.${config.geometryIdColumn} = ANY($${params.length + 1})`
      params.push(filters.subbacia_ids)
    }

    query += ` ORDER BY g.${config.nameColumn}`

    // @ts-expect-error - Spread operator type issue
    const result = await db.execute<{ feature: GeoJSONFeature }>(sql.raw(query, ...params))

    // Constrói FeatureCollection
    const features: GeoJSONFeature[] = result.rows.map(row => row.feature)

    return {
      type: 'FeatureCollection',
      features,
    }
  }

  /**
   * Conta total de registros antes de aplicar limite
   */
  private async getRecordCount(
    workgroup: string,
    indicatorId: string,
    filters?: ExportFilters
  ): Promise<number> {
    const config = this.getTableConfig(workgroup)

    // Constrói query SQL baseada no schema real
    let query = `
      SELECT COUNT(*) as count
      FROM ${config.indicatorValuesTable} iv
      INNER JOIN ${config.geometryTable} g ON iv.${config.indicatorValuesGeometryColumn} = g.${config.geometryIdColumn}
      INNER JOIN ${config.indicatorTable} i ON iv.indicator_id = i.id
      WHERE i.id = $1
    `

    const params: any[] = [indicatorId]

    // Adiciona filtros se existirem
    if (filters?.municipality_ids && filters.municipality_ids.length > 0) {
      query += ` AND g.${config.geometryIdColumn} = ANY($${params.length + 1})`
      params.push(filters.municipality_ids)
    }

    if (filters?.subbacia_ids && filters.subbacia_ids.length > 0) {
      query += ` AND g.${config.geometryIdColumn} = ANY($${params.length + 1})`
      params.push(filters.subbacia_ids)
    }

    // @ts-expect-error - Spread operator type issue
    const result = await db.execute<{ count: string }>(sql.raw(query, ...params))

    return parseInt(result.rows[0]?.count || '0', 10)
  }

  /**
   * Busca dados com limite opcional
   */
  private async fetchData(
    workgroup: string,
    indicatorId: string,
    filters?: ExportFilters,
    limit?: number
  ): Promise<ExportDataRecord[]> {
    const config = this.getTableConfig(workgroup)

    let query = `
      SELECT
        g.${config.geometryIdColumn} as id,
        g.${config.nameColumn} as name,
        iv.value::TEXT as indicator_value,
        ST_Y(ST_Centroid(g.geometry)) as lat,
        ST_X(ST_Centroid(g.geometry)) as lng
      FROM ${config.indicatorValuesTable} iv
      INNER JOIN ${config.geometryTable} g ON iv.${config.indicatorValuesGeometryColumn} = g.${config.geometryIdColumn}
      INNER JOIN ${config.indicatorTable} i ON iv.indicator_id = i.id
      WHERE i.id = $1
    `

    const params: any[] = [indicatorId]

    // Adiciona filtros
    if (filters?.municipality_ids && filters.municipality_ids.length > 0) {
      query += ` AND g.${config.geometryIdColumn} = ANY($${params.length + 1})`
      params.push(filters.municipality_ids)
    }

    if (filters?.subbacia_ids && filters.subbacia_ids.length > 0) {
      query += ` AND g.${config.geometryIdColumn} = ANY($${params.length + 1})`
      params.push(filters.subbacia_ids)
    }

    query += ` ORDER BY g.${config.nameColumn}`

    if (limit) {
      query += ` LIMIT $${params.length + 1}`
      params.push(limit)
    }

    // @ts-expect-error - Spread operator type issue
    const result = await db.execute<ExportDataRecord>(sql.raw(query, ...params))

    return result.rows
  }
}

export const exportRepository = new ExportRepository()
