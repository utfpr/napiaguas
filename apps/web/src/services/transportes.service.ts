import { GTType } from '@napi-aguas/shared'
import type { FeatureCollection, Geometry } from 'geojson'

import env from '@/config/env'
import { resolveApiUrl } from '@/services/geometries.service'
import type { IndicatorNode } from '@/types/indicators'

export interface TransportesIndicatorMetadata {
  indicatorId: string
  workgroupId: string
  lastUpdated: string
  unit?: string | null
}

export interface TransportesGeometryProperties {
  id: string
  name: string
  code: string | null
  roadType: 'federal' | 'estadual'
  lengthKm: number | null
  metadata?: Record<string, unknown>
}

export interface TransportesIndicatorProperties {
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

export type TransportesIndicatorFeatureCollection = FeatureCollection<
  Geometry,
  TransportesIndicatorProperties
> & {
  metadata: TransportesIndicatorMetadata
}

export type TransportesGeometriesResponse = FeatureCollection<
  Geometry,
  TransportesGeometryProperties
> & {
  backgroundLayer?: FeatureCollection<Geometry, Record<string, unknown>>
}

export interface TransportesIndicatorHierarchyNode {
  id: string
  name: string
  description?: string | null
  unit?: string | null
  level: 'index' | 'subindex' | 'indicator'
  order: number
  metadata?: Record<string, unknown> | null
  children: TransportesIndicatorHierarchyNode[]
}

export type TransportesIndicatorHierarchy = TransportesIndicatorHierarchyNode[]

type RoadType = 'all' | 'federal' | 'estadual'

interface GetGeometriesParams {
  roadType?: RoadType
  signal?: AbortSignal
}

const BASE_SEGMENTS = ['workgroups', GTType.TRANSPORTES] as const

function buildUrl(
  pathSegments: readonly string[],
  query?: Record<string, string | number | boolean | null | undefined>,
): string {
  return resolveApiUrl(env.apiBaseUrl, [...BASE_SEGMENTS, ...pathSegments], query)
}

async function fetchJson<T>(
  pathSegments: readonly string[],
  query?: Record<string, string | number | boolean | null | undefined>,
  init?: RequestInit,
): Promise<T> {
  const url = buildUrl(pathSegments, query)

  const headers =
    init?.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : (init?.headers as Record<string, string> | undefined)

  const response = await fetch(url, {
    method: 'GET',
    ...init,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Erro ao carregar ${pathSegments.join('/')}: ${response.status}`)
  }

  return (await response.json()) as T
}

function transformIndicatorsTree(tree: TransportesIndicatorHierarchy): IndicatorNode[] {
  return tree.map((node: TransportesIndicatorHierarchyNode) => ({
    id: node.id,
    name: node.name,
    description: node.description ?? undefined,
    type: node.level,
    order: node.order,
    unit: node.unit ?? undefined,
    children: transformIndicatorsTree(node.children),
  }))
}

export const transportesService = {
  async getGeometries(params?: GetGeometriesParams): Promise<TransportesGeometriesResponse> {
    const roadType = params?.roadType
    return fetchJson<TransportesGeometriesResponse>(
      ['geometries'],
      roadType && roadType !== 'all' ? { road_type: roadType } : undefined,
      { signal: params?.signal },
    )
  },

  async getBackground(signal?: AbortSignal): Promise<FeatureCollection<Geometry>> {
    return fetchJson<FeatureCollection<Geometry>>(
      ['geometries', 'background'],
      undefined,
      { signal },
    )
  },
  async getIndicatorsTree(signal?: AbortSignal): Promise<IndicatorNode[]> {
    const response = await fetchJson<TransportesIndicatorHierarchy>(['indicators'], undefined, {
      signal,
    })

    return transformIndicatorsTree(response)
  },

  async getIndicatorValues(
    indicatorId: string,
    signal?: AbortSignal,
  ): Promise<TransportesIndicatorFeatureCollection> {
    const trimmed = indicatorId.trim()
    if (!trimmed) {
      throw new Error('Indicador inválido para carregamento dos dados')
    }

    return fetchJson<TransportesIndicatorFeatureCollection>(
      ['indicators', trimmed, 'data'],
      undefined,
      { signal },
    )
  },
}
