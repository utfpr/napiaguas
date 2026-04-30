import type { GTType } from '@napi-aguas/shared'
import type { ExpressionSpecification } from 'maplibre-gl'
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Point as GeoJsonPoint,
} from 'geojson'
import type { ReactNode } from 'react'

import type { IndicatorData } from '@/types/indicators'

export type MapLayerType = 'geojson' | 'markers' | 'heatmap'

/**
 * Configura a escala de cores utilizada em camadas choropleth.
 */
export interface ColorScale {
  /**
   * Intervalo numérico mínimo/máximo dos valores normalizados.
   */
  domain: [number, number]
  /**
   * Lista de cores (hex) em ordem crescente – pelo menos 2 valores.
   */
  colors: [string, string, ...string[]]
  /**
   * Pontos de parada explícitos para a escala (opcional).
   */
  stops?: number[]
  /**
   * Cor fallback para valores nulos ou indefinidos.
   */
  noDataColor?: string
  /**
   * Define se valores fora do domínio devem ser clampados.
   */
  clamp?: boolean
}

/**
 * Estilo de preenchimento para camadas baseadas em valor (choropleth).
 */
export interface ChoroplethStyle {
  mode: 'choropleth'
  /**
   * Propriedade utilizada para calcular a cor (default: value).
   */
  property?: string
  colorScale: ColorScale
  opacity?: number
  outlineColor?: string
  outlineWidth?: number
  showNoDataPattern?: boolean
}

/**
 * Estilo de preenchimento simples, utilizado quando não há escala dinâmica.
 */
export interface SimpleFillStyle {
  mode?: 'simple'
  fillColor?: string
  lineColor?: string
  lineWidth?: number
  opacity?: number
}

export interface LineLayerStyle {
  mode: 'line'
  /**
   * Largura da linha (pixels) ou expression dinâmica.
   */
  width: number | ExpressionSpecification
  /**
   * Cor da linha (hex) ou expression dinâmica.
   */
  color: string | ExpressionSpecification
  /**
   * Opacidade da linha (0-1).
   */
  opacity?: number
  /**
   * Padrão de tracejado (opcional).
   */
  dashArray?: number[]
}

export type GeoJsonLayerStyle = ChoroplethStyle | SimpleFillStyle | LineLayerStyle

/**
 * Estrutura mínima de um marcador customizado.
 */
export interface MarkerDatum {
  id?: string | number
  coordinates: [number, number]
  properties?: Record<string, unknown>
}

/**
 * Configurações de aglomeração (clustering) para camadas de marcadores.
 */
export interface MarkerClusterOptions {
  enabled?: boolean
  radius?: number
  maxZoom?: number
  textColor?: string
  textSize?: number
}

/**
 * Estilos aplicáveis às camadas de marcadores.
 */
export interface MarkerLayerStyle {
  iconUrl?: string
  iconSize?: [number, number]
  iconAnchor?: [number, number]
  color?: string
  cluster?: boolean
  clusterOptions?: MarkerClusterOptions
}

/**
 * Estilo disponível para camadas heatmap.
 */
export interface HeatmapLayerStyle {
  radius?: number
  intensity?: number
  opacity?: number
  weightProperty?: string
}

/**
 * Entrada individual de legenda exibida no mapa.
 */
export interface MapLegendEntry {
  label: string
  color: string
}

/**
 * Configuração de legenda associada a uma camada.
 */
export interface MapLegendConfig {
  title?: string
  unit?: string | null
  lastUpdated?: string | null
  entries?: MapLegendEntry[]
  showNoData?: boolean
  type?: 'fill' | 'line'
  thresholds?: {
    min: number
    q1?: number
    median?: number
    q3?: number
    max: number
  }
}

/**
 * Configurações base compartilhadas por todos os tipos de camada suportados.
 */
export interface MapLayerBase {
  id: string
  type: MapLayerType
  visible?: boolean
  label?: string
  zIndex?: number
  legend?: MapLegendConfig
  metadata?: Record<string, unknown>
  /**
   * Quando true, a camada só é registrada quando for exibida pela primeira vez.
   */
  lazy?: boolean
  /**
   * Tolerância opcional para simplificação de geometrias (em graus).
   */
  simplifyTolerance?: number
}

