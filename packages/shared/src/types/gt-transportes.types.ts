import type { LineString } from 'geojson'

import type { GTType, IGTIndicadores } from './gt-common.types'

export type GTRoadGeometry = LineString

export interface GTTransportesIndicators extends IGTIndicadores {
  /** Índice normalizado (0-1) de rodovias expostas a risco de inundação. */
  inundacao_risco: number
  /** Índice normalizado (0-1) de rodovias expostas a risco de deslizamento. */
  deslizamento_risco: number
  /** Índice normalizado (0-1) relacionado à qualidade do pavimento. */
  pavimento_degradado: number
  /** Índice normalizado (0-1) que representa a proporção de pontes em risco. */
  pontes_risco: number
}

export interface GTTransportesRoadSegment {
  /** Identificador único do segmento viário (UUID). */
  id: string
  /** Workgroup técnico responsável pela coleção. */
  workgroup_id: GTType.TRANSPORTES
  /** Nome amigável do trecho (ex: "BR-277 — Curitiba a Paranaguá"). */
  name: string
  /** Código resumido da rodovia (ex: BR-277, PR-508). */
  code: string
  /** Tipo administrativo da rodovia. */
  road_type: 'federal' | 'estadual'
  /** Geometria principal utilizada nas visualizações. */
  geometry: GTRoadGeometry
  /** Comprimento total do trecho (km), calculado a partir da geometria. */
  length_km: number
  /** Metadados auxiliares compartilhados com o frontend. */
  metadata?: Record<string, unknown>
  /** Registro auxiliar para integração com APIs REST. */
  created_at: Date
  updated_at: Date
}
