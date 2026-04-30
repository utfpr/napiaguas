import { performance } from 'node:perf_hooks'

import type {
  Feature,
  FeatureCollection,
  GeometriesGeoJSONResponse,
} from '@napi-aguas/shared'

import { logger } from '@/config/logger'
import {
  geometryTransportesRepository,
  type BackgroundGeometryRow,
  type GeometryTransportesRow,
  type RoadType,
} from '@/repositories/geometry-transportes.repository'

const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024 // 2MB
const DEFAULT_SIMPLIFY_TOLERANCE = 0.001
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  expiresAt: number
  payload: T
}

export interface GeometriesRequestOptions {
  roadType?: RoadType
  simplify?: boolean
  simplifyTolerance?: number
  includeBackgroundLayer?: boolean
}

export interface GeometryFeatureProperties {
  id: string
  name: string
  code: string | null
  roadType: RoadType
  lengthKm: number | null
  metadata?: Record<string, unknown> | null
}

export type GeometryTransportesResponse = GeometriesGeoJSONResponse

class GeometryTransportesService {
  private readonly log = logger.child({ service: 'GeometryTransportesService' })
  private readonly geometryCache = new Map<string, CacheEntry<GeometryTransportesResponse>>()
  private readonly backgroundCache = new Map<string, CacheEntry<FeatureCollection>>()

  async getGeometriesGeoJSON(
    options: GeometriesRequestOptions = {},
  ): Promise<GeometryTransportesResponse> {
    const start = performance.now()
    const tolerance = options.simplifyTolerance ?? DEFAULT_SIMPLIFY_TOLERANCE
    const cacheKey = JSON.stringify({
      roadType: options.roadType ?? 'all',
      simplify: options.simplify ?? false,
    })

    const cachedEntry = this.geometryCache.get(cacheKey)
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      const cached = structuredClone(cachedEntry.payload)

      if (options.includeBackgroundLayer) {
        cached.backgroundLayer = await this.getBackgroundLayer({
          simplify: options.simplify ?? true,
          simplifyTolerance: tolerance,
        })
      }

      this.log.info(
        {
          event: 'transportes.geometries.cache-hit',
          roadType: options.roadType ?? 'all',
          simplify: options.simplify ?? false,
        },
        'Cache em memória utilizado para geometrias do GT Transportes',
      )

      return cached
    }

    const rows =
      options.roadType !== undefined
        ? await geometryTransportesRepository.findByRoadType(options.roadType, {
            simplify: options.simplify,
            simplifyTolerance: tolerance,
          })
        : await geometryTransportesRepository.findAll({
            simplify: options.simplify,
            simplifyTolerance: tolerance,
          })

    let featureCollection = this.buildFeatureCollection(rows)

    let payloadBytes = this.calculatePayloadBytes(featureCollection)
    const forcedSimplification = options.simplify === true
    let simplifiedApplied = forcedSimplification

    if (!forcedSimplification && payloadBytes > MAX_PAYLOAD_BYTES) {
      this.log.warn(
        {
          event: 'transportes.geometries.payload-too-large',
          payloadBytes,
        },
        'GeoJSON payload acima de 2MB, aplicando simplificação',
      )

      const simplifiedRows =
        options.roadType !== undefined
          ? await geometryTransportesRepository.findByRoadType(
              options.roadType,
              {
                simplify: true,
                simplifyTolerance: tolerance,
              },
            )
          : await geometryTransportesRepository.findAll({
              simplify: true,
              simplifyTolerance: tolerance,
            })

      featureCollection = this.buildFeatureCollection(simplifiedRows)
      payloadBytes = this.calculatePayloadBytes(featureCollection)
      simplifiedApplied = true
    }

    if (options.includeBackgroundLayer) {
      featureCollection.backgroundLayer = await this.getBackgroundLayer({
        simplify: options.simplify ?? true,
        simplifyTolerance: tolerance,
      })
    }

    const durationMs = performance.now() - start

    this.geometryCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload: structuredClone(featureCollection),
    })

    this.log.info(
      {
        event: 'transportes.geometries.fetched',
        durationMs: Number(durationMs.toFixed(2)),
        payloadBytes,
        features: featureCollection.features.length,
        simplified: simplifiedApplied ? 'applied' : 'none',
        roadType: options.roadType ?? 'all',
      },
      'Geometrias do GT Transportes obtidas com sucesso',
    )

    return featureCollection
  }

  async getGeometriesWithBackground(
    options: GeometriesRequestOptions = {},
  ): Promise<GeometryTransportesResponse> {
    return this.getGeometriesGeoJSON({
      ...options,
      includeBackgroundLayer: true,
    })
  }

  async getBackgroundLayer(options: {
    simplify?: boolean
    simplifyTolerance?: number
  } = {}): Promise<FeatureCollection> {
    const tolerance =
      options.simplify === false
        ? 0
        : options.simplifyTolerance ?? DEFAULT_SIMPLIFY_TOLERANCE

    const cachedEntry = this.backgroundCache.get(String(tolerance))
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      this.log.info(
        {
          event: 'transportes.geometries.background-cache-hit',
          tolerance,
        },
        'Cache em memória utilizado para camada de municípios',
      )
      return structuredClone(cachedEntry.payload)
    }

    const rows = await geometryTransportesRepository.findBackgroundLayer({
      simplifyTolerance: tolerance,
    })

    const collection = this.buildBackgroundFeatureCollection(rows)

    this.backgroundCache.set(String(tolerance), {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload: structuredClone(collection),
    })

    return collection
  }

  private buildFeatureCollection(
    rows: GeometryTransportesRow[],
  ): GeometryTransportesResponse {
    const features = rows.map((row) => this.mapGeometryRowToFeature(row))

    return {
      type: 'FeatureCollection',
      features: features as any,
    }
  }

  private buildBackgroundFeatureCollection(
    rows: BackgroundGeometryRow[],
  ): FeatureCollection {
    const features: Feature[] = rows.map((row) => {
      const geometry = this.parseGeometry(row.geometry)

      return {
        type: 'Feature',
        id: row.id,
        geometry,
        properties: {
          name: row.name,
        },
      }
    })

    return {
      type: 'FeatureCollection',
      features,
    }
  }

  private mapGeometryRowToFeature(row: GeometryTransportesRow): Feature {
    const geometry = this.parseGeometry(row.geometry)

    return {
      type: 'Feature',
      id: row.id,
      geometry: this.ensureMultiLineString(geometry),
      properties: {
        id: row.id,
        name: row.name,
        code: row.code,
        roadType: row.roadType,
        lengthKm: row.lengthKm,
        metadata: row.metadata ?? undefined,
      } satisfies GeometryFeatureProperties,
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
        throw new Error('GeoJSON inválido')
      }

      return geometry
    } catch (error) {
      this.log.error(
        { err: error, event: 'transportes.geometry.parse-failed' },
        'Falha ao converter geometria para GeoJSON',
      )
      throw new Error('Não foi possível converter geometria para GeoJSON')
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

  private calculatePayloadBytes(collection: FeatureCollection): number {
    const payload = JSON.stringify(collection)
    return Buffer.byteLength(payload, 'utf-8')
  }
}

export const geometryTransportesService = new GeometryTransportesService()
