import { performance } from 'node:perf_hooks'

import type {
  Feature,
  IndicatorDataWithMetadataResponse,
  IndicatorHierarchyResponse,
  MetadataStats,
} from '@napi-aguas/shared'

import { logger } from '@/config/logger'
import { GeometryParseError } from '@/errors/geometry-parse.error'
import {
  transportesIndicatorsRepository,
  type TransportesIndicatorDataRow,
  type TransportesIndicatorRow,
} from '@/repositories/indicators.repository'

interface IndicatorHierarchyNode {
  id: string
  name: string
  description?: string | null
  unit?: string | null
  level: 'index' | 'subindex' | 'indicator'
  order: number
  metadata?: Record<string, unknown> | null
  children: IndicatorHierarchyNode[]
}

interface IndicatorDataProperties {
  geometryId: string
  name: string
  code: string | null
  roadType: 'federal' | 'estadual'
  lengthKm: number | null
  value: number
  normalizedValue: number
  indicatorMetadata?: Record<string, unknown> | null
  geometryMetadata?: Record<string, unknown> | null
}

export class IndicatorsService {
  private readonly log = logger.child({ service: 'IndicatorsService' })

  async getIndicatorHierarchy(
    workgroupId: string,
  ): Promise<IndicatorHierarchyResponse> {
    const start = performance.now()
    const rows = await transportesIndicatorsRepository.findHierarchyByWorkgroup(
      workgroupId,
    )

    const hierarchy = this.buildHierarchyTree(rows)
    const durationMs = performance.now() - start

    this.log.info(
      {
        event: 'transportes.indicators.hierarchy',
        durationMs: Number(durationMs.toFixed(2)),
        workgroupId,
        nodes: rows.length,
        roots: hierarchy.length,
      },
      'Hierarquia de indicadores carregada',
    )

    return hierarchy
  }

  async getIndicatorData(
    indicatorId: string,
  ): Promise<IndicatorDataWithMetadataResponse> {
    const exists = await transportesIndicatorsRepository.indicatorExists(
      indicatorId,
    )

    if (!exists) {
      const error = new Error('Indicador não encontrado')
      ;(error as any).statusCode = 404
      throw error
    }

    const start = performance.now()
    const rows =
      await transportesIndicatorsRepository.findDataByIndicator(indicatorId)

    const features = rows.map((row) => this.mapIndicatorDataRowToFeature(row))

    // AC2: Calcular metadata estatística (min, max, median)
    const values = rows.map((row) => row.value).filter((v) => v !== null && !isNaN(v))
    const sortedValues = [...values].sort((a, b) => a - b)

    const metadata: MetadataStats = {
      indicatorId,
      min: sortedValues.length > 0 ? sortedValues[0] : 0,
      max: sortedValues.length > 0 ? sortedValues[sortedValues.length - 1] : 0,
      median: sortedValues.length > 0 ? sortedValues[Math.floor(sortedValues.length / 2)] : 0,
      lastUpdated: new Date().toISOString(),
    }

    const collection: IndicatorDataWithMetadataResponse = {
      type: 'FeatureCollection',
      metadata,
      features: features as any, // Necessário devido a conversão de geometria
    }

    const payloadBytes = Buffer.byteLength(JSON.stringify(collection), 'utf-8')
    const durationMs = performance.now() - start

    this.log.info(
      {
        event: 'transportes.indicators.data',
        durationMs: Number(durationMs.toFixed(2)),
        indicatorId,
        features: features.length,
        payloadBytes,
      },
      'Dados de indicador carregados',
    )

    return collection
  }

  private buildHierarchyTree(
    rows: TransportesIndicatorRow[],
  ): IndicatorHierarchyNode[] {
    const nodes = new Map<string, IndicatorHierarchyNode>()
    const roots: IndicatorHierarchyNode[] = []

    rows.forEach((row) => {
      nodes.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        unit: row.unit,
        level: row.level,
        order: row.order,
        metadata: row.metadata,
        children: [],
      })
    })

    rows.forEach((row) => {
      const node = nodes.get(row.id)
      if (!node) return

      if (row.parent_id) {
        const parent = nodes.get(row.parent_id)
        parent?.children.push(node)
      } else {
        roots.push(node)
      }
    })

    // Garantir ordenação consistente pelo campo `order`
    const sortChildren = (list: IndicatorHierarchyNode[]) => {
      list.sort((a, b) => a.order - b.order)
      list.forEach((child) => sortChildren(child.children))
    }

    sortChildren(roots)
    return roots
  }

  private mapIndicatorDataRowToFeature(
    row: TransportesIndicatorDataRow,
  ): Feature {
    const geometry = this.parseGeometry(row.geometry)

    return {
      type: 'Feature',
      id: row.geometry_id,
      geometry: this.ensureMultiLineString(geometry),
      properties: {
        geometryId: row.geometry_id,
        name: row.geometry_name,
        code: row.geometry_code,
        roadType: row.road_type,
        lengthKm: row.length_km,
        value: this.roundValue(row.value),
        normalizedValue: this.normalizeValue(row.value, row.normalized_value),
        indicatorMetadata: row.indicator_metadata ?? undefined,
        geometryMetadata: row.geometry_metadata ?? undefined,
      } satisfies IndicatorDataProperties,
    }
  }

  private parseGeometry(rawGeometry: string): Feature['geometry'] {
    try {
      const geometry = JSON.parse(rawGeometry) as Feature['geometry']

      if (
        !geometry ||
        typeof geometry !== 'object' ||
        !('type' in geometry) ||
        !('coordinates' in geometry)
      ) {
        throw new GeometryParseError(
          'GeoJSON inválido: estrutura não contém type ou coordinates',
          rawGeometry,
        )
      }

      return geometry
    } catch (error) {
      // Se já é GeometryParseError, re-lança
      if (error instanceof GeometryParseError) {
        this.log.error(
          {
            err: error,
            event: 'transportes.indicators.parse-geojson',
            geometryPreview: error.getSafeRawGeometryPreview(),
          },
          'Falha ao converter geometria de indicador',
        )
        throw error
      }

      // Erro de JSON.parse ou outro erro inesperado
      const parseError = new GeometryParseError(
        'Não foi possível fazer parse do JSON da geometria',
        rawGeometry,
        error as Error,
      )

      this.log.error(
        {
          err: parseError,
          event: 'transportes.indicators.parse-geojson',
          geometryPreview: parseError.getSafeRawGeometryPreview(),
        },
        'Falha ao converter geometria de indicador',
      )

      throw parseError
    }
  }

  private ensureMultiLineString(
    geometry: Feature['geometry'],
  ): Feature['geometry'] {
    if (geometry.type === 'MultiLineString') {
      return geometry
    }

    if (geometry.type === 'LineString') {
      return {
        type: 'MultiLineString',
        coordinates: [geometry.coordinates],
      }
    }

    return geometry
  }

  private roundValue(value: number): number {
    return Number.isFinite(value) ? Number(value.toFixed(4)) : 0
  }

  private normalizeValue(
    value: number,
    normalizedValue: number | null,
  ): number {
    const candidate =
      normalizedValue !== null && Number.isFinite(normalizedValue)
        ? normalizedValue
        : value

    if (!Number.isFinite(candidate)) {
      return 0
    }

    return Math.min(Math.max(Number(candidate.toFixed(4)), 0), 1)
  }
}

export const indicatorsService = new IndicatorsService()
