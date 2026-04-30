import type { Feature, FeatureCollection, Geometry } from 'geojson'

export type IndicatorType = 'index' | 'subindex' | 'indicator'

export interface IndicatorNode {
  /**
   * Identificador público utilizado na URL (normalmente o código do indicador).
   */
  id: string
  /**
   * Identificador único original (UUID) retornado pela API.
   */
  uuid?: string
  /**
   * Código original do indicador (normalmente igual ao id).
   */
  code?: string
  name: string
  description?: string
  /**
   * Tipo normalizado utilizado no frontend.
   */
  type: IndicatorType
  /**
   * Tipo original retornado pela API (indice, subindice, indicador).
   */
  rawType?: 'indice' | 'subindice' | 'indicador'
  order?: number
  unit?: string
  children: IndicatorNode[]
}

export type IndicatorTree = IndicatorNode[]

export interface IndicatorFeatureProperties {
  geometryId: string
  hybasId?: string
  hybas_id?: string
  value: number | string | null
  normalizedValue?: number | string | null
  indicator_normalized?: number | null
  color?: string
  indicator_unit?: string | null
  name?: string
  [key: string]: unknown
}

export type IndicatorFeature = Feature<Geometry, IndicatorFeatureProperties>

export interface IndicatorDataMetadata {
  indicatorId: string
  workgroupId: string
  lastUpdated: string
  unit?: string
}

export type IndicatorData = FeatureCollection<Geometry, IndicatorFeatureProperties> & {
  metadata: IndicatorDataMetadata
}

export function cloneIndicatorTree(tree: IndicatorTree): IndicatorTree {
  return tree.map((node) => ({
    ...node,
    children: cloneIndicatorTree(node.children),
  }))
}
