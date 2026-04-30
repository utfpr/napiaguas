import type { FeatureCollection } from 'geojson'

import env from '@/config/env'

const API_BASE = env.apiBaseUrl

export interface MunicipalityGeometry {
  type: 'Feature'
  id: string
  geometry: {
    type: string
    coordinates: number[][][] | number[][]
  }
  properties: {
    codigo: string
    municipio: string
    [key: string]: unknown
  }
}

export interface IndicatorValue {
  codigo_municipio: string
  municipio: string
  value: number
  normalized_value: number | null
}

export interface IndicatorHierarchyNode {
  id: string
  code: string
  name: string
  type: 'indice' | 'subindice' | 'indicador'
  parent_id: string | null
  order: number
  unit?: string | null
  description?: string | null
  children: IndicatorHierarchyNode[]
}

/**
 * Busca geometrias de municípios do Paraná para GT Saúde
 * @param simplified - Se true, retorna geometrias simplificadas (menor payload)
 * @returns GeoJSON FeatureCollection com 399 municípios
 */
export async function fetchMunicipioGeometries(
  simplified = true,
): Promise<FeatureCollection> {
  const url = `${API_BASE}/workgroups/saude/geometries?simplified=${simplified}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Falha ao buscar geometrias de municípios: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Busca hierarquia de indicadores de saúde
 * @returns Árvore hierárquica de indicadores (índices > subíndices > indicadores)
 */
export async function fetchSaudeIndicatorHierarchy(): Promise<IndicatorHierarchyNode[]> {
  const url = `${API_BASE}/workgroups/saude/indicators/hierarchy`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Falha ao buscar hierarquia de indicadores: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Busca valores de um indicador de saúde para todos os municípios
 * @param indicatorId - UUID ou código do indicador
 * @returns Array de valores por município
 */
export async function fetchSaudeIndicatorValues(
  indicatorId: string,
): Promise<IndicatorValue[]> {
  const url = `${API_BASE}/workgroups/saude/indicators/${indicatorId}/values`

  const response = await fetch(url)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Indicador ${indicatorId} não encontrado`)
    }
    throw new Error(`Falha ao buscar valores do indicador: ${response.statusText}`)
  }

  return response.json()
}