/**
 * Camada composta por geometrias GeoJSON (polígonos, linhas ou pontos).
 */
export interface GeoJsonMapLayer extends MapLayerBase {
  type: 'geojson'
  data: FeatureCollection<Geometry, Record<string, unknown>>
  style?: GeoJsonLayerStyle
  /**
   * Controla o modo de renderização da camada GeoJSON.
   */
  geometryMode?: 'polygon' | 'line'
}

/**
 * Camada composta por marcadores individuais ou FeatureCollection de pontos.
 */
export interface MarkerMapLayer extends MapLayerBase {
  type: 'markers'
  data:
    | FeatureCollection<GeoJsonPoint, Record<string, unknown>>
    | MarkerDatum[]
  style?: MarkerLayerStyle
}

/**
 * Camada de calor baseada em FeatureCollection de pontos/polígonos.
 */
export interface HeatmapMapLayer extends MapLayerBase {
  type: 'heatmap'
  data: FeatureCollection<Geometry, Record<string, unknown>>
  style?: HeatmapLayerStyle
}

export type MapLayer = GeoJsonMapLayer | MarkerMapLayer | HeatmapMapLayer

export interface TooltipFormatterParams {
  layer: MapLayer
  feature: Feature<Geometry, Record<string, unknown>>
}

export type TooltipFormatter = (params: TooltipFormatterParams) => ReactNode

export interface PopupFormatterParams {
  layer: MapLayer
  feature: Feature<Geometry, Record<string, unknown>>
}

export type PopupFormatter = (params: PopupFormatterParams) => ReactNode

/**
 * Propriedades compartilhadas entre as duas variantes do InteractiveMap.
 */
export interface BaseInteractiveMapProps {
  className?: string
  center?: [number, number]
  zoom?: number
  minZoom?: number
  maxZoom?: number
  bounds?: [[number, number], [number, number]]
  isLoading?: boolean
  loadingRenderer?: ReactNode | (() => ReactNode)
  errorRenderer?: ((error: Error) => ReactNode) | ReactNode
  onError?: (error: Error, context?: MapLayer | null) => void
  tooltipFormatter?: TooltipFormatter
  popupFormatter?: PopupFormatter
  onFeatureClick?: (params: PopupFormatterParams) => void
  onLayerToggle?: (layerId: string, visible: boolean) => void
  fitBoundsOnLoad?: boolean
  mobileBreakpoint?: number
  legendAlign?: 'left' | 'right'
  controlsPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  layerControlPosition?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
  mapStyleUrl?: string
  loadingMessage?: string
  showScale?: boolean
  showNavigation?: boolean
  /**
   * Tipo predominante de geometria da visualização principal.
   */
  geometryType?: 'polygon' | 'line'
}

/**
 * Variante moderna do componente – recebe camadas prontas para renderização.
 */
export interface ModernInteractiveMapProps extends BaseInteractiveMapProps {
  gtType: GTType
  layers: MapLayer[]
  backgroundLayerData?: FeatureCollection<Geometry, Record<string, unknown>> | null
  externalError?: Error | null
  refetch?: (() => Promise<void>) | (() => void)
}

/**
 * Variante legada – mantém compatibilidade com a API antiga baseada em GT.
 */
export interface LegacyInteractiveMapProps extends BaseInteractiveMapProps {
  workgroupId: string
  indicatorData?: IndicatorData | null
  indicatorThresholds?: {
    min: number
    q1: number
    median: number
    q3: number
    max: number
  } | null
  indicatorMin?: number | null
  indicatorMax?: number | null
  indicatorUnit?: string | null
  indicatorLastUpdated?: string | null
  isIndicatorLoading?: boolean
}

/**
 * Propriedades aceitas pelo componente `InteractiveMap`.
 */
export type InteractiveMapProps =
  | ModernInteractiveMapProps
  | LegacyInteractiveMapProps
