import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import maplibregl, {
  type ExpressionSpecification,
  type LngLatBoundsLike,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
  type MapLayerTouchEvent,
} from 'maplibre-gl'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getFeatureStyle,
  normalizeFeatureCollection,
  simplifyFeatureCollection,
  sortLayersByOrder,
  toMarkerFeatureCollection,
} from '@/lib/utils/map-utils'
import { useGeometries } from '@/hooks/useGeometries'
import { normalizeLinear, VULNERABILITY_COLOR_SCALE } from '@/utils/scaleUtils'
import type {
  InteractiveMapProps,
  LegacyInteractiveMapProps,
  MapLayer,
  MapLayerType,
  GeoJsonLayerStyle,
  LineLayerStyle,
  ModernInteractiveMapProps,
} from '@/types/map.types'
import { GTType } from '@napi-aguas/shared'

import {
  LayerControl,
  MapControls,
  MapErrorBoundary,
  MapLegend,
  MapSkeleton,
  MapTooltip,
} from './map'
import { useBackgroundLayer } from './map/useBackgroundLayer'
import { useLineLayer } from './map/useLineLayer'

interface RegisteredLayer {
  id: string
  type: MapLayerType
  sourceId: string
  mapLayerIds: string[]
  interactiveLayerIds: string[]
  clustered?: boolean
  cleanup?: () => void
}

interface TooltipState {
  position: {
    x: number
    y: number
  }
  content: ReactNode
  layerId: string
}

interface ResolvedInteractiveMapProps {
  gtType: GTType
  layers: MapLayer[]
  className?: string
  center?: [number, number]
  zoom?: number
  minZoom?: number
  maxZoom?: number
  bounds?: [[number, number], [number, number]]
  isLoading?: boolean
  loadingRenderer?: ReactNode | (() => ReactNode)
  errorRenderer?: ((error: Error) => ReactNode) | ReactNode
  externalError?: Error | null
  onError?: (error: Error, context?: MapLayer | null) => void
  tooltipFormatter?: InteractiveMapProps['tooltipFormatter']
  popupFormatter?: InteractiveMapProps['popupFormatter']
  onFeatureClick?: InteractiveMapProps['onFeatureClick']
  onLayerToggle?: InteractiveMapProps['onLayerToggle']
  fitBoundsOnLoad?: boolean
  mobileBreakpoint?: number
  legendAlign?: 'left' | 'right'
  controlsPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  layerControlPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  mapStyleUrl?: string
  loadingMessage?: string
  showScale?: boolean
  showNavigation?: boolean
  legendUnit?: string | null
  legendLastUpdated?: string | null
  legendThresholds?: {
    min: number | null
    q1?: number | null
    median?: number | null
    q3?: number | null
    max: number | null
  } | null
  legendConfig?: MapLayer['legend']
  refetch?: (() => Promise<void>) | (() => void)
  geometryType: 'polygon' | 'line'
  backgroundLayerData?: ModernInteractiveMapProps['backgroundLayerData']
}

const DEFAULT_CENTER: [number, number] = [-49.3, -25.4]
const DEFAULT_ZOOM = 7
const MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json'
const PARANA_BOUNDS: LngLatBoundsLike = [
  [-54.5, -26.7],
  [-48.0, -22.5],
]
const PARANA_FIT_BOUNDS_OPTIONS = {
  padding: { top: 48, right: 48, bottom: 48, left: 48 },
  duration: 0,
} as const

export function InteractiveMap(props: InteractiveMapProps) {
  if (isModernProps(props)) {
    return <InteractiveMapModern {...props} />
  }

  return <InteractiveMapLegacy {...props} />
}

function InteractiveMapModern(props: ModernInteractiveMapProps) {
  const legendLayer = useMemo(() => props.layers.find((layer) => layer.legend), [props.layers])

  // Extrair thresholds da escala de cor da camada, se existir
  const legendThresholds = useMemo(() => {
    if (!legendLayer || legendLayer.type !== 'geojson') {
      return null
    }

    const style = legendLayer.style
    if (!style || style.mode !== 'choropleth' || !style.colorScale) {
      return null
    }

    const scale = style.colorScale
    if (!scale.stops || scale.stops.length < 5) {
      return null
    }

    return {
      min: scale.stops[0] ?? null,
      q1: scale.stops[1] ?? null,
      median: scale.stops[2] ?? null,
      q3: scale.stops[3] ?? null,
      max: scale.stops[4] ?? null,
    }
  }, [legendLayer])

  return (
    <InteractiveMapEngine
      gtType={props.gtType}
      layers={props.layers}
      className={props.className}
      center={props.center}
      zoom={props.zoom}
      minZoom={props.minZoom}
      maxZoom={props.maxZoom}
      bounds={props.bounds}
      isLoading={props.isLoading}
      loadingRenderer={props.loadingRenderer}
      errorRenderer={props.errorRenderer}
      externalError={props.externalError}
      onError={props.onError}
      tooltipFormatter={props.tooltipFormatter}
      popupFormatter={props.popupFormatter}
      onFeatureClick={props.onFeatureClick}
      onLayerToggle={props.onLayerToggle}
      fitBoundsOnLoad={props.fitBoundsOnLoad}
      mobileBreakpoint={props.mobileBreakpoint}
      legendAlign={props.legendAlign}
      controlsPosition={props.controlsPosition}
      layerControlPosition={props.layerControlPosition}
      mapStyleUrl={props.mapStyleUrl}
      loadingMessage={props.loadingMessage}
      showScale={props.showScale}
      showNavigation={props.showNavigation}
      legendUnit={legendLayer?.legend?.unit ?? null}
      legendLastUpdated={legendLayer?.legend?.lastUpdated ?? null}
      legendConfig={legendLayer?.legend}
      legendThresholds={legendThresholds}
      geometryType={props.geometryType ?? 'polygon'}
      backgroundLayerData={props.backgroundLayerData ?? null}
      refetch={props.refetch}
    />
  )
}

function InteractiveMapLegacy(props: LegacyInteractiveMapProps) {
  const { layers, thresholds, legendUnit, legendLastUpdated, loading, error, refetch } =
    useLegacyLayerFactory(props)

  const inferredGtType = inferGtType(props.workgroupId)

  return (
    <InteractiveMapEngine
      gtType={inferredGtType}
      layers={layers}
      className={props.className}
      center={props.center}
      zoom={props.zoom}
      minZoom={props.minZoom}
      maxZoom={props.maxZoom}
      bounds={props.bounds}
      isLoading={loading || props.isIndicatorLoading || props.isLoading}
      loadingRenderer={props.loadingRenderer}
      errorRenderer={props.errorRenderer}
      externalError={error}
      onError={props.onError}
      tooltipFormatter={props.tooltipFormatter}
      popupFormatter={props.popupFormatter}
      onFeatureClick={props.onFeatureClick}
      onLayerToggle={props.onLayerToggle}
      fitBoundsOnLoad={props.fitBoundsOnLoad}
      mobileBreakpoint={props.mobileBreakpoint}
      legendAlign={props.legendAlign}
      controlsPosition={props.controlsPosition}
      layerControlPosition={props.layerControlPosition}
      mapStyleUrl={props.mapStyleUrl}
      loadingMessage={props.loadingMessage}
      showScale={props.showScale}
      showNavigation={props.showNavigation}
      legendUnit={legendUnit ?? props.indicatorUnit ?? null}
      legendLastUpdated={legendLastUpdated ?? props.indicatorLastUpdated ?? null}
      legendThresholds={thresholds}
      geometryType="polygon"
      backgroundLayerData={null}
      refetch={refetch}
    />
  )
}

const InteractiveMapEngine = memo(function InteractiveMapEngine({
  gtType,
  layers,
  className,
  center,
  zoom,
  minZoom,
  maxZoom,
  isLoading,
  loadingRenderer,
  errorRenderer,
  externalError,
  onError,
  tooltipFormatter,
  popupFormatter,
  onFeatureClick,
  onLayerToggle,
  fitBoundsOnLoad: _fitBoundsOnLoad = true,
  mobileBreakpoint = 768,
  legendAlign = 'right',
  controlsPosition = 'top-right',
  layerControlPosition = 'top-left',
  mapStyleUrl = MAP_STYLE_URL,
  loadingMessage,
  showScale = true,
  showNavigation = false,
  legendUnit,
  legendLastUpdated,
  legendThresholds,
  legendConfig,
  refetch,
  geometryType,
  backgroundLayerData,
}: ResolvedInteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const layerRegistryRef = useRef<Map<string, RegisteredLayer>>(new Map())
  const eventRegistryRef = useRef<Map<string, MapEventHandlers>>(new Map())
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState<Error | null>(null)
  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null)
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({})
  void _fitBoundsOnLoad

  const sortedLayers = useMemo(() => sortLayersByOrder(layers), [layers])
  const lineLayerHelpers = useLineLayer()
  const backgroundLayerHelpers = useBackgroundLayer()
  const layerHelpers = useMemo(
    () => ({
      geometryType,
      line: lineLayerHelpers,
      backgroundData: backgroundLayerData ?? null,
      background: backgroundLayerHelpers,
    }),
    [backgroundLayerData, backgroundLayerHelpers, geometryType, lineLayerHelpers],
  )

  useEffect(() => {
    setLayerVisibility((current) => {
      const next: Record<string, boolean> = {}
      for (const layer of sortedLayers) {
        next[layer.id] = current[layer.id] ?? layer.visible ?? true
      }
      return next
    })
  }, [sortedLayers])

  useEffect(() => {
    if (!mapReady) {
      return
    }

    const map = mapRef.current
    if (!map) {
      return
    }

    if (geometryType !== 'line') {
      backgroundLayerHelpers.removeBackgroundLayer(map)
      return
    }

    backgroundLayerHelpers.ensureBackgroundLayer({
      map,
      data: backgroundLayerData ?? null,
      visible: Boolean(backgroundLayerData),
      beforeLayerId: null,
    })
  }, [backgroundLayerData, backgroundLayerHelpers, geometryType, mapReady])

  useEffect(() => {
    return () => {
      const map = mapRef.current
      if (map) {
        backgroundLayerHelpers.removeBackgroundLayer(map)
      }
    }
  }, [backgroundLayerHelpers])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    if (mapRef.current) {
      return
    }

    try {
      const mapInstance = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyleUrl,
        center: center ?? DEFAULT_CENTER,
        zoom: zoom ?? DEFAULT_ZOOM,
        minZoom,
        maxZoom,
        cooperativeGestures: true,
      })

      if (showNavigation) {
        mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right')
      }

      if (showScale) {
        mapInstance.addControl(new maplibregl.ScaleControl(), 'bottom-left')
      }

      mapInstance.on('load', () => {
        setMapReady(true)
        mapInstance.fitBounds(PARANA_BOUNDS, {
          ...PARANA_FIT_BOUNDS_OPTIONS,
        })
      })

      mapRef.current = mapInstance
    } catch (error) {
      const mapInitError =
        error instanceof Error ? error : new Error('Falha desconhecida ao iniciar o mapa')
      setMapError(mapInitError)
      if (onError) {
        onError(mapInitError, null)
      }
    }

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapReady) {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    if (typeof ResizeObserver === 'undefined') {
      mapRef.current?.resize()
      return
    }

    const observer = new ResizeObserver(() => {
      mapRef.current?.resize()
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [mapReady])

  useEffect(() => {
    if (!mapReady) {
      return
    }

    const map = mapRef.current
    if (!map) {
      return
    }

    const registry = layerRegistryRef.current

    for (const [layerId, registered] of registry.entries()) {
      if (!sortedLayers.some((layer) => layer.id === layerId)) {
        removeLayer(map, registered, eventRegistryRef.current, layerHelpers)
        registry.delete(layerId)
      }
    }

    sortedLayers.forEach((layer, index) => {
      const visibility = layerVisibility[layer.id] ?? layer.visible ?? true
      const shouldRegister = visibility || !layer.lazy
      const beforeLayerId = findNextLayerId(sortedLayers, index + 1, registry)

      let existing = registry.get(layer.id)

      if (!shouldRegister) {
        if (existing) {
          removeLayer(map, existing, eventRegistryRef.current, layerHelpers)
          registry.delete(layer.id)
        }
        return
      }

      const clusterEnabled = layer.type === 'markers' ? resolveClusterEnabled(layer) : false

      const requiresRecreation =
        existing && layer.type === 'markers' && (existing.clustered ?? false) !== clusterEnabled

      if (requiresRecreation && existing) {
        removeLayer(map, existing, eventRegistryRef.current, layerHelpers)
        registry.delete(layer.id)
        existing = undefined
      }

      if (!existing) {
        try {
          const registered = registerLayer(map, layer, visibility, beforeLayerId, layerHelpers)
          registry.set(layer.id, registered)
          registerLayerEvents(
            map,
            registered,
            layer,
            tooltipFormatter,
            popupFormatter,
            onFeatureClick,
            setTooltipState,
            popupRef,
            onError,
            eventRegistryRef.current,
          )
        } catch (error) {
          const layerError =
            error instanceof Error
              ? error
              : new Error(`Falha inesperada ao registrar camada ${layer.id}`)
          if (onError) {
            onError(layerError, layer)
          }
          setMapError(layerError)
        }
        return
      }

      try {
        updateLayer(map, existing, layer, visibility, beforeLayerId, layerHelpers)
      } catch (error) {
        const layerError =
          error instanceof Error ? error : new Error(`Falha ao atualizar camada ${layer.id}`)
        if (onError) {
          onError(layerError, layer)
        }
        setMapError(layerError)
      }
    })
  }, [
    mapReady,
    sortedLayers,
    layerVisibility,
    tooltipFormatter,
    popupFormatter,
    onFeatureClick,
    onError,
    layerHelpers,
  ])

  const handleToggleLayer = useCallback(
    (layerId: string, visible: boolean) => {
      setLayerVisibility((current) => ({
        ...current,
        [layerId]: visible,
      }))

      if (!mapReady || !mapRef.current) {
        return
      }

      if (onLayerToggle) {
        onLayerToggle(layerId, visible)
      }

      const registered = layerRegistryRef.current.get(layerId)
      if (!registered) {
        return
      }

      for (const layer of registered.mapLayerIds) {
        mapRef.current.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none')
      }
    },
    [onLayerToggle, mapReady],
  )

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut()
  }, [])

  const handleReset = useCallback(() => {
    if (!mapRef.current) {
      return
    }
    mapRef.current.fitBounds(PARANA_BOUNDS, {
      ...PARANA_FIT_BOUNDS_OPTIONS,
    })
  }, [])

  const layerControlItems = useMemo(
    () =>
      sortedLayers.map((layer) => ({
        id: layer.id,
        label: layer.label ?? layer.id,
        visible: layerVisibility[layer.id] ?? layer.visible ?? true,
        metadata: layer.metadata,
      })),
    [sortedLayers, layerVisibility],
  )

  const effectiveError = mapError ?? externalError
  const showLoading = Boolean(isLoading && !mapError)
  const shouldRenderLegend = Boolean(legendConfig) || Boolean(legendThresholds)

  const loadingNode = useMemo(() => {
    if (!loadingRenderer) {
      return <MapSkeleton className="min-h-[320px]" />
    }

    return typeof loadingRenderer === 'function' ? loadingRenderer() : loadingRenderer
  }, [loadingRenderer])

  const controlsPositionClass = getPositionClass(controlsPosition)
  const layerControlPositionClass = getPositionClass(layerControlPosition)
  const legendPositionClass = legendAlign === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6'

  return (
    <MapErrorBoundary fallback={errorRenderer} onError={(error) => onError?.(error, null)}>
      <div className={cn('relative flex h-full w-full flex-col', className)}>
        {showLoading ? (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl bg-white/80 p-6 backdrop-blur dark:bg-neutral-950/80">
            {loadingNode}
            {loadingMessage ? (
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
                {loadingMessage}
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          ref={containerRef}
          className="relative flex-1 h-full min-h-0 w-full overflow-hidden rounded-none"
        />

        <div
          className={cn(
            'pointer-events-none absolute z-30 flex flex-col items-stretch gap-3 p-4',
            controlsPositionClass,
          )}
        >
          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleReset}
            className="pointer-events-auto"
          />
        </div>

        <div
          className={cn(
            'pointer-events-none absolute z-30 flex flex-col items-stretch gap-3 p-4',
            layerControlPositionClass,
          )}
        >
          <LayerControl
            layers={layerControlItems}
            onToggle={handleToggleLayer}
            className="pointer-events-auto"
          />
        </div>

        {tooltipState && containerRef.current ? (
          <div
            className="pointer-events-none absolute z-40"
            style={{
              left: 0,
              top: 0,
              width: containerRef.current.offsetWidth,
              height: containerRef.current.offsetHeight,
            }}
          >
            <MapTooltip x={tooltipState.position.x} y={tooltipState.position.y} visible>
              {tooltipState.content}
            </MapTooltip>
          </div>
        ) : null}

        {shouldRenderLegend ? (
          <div
            className={cn(
              'pointer-events-none absolute bottom-4 z-30 max-w-xs md:bottom-6 md:max-w-sm',
              legendPositionClass,
            )}
          >
            <MapLegend
              legend={legendConfig ?? null}
              thresholds={legendThresholds}
              unit={legendUnit}
              lastUpdated={legendLastUpdated}
              className="pointer-events-auto"
            />
          </div>
        ) : null}

        {effectiveError ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-red-300 bg-white/90 p-6 text-center shadow-sm backdrop-blur-sm dark:border-red-900/60 dark:bg-neutral-950/80">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-200">
                Não foi possível carregar o mapa
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {effectiveError.message ||
                  'Ocorreu uma falha ao carregar os dados ou inicializar o mapa.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => void handleReset()} size="sm">
                Recarregar visualização
              </Button>
              {refetch ? (
                <Button
                  onClick={() => {
                    setMapError(null)
                    return Promise.resolve(refetch())
                  }}
                  variant="outline"
                  size="sm"
                >
                  Recarregar dados
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </MapErrorBoundary>
  )
})

function isModernProps(props: InteractiveMapProps): props is ModernInteractiveMapProps {
  return 'layers' in props
}

function useLegacyLayerFactory(props: LegacyInteractiveMapProps) {
  const { data, error, isLoading, refetch } = useGeometries(props.workgroupId)

  const geometries = useMemo(() => normalizeFeatureCollection(data), [data])

  const indicatorCollection = useMemo(() => {
    if (!props.indicatorData) {
      return null
    }

    return normalizeFeatureCollection(props.indicatorData)
  }, [props.indicatorData])

  const thresholds = props.indicatorThresholds ?? null

  const { layers, legendUnit, legendLastUpdated } = useMemo(() => {
    const result: MapLayer[] = []
    const scale = thresholds
      ? {
          domain: [thresholds.min ?? 0, thresholds.max ?? 1] as [number, number],
          colors: VULNERABILITY_COLOR_SCALE,
          // Remover stops para permitir interpolação contínua
          noDataColor: '#e2e8f0',
        }
      : null

    if (geometries) {
      result.push({
        id: 'base-geometries',
        type: 'geojson',
        data: geometries,
        visible: true,
        label: 'Municípios',
        zIndex: 0,
        metadata: {
          description: 'Limites territoriais carregados do GT selecionado',
        },
        simplifyTolerance: 0.0008,
      })
    }

    const legendUnitValue = props.indicatorUnit ?? props.indicatorData?.metadata.unit ?? null
    const legendLastUpdatedValue =
      props.indicatorLastUpdated ?? props.indicatorData?.metadata.lastUpdated ?? null

    if (indicatorCollection) {
      result.push({
        id: 'indicator-choropleth',
        type: 'geojson',
        data: indicatorCollection,
        visible: true,
        label: 'Indicador selecionado',
        zIndex: 1,
        metadata: {
          description: 'Choropleth com base nos valores do indicador atual',
        },
        legend: {
          title: 'Indicador',
          unit: legendUnitValue,
          lastUpdated: legendLastUpdatedValue,
          showNoData: true,
        },
        simplifyTolerance: 0.0005,
        style: scale
          ? {
              mode: 'choropleth',
              colorScale: scale,
              property: 'value',
              outlineColor: '#1f2937',
              outlineWidth: 1.5,
            }
          : undefined,
      })
    }

    return {
      layers: result,
      legendUnit: legendUnitValue,
      legendLastUpdated: legendLastUpdatedValue,
    }
  }, [
    geometries,
    indicatorCollection,
    thresholds,
    props.indicatorUnit,
    props.indicatorData?.metadata.unit,
    props.indicatorLastUpdated,
    props.indicatorData?.metadata.lastUpdated,
  ])

  const legendLayer = layers.find((layer) => layer.legend)

  return {
    layers,
    thresholds,
    legendUnit: legendLayer?.legend?.unit ?? legendUnit ?? null,
    legendLastUpdated: legendLayer?.legend?.lastUpdated ?? legendLastUpdated ?? null,
    loading: isLoading,
    error,
    refetch,
  }
}

function inferGtType(workgroupId: string) {
  const normalized = workgroupId.toLowerCase()
  if (normalized.includes('litoral')) {
    return GTType.LITORAL
  }
  if (normalized.includes('saude')) {
    return GTType.SAUDE
  }
  return GTType.AGUA
}

interface MapEventHandlers {
  mousemove: (event: MapLayerMouseEvent) => void
  mouseleave: (event: MapLayerMouseEvent) => void
  click: (event: MapLayerMouseEvent) => void
  touchstart: (event: MapLayerTouchEvent) => void
}

interface LayerHelpers {
  geometryType: 'polygon' | 'line'
  line: ReturnType<typeof useLineLayer>
  backgroundData: ModernInteractiveMapProps['backgroundLayerData']
  background: ReturnType<typeof useBackgroundLayer>
}

function hasLineStyle(style: GeoJsonLayerStyle | undefined): style is LineLayerStyle {
  return Boolean(style && 'mode' in style && style.mode === 'line')
}

function isLineGeoJsonLayer(layer: Extract<MapLayer, { type: 'geojson' }>): boolean {
  if (layer.geometryMode === 'line') {
    return true
  }

  return hasLineStyle(layer.style)
}

function registerLayer(
  map: maplibregl.Map,
  layer: MapLayer,
  visible: boolean,
  beforeLayerId: string | null | undefined,
  helpers: LayerHelpers,
): RegisteredLayer {
  switch (layer.type) {
    case 'geojson': {
      const geoJsonLayer = layer
      const isLineLayer = isLineGeoJsonLayer(geoJsonLayer)
      if (isLineLayer) {
        const sourceId = `${layer.id}-source`

        if (helpers.backgroundData) {
          helpers.background.ensureBackgroundLayer({
            map,
            data: helpers.backgroundData,
            visible: true,
            beforeLayerId: beforeLayerId ?? null,
          })
        }

        const registration = helpers.line.registerLineLayer({
          map,
          layer,
          sourceId,
          visible,
          beforeLayerId,
        })

        return {
          id: layer.id,
          type: 'geojson',
          sourceId,
          mapLayerIds: registration.mapLayerIds,
          interactiveLayerIds: registration.interactiveLayerIds,
          cleanup: registration.cleanup,
        }
      }
      return registerGeoJsonLayer(map, layer, visible, beforeLayerId)
    }
    case 'markers':
      return registerMarkerLayer(map, layer, visible, beforeLayerId)
    case 'heatmap':
      return registerHeatmapLayer(map, layer, visible, beforeLayerId)
    default:
      throw new Error(`Tipo de camada não suportado: ${(layer as MapLayer).type}`)
  }
}

function updateLayer(
  map: maplibregl.Map,
  registered: RegisteredLayer,
  layer: MapLayer,
  visible: boolean,
  beforeLayerId: string | null | undefined,
  helpers: LayerHelpers,
) {
  switch (layer.type) {
    case 'geojson':
      {
        const geoJsonLayer = layer
        const isLineLayer = isLineGeoJsonLayer(geoJsonLayer)
        if (isLineLayer) {
          helpers.line.updateLineLayer({
            map,
            layer,
            sourceId: registered.sourceId,
            visible,
            beforeLayerId,
            mapLayerIds: registered.mapLayerIds,
          })

          if (helpers.backgroundData) {
            helpers.background.ensureBackgroundLayer({
              map,
              data: helpers.backgroundData,
              visible: true,
              beforeLayerId: beforeLayerId ?? null,
            })
          }

          break
        }
      }
      updateGeoJsonLayer(map, registered, layer, visible, beforeLayerId)
      break
    case 'markers':
      updateMarkerLayer(map, registered, layer, visible, beforeLayerId)
      break
    case 'heatmap':
      updateHeatmapLayer(map, registered, layer, visible, beforeLayerId)
      break
    default:
      throw new Error(`Tipo de camada não suportado: ${(layer as MapLayer).type}`)
  }
}

function removeLayer(
  map: maplibregl.Map,
  registered: RegisteredLayer,
  eventRegistry: Map<string, MapEventHandlers>,
  helpers: LayerHelpers,
) {
  registered.cleanup?.()

  for (const id of registered.mapLayerIds) {
    map.removeLayer(id)
  }
  if (map.getSource(registered.sourceId)) {
    map.removeSource(registered.sourceId)
  }

  const handlers = eventRegistry.get(registered.id)
  if (handlers) {
    const interactiveLayers =
      registered.interactiveLayerIds.length > 0
        ? registered.interactiveLayerIds
        : registered.mapLayerIds

    for (const layerId of interactiveLayers) {
      map.off('mousemove', layerId, handlers.mousemove)
      map.off('mouseleave', layerId, handlers.mouseleave)
      map.off('click', layerId, handlers.click)
      map.off('touchstart', layerId, handlers.touchstart)
    }
    eventRegistry.delete(registered.id)
  }
}

function registerLayerEvents(
  map: maplibregl.Map,
  registered: RegisteredLayer,
  layer: MapLayer,
  tooltipFormatter: InteractiveMapProps['tooltipFormatter'],
  popupFormatter: InteractiveMapProps['popupFormatter'],
  onFeatureClick: InteractiveMapProps['onFeatureClick'],
  setTooltipState: React.Dispatch<React.SetStateAction<TooltipState | null>>,
  popupRef: React.MutableRefObject<maplibregl.Popup | null>,
  onError: ((error: Error, context?: MapLayer | null) => void) | undefined,
  eventRegistry: Map<string, MapEventHandlers>,
) {
  let hoveredFeatureId: string | number | null = null

  const mousemove = (event: MapLayerMouseEvent) => {
    try {
      const feature = event.features?.[0]
      if (!feature || !map.getCanvasContainer()) {
        setTooltipState(null)
        return
      }

      const content = tooltipFormatter?.({ layer, feature }) ?? renderDefaultTooltip(feature, layer.id)

      setTooltipState({
        position: { x: event.point.x, y: event.point.y },
        content,
        layerId: layer.id,
      })

      // Atualizar feature-state para hover
      // Não aplicar destaque visual na camada de municípios de fundo
      const isBackgroundLayer = layer.id === 'municipios-background'
      if (layer.type === 'geojson' && feature.id !== undefined && !isBackgroundLayer) {
        if (hoveredFeatureId !== null && hoveredFeatureId !== feature.id) {
          map.setFeatureState(
            { source: registered.sourceId, id: hoveredFeatureId },
            { hover: false }
          )
        }
        map.setFeatureState(
          { source: registered.sourceId, id: feature.id },
          { hover: true }
        )
        hoveredFeatureId = feature.id
      }
    } catch (error) {
      const tooltipError = error instanceof Error ? error : new Error('Falha ao renderizar tooltip')
      onError?.(tooltipError, layer)
    }
  }

  const mouseleave = () => {
    setTooltipState((current: TooltipState | null) =>
      current?.layerId === layer.id ? null : current,
    )

    // Remover hover state ao sair do polígono
    if (hoveredFeatureId !== null && layer.type === 'geojson') {
      map.setFeatureState(
        { source: registered.sourceId, id: hoveredFeatureId },
        { hover: false }
      )
      hoveredFeatureId = null
    }
  }

  const click = (event: MapLayerMouseEvent) => {
    try {
      const feature = event.features?.[0]
      if (!feature) {
        return
      }

      if (onFeatureClick) {
        onFeatureClick({ layer, feature })
      }

      if (!popupFormatter) {
        return
      }

      const content = popupFormatter({ layer, feature })
      const markup = renderToStaticMarkup(
        <div className="min-w-[180px] max-w-xs space-y-2 text-sm text-neutral-700">{content}</div>,
      )

      const popup = popupRef.current ?? new maplibregl.Popup()
      popupRef.current = popup
      popup.setLngLat(event.lngLat).setHTML(markup).addTo(map)
    } catch (error) {
      const popupError = error instanceof Error ? error : new Error('Falha ao renderizar popup')
      onError?.(popupError, layer)
    }
  }

  const touchstart = (event: MapLayerTouchEvent) => {
    const feature = event.features?.[0] as MapGeoJSONFeature | undefined
    if (!feature) {
      return
    }

    try {
      const content = tooltipFormatter?.({ layer, feature }) ?? renderDefaultTooltip(feature, layer.id)

      setTooltipState({
        position: { x: event.point.x, y: event.point.y },
        content,
        layerId: layer.id,
      })
    } catch (error) {
      const touchError =
        error instanceof Error ? error : new Error('Falha ao processar interação touch')
      onError?.(touchError, layer)
    }
  }

  eventRegistry.set(layer.id, {
    mousemove,
    mouseleave,
    click,
    touchstart,
  })

  const interactiveLayers =
    registered.interactiveLayerIds.length > 0
      ? registered.interactiveLayerIds
      : registered.mapLayerIds

  for (const mapLayerId of interactiveLayers) {
    map.on('mousemove', mapLayerId, mousemove)
    map.on('mouseleave', mapLayerId, mouseleave)
    map.on('click', mapLayerId, click)
    map.on('touchstart', mapLayerId, touchstart)
  }
}

function getPositionClass(position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') {
  switch (position) {
    case 'top-left':
      return 'left-3 top-3 md:left-6 md:top-6'
    case 'top-right':
      return 'right-3 top-3 md:right-6 md:top-6'
    case 'bottom-left':
      return 'left-3 bottom-3 md:left-6 md:bottom-6'
    case 'bottom-right':
      return 'right-3 bottom-3 md:right-6 md:bottom-6'
    default:
      return 'right-3 top-3 md:right-6 md:top-6'
  }
}

function findNextLayerId(
  layers: MapLayer[],
  nextIndex: number,
  registry: Map<string, RegisteredLayer>,
): string | null {
  for (let index = nextIndex; index < layers.length; index += 1) {
    const layer = layers[index]
    const registered = registry.get(layer.id)
    if (registered) {
      return registered.mapLayerIds[0] ?? null
    }
  }
  return null
}

function registerGeoJsonLayer(
  map: maplibregl.Map,
  layer: MapLayer,
  visible: boolean,
  beforeLayerId?: string | null,
): RegisteredLayer {
  if (layer.type !== 'geojson') {
    throw new Error('Camada inválida para registro GeoJSON')
  }

  const sourceId = `${layer.id}-source`
  const fillLayerId = `${layer.id}-fill`
  const outlineLayerId = `${layer.id}-outline`

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId)
  }

  const dataWithStyle = decorateGeoJsonWithStyle(layer)

  map.addSource(sourceId, {
    type: 'geojson',
    data: dataWithStyle,
    promoteId: 'id',
  })

  map.addLayer(
    {
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': ['coalesce', ['get', '__fillColor'], '#0891b2'] as ExpressionSpecification,
        'fill-opacity': ['coalesce', ['get', '__fillOpacity'], 0.6] as ExpressionSpecification,
      },
      layout: {
        visibility: visible ? 'visible' : 'none',
      },
    },
    beforeLayerId ?? undefined,
  )

  map.addLayer({
    id: outlineLayerId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': ['coalesce', ['get', '__lineColor'], '#0f172a'] as ExpressionSpecification,
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        4,
        ['coalesce', ['get', '__lineWidth'], 1]
      ] as ExpressionSpecification,
    },
    layout: {
      visibility: visible ? 'visible' : 'none',
    },
  })

  return {
    id: layer.id,
    type: 'geojson',
    sourceId,
    mapLayerIds: [fillLayerId, outlineLayerId],
    interactiveLayerIds: [fillLayerId],
  }
}

function updateGeoJsonLayer(
  map: maplibregl.Map,
  registered: RegisteredLayer,
  layer: MapLayer,
  visible: boolean,
  beforeLayerId?: string | null,
) {
  if (layer.type !== 'geojson') {
    throw new Error('Camada inválida para atualização GeoJSON')
  }

  const source = map.getSource(registered.sourceId) as maplibregl.GeoJSONSource | undefined
  if (!source) {
    return
  }

  const dataWithStyle = decorateGeoJsonWithStyle(layer)
  source.setData(dataWithStyle)

  for (const layerId of registered.mapLayerIds) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
    if (beforeLayerId) {
      map.moveLayer(layerId, beforeLayerId)
    }
  }
}

function registerMarkerLayer(
  map: maplibregl.Map,
  layer: MapLayer,
  visible: boolean,
  beforeLayerId?: string | null,
): RegisteredLayer {
  if (layer.type !== 'markers') {
    throw new Error('Camada inválida para registro de marcadores')
  }

  const sourceId = `${layer.id}-source`
  const clusterLayerId = `${layer.id}-clusters`
  const clusterCountLayerId = `${layer.id}-cluster-count`
  const markerLayerId = `${layer.id}-markers`

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId)
  }

  const { collection, clusterEnabled } = prepareMarkerCollection(layer)
  const clusterRadius = layer.style?.clusterOptions?.radius ?? 45
  const clusterMaxZoom = layer.style?.clusterOptions?.maxZoom ?? 12
  const clusterTextColor = layer.style?.clusterOptions?.textColor ?? '#111827'
  const clusterTextSize = layer.style?.clusterOptions?.textSize ?? 12
  const markerColor = layer.style?.color ?? '#2563eb'

  map.addSource(sourceId, {
    type: 'geojson',
    data: collection,
    cluster: clusterEnabled,
    clusterRadius,
    clusterMaxZoom,
  })

  if (clusterEnabled) {
    map.addLayer(
      {
        id: clusterLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#1d4ed8',
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'point_count'],
            0,
            16,
            50,
            26,
            200,
            36,
          ],
          'circle-opacity': 0.85,
        },
        layout: {
          visibility: visible ? 'visible' : 'none',
        },
      },
      beforeLayerId ?? undefined,
    )

    map.addLayer(
      {
        id: clusterCountLayerId,
        type: 'symbol',
        source: sourceId,
        filter: ['has', 'point_count'],
        layout: {
          visibility: visible ? 'visible' : 'none',
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': clusterTextSize,
        },
        paint: {
          'text-color': clusterTextColor,
        },
      },
      beforeLayerId ?? undefined,
    )
  }

  map.addLayer(
    {
      id: markerLayerId,
      type: 'circle',
      source: sourceId,
      filter: clusterEnabled ? ['!', ['has', 'point_count']] : undefined,
      paint: {
        'circle-color': [
          'coalesce',
          ['get', '__markerColor'],
          markerColor,
        ] as ExpressionSpecification,
        'circle-radius': ['coalesce', ['get', '__markerRadius'], 6] as ExpressionSpecification,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
        'circle-opacity': 0.9,
      },
      layout: {
        visibility: visible ? 'visible' : 'none',
      },
    },
    beforeLayerId ?? undefined,
  )

  const mapLayerIds = clusterEnabled
    ? [clusterLayerId, clusterCountLayerId, markerLayerId]
    : [markerLayerId]

  return {
    id: layer.id,
    type: 'markers',
    sourceId,
    mapLayerIds,
    interactiveLayerIds: [markerLayerId],
    clustered: clusterEnabled,
  }
}

function updateMarkerLayer(
  map: maplibregl.Map,
  registered: RegisteredLayer,
  layer: MapLayer,
  visible: boolean,
  beforeLayerId?: string | null,
) {
  if (layer.type !== 'markers') {
    throw new Error('Camada inválida para atualização de marcadores')
  }

  const source = map.getSource(registered.sourceId) as maplibregl.GeoJSONSource | undefined
  if (!source) {
    return
  }

  const { collection, clusterEnabled } = prepareMarkerCollection(layer)
  source.setData(collection)

  for (const layerId of registered.mapLayerIds) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
    if (beforeLayerId) {
      map.moveLayer(layerId, beforeLayerId)
    }
  }

  if (clusterEnabled && registered.mapLayerIds.length >= 3) {
    map.setFilter(registered.mapLayerIds[registered.mapLayerIds.length - 1], [
      '!',
      ['has', 'point_count'],
    ])
  }
}

function registerHeatmapLayer(
  map: maplibregl.Map,
  layer: MapLayer,
  visible: boolean,
  beforeLayerId?: string | null,
): RegisteredLayer {
  if (layer.type !== 'heatmap') {
    throw new Error('Camada inválida para registro de heatmap')
  }

  const sourceId = `${layer.id}-source`
  const heatmapLayerId = `${layer.id}-heatmap`

  if (map.getSource(sourceId)) {
    map.removeSource(sourceId)
  }

  map.addSource(sourceId, {
    type: 'geojson',
    data: layer.data,
  })

  const radius = layer.style?.radius ?? 20
  const intensity = layer.style?.intensity ?? 0.6
  const opacity = layer.style?.opacity ?? 0.8
  const weightProperty = layer.style?.weightProperty ?? 'value'

  map.addLayer(
    {
      id: heatmapLayerId,
      type: 'heatmap',
      source: sourceId,
      paint: {
        'heatmap-weight': [
          'coalesce',
          ['to-number', ['get', weightProperty]],
          1,
        ] as ExpressionSpecification,
        'heatmap-intensity': intensity,
        'heatmap-radius': radius,
        'heatmap-opacity': opacity,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(33,102,172,0)',
          0.2,
          'rgb(103,169,207)',
          0.4,
          'rgb(209,229,240)',
          0.6,
          'rgb(253,219,199)',
          0.8,
          'rgb(239,138,98)',
          1,
          'rgb(178,24,43)',
        ],
      },
      layout: {
        visibility: visible ? 'visible' : 'none',
      },
    },
    beforeLayerId ?? undefined,
  )

  return {
    id: layer.id,
    type: 'heatmap',
    sourceId,
    mapLayerIds: [heatmapLayerId],
    interactiveLayerIds: [heatmapLayerId],
  }
}

function updateHeatmapLayer(
  map: maplibregl.Map,
  registered: RegisteredLayer,
  layer: MapLayer,
  visible: boolean,
  beforeLayerId?: string | null,
) {
  if (layer.type !== 'heatmap') {
    throw new Error('Camada inválida para atualização de heatmap')
  }

  const source = map.getSource(registered.sourceId) as maplibregl.GeoJSONSource | undefined
  if (!source) {
    return
  }

  source.setData(layer.data)

  for (const layerId of registered.mapLayerIds) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
    if (beforeLayerId) {
      map.moveLayer(layerId, beforeLayerId)
    }
  }
}

function decorateGeoJsonWithStyle(layer: Extract<MapLayer, { type: 'geojson' }>) {
  if (layer.geometryMode === 'line' || layer.style?.mode === 'line') {
    return layer.data
  }
  const tolerance = layer.simplifyTolerance ?? (layer.data.features.length > 250 ? 0.0008 : 0)
  const sourceData =
    tolerance && tolerance > 0 ? simplifyFeatureCollection(layer.data, tolerance) : layer.data

  const styledFeatures = sourceData.features.map((feature, index) => {
    const styled = getFeatureStyle(feature, layer.style)
    const featureId = (feature.id ?? feature.properties?.id ?? String(index)) as string | number

    const result: typeof feature = {
      type: feature.type,
      geometry: feature.geometry,
      properties: {
        ...feature.properties,
        __fillColor: styled.fillColor,
        __fillOpacity: styled.fillOpacity,
        __lineColor: styled.lineColor,
        __lineWidth: styled.lineWidth,
      },
      id: featureId,
    }

    if (feature.bbox) {
      result.bbox = feature.bbox
    }

    return result
  })

  return {
    ...sourceData,
    features: styledFeatures,
  }
}

function resolveClusterEnabled(
  layer: Extract<MapLayer, { type: 'markers' }>,
  featureCount?: number,
): boolean {
  const explicitCluster = layer.style?.clusterOptions?.enabled ?? layer.style?.cluster
  if (explicitCluster !== undefined) {
    return Boolean(explicitCluster)
  }

  if (featureCount !== undefined) {
    return featureCount > 100
  }

  const collection = toMarkerFeatureCollection(layer.data)
  return collection.features.length > 100
}

function prepareMarkerCollection(layer: Extract<MapLayer, { type: 'markers' }>) {
  const baseCollection = toMarkerFeatureCollection(layer.data)
  const clusterEnabled = resolveClusterEnabled(layer, baseCollection.features.length)

  const features = baseCollection.features.map((feature, index) => {
    const featureId = (feature.id ?? feature.properties?.id ?? String(index)) as string | number

    const result: typeof feature = {
      type: feature.type,
      geometry: feature.geometry,
      properties: {
        ...feature.properties,
        __markerColor: layer.style?.color ?? '#2563eb',
        __markerRadius: clusterEnabled ? 8 : 6,
      },
      id: featureId,
    }

    if (feature.bbox) {
      result.bbox = feature.bbox
    }

    return result
  })

  return {
    collection: {
      ...baseCollection,
      features,
    },
    clusterEnabled,
  }
}

function renderDefaultTooltip(feature: MapGeoJSONFeature, layerId?: string): ReactNode {
  const name =
    (feature.properties?.name as string | undefined) ??
    (feature.properties?.nome as string | undefined) ??
    (feature.properties?.municipio as string | undefined) ??
    'Área selecionada'

  // Tooltip simplificado para camada de municípios de fundo
  const isBackgroundLayer = layerId === 'municipios-background'
  if (isBackgroundLayer) {
    return (
      <div className="space-y-1">
        <p className="text-[11px] text-neutral-600 dark:text-neutral-300">{name}</p>
      </div>
    )
  }

  const value = feature.properties?.value ?? feature.properties?.valor ?? null
  const formattedValue =
    typeof value === 'number'
      ? new Intl.NumberFormat('pt-BR', {
          maximumFractionDigits: 2,
        }).format(value)
      : (value ?? 'Sem dados')

  const geometryType = feature.geometry?.type
  if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
    const code = feature.properties?.code as string | undefined
    const indicatorValue =
      (feature.properties?.indicator_value as number | string | undefined) ?? value
    const indicatorUnit =
      (feature.properties?.indicator_unit as string | undefined) ??
      (feature.properties?.unit as string | undefined) ??
      null
    const lengthKm = feature.properties?.length_km as number | undefined

    const formattedIndicatorValue =
      indicatorValue === null || indicatorValue === undefined
        ? 'Sem dados'
        : new Intl.NumberFormat('pt-BR', {
            maximumFractionDigits: 2,
          }).format(Number(indicatorValue))

    return (
      <div className="space-y-1">
        {/* Nome do trecho (rodovia) removido - apenas código */}
        {code ? (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
            {code}
          </p>
        ) : null}
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          {indicatorUnit ? `${formattedIndicatorValue} ${indicatorUnit}` : formattedIndicatorValue}
        </p>
        {typeof lengthKm === 'number' ? (
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Comprimento:{' '}
            {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(lengthKm)} km
          </p>
        ) : null}
      </div>
    )
  }

  // Campos específicos do GT Água Doce
  const rawNomeComite =
    (feature.properties?.nomeComite as string | undefined) ??
    (feature.properties?.NOME_COMIT as string | undefined)
  const hybasId =
    (feature.properties?.hybas_id as string | undefined) ??
    (feature.properties?.HYBAS_ID as string | undefined) ??
    (feature.properties?.hybasId as string | undefined)

  // Formatar nome do comitê: substituir _ por espaço, primeira letra maiúscula, restante minúscula
  const nomeComite = rawNomeComite
    ? `Bacia ${rawNomeComite
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase())}`
    : null

  // Obter valor e thresholds para posicionamento correto
  const featureValue = feature.properties?.value as number | undefined | null
  const featureColor = feature.properties?.color as string | undefined

  // Parse thresholds (podem vir como string JSON ou objeto)
  let thresholds: { min: number; q1: number; median: number; q3: number; max: number } | undefined
  const rawThresholds = feature.properties?._thresholds

  if (typeof rawThresholds === 'string') {
    try {
      thresholds = JSON.parse(rawThresholds)
    } catch {
      thresholds = undefined
    }
  } else if (rawThresholds && typeof rawThresholds === 'object') {
    thresholds = rawThresholds as { min: number; q1: number; median: number; q3: number; max: number }
  }

  const hasValue =
    typeof featureValue === 'number' && Number.isFinite(featureValue) && thresholds !== undefined

  // Calcular posição do marcador usando normalização linear centralizada
  // Mesma lógica de interpolação usada pelos polígonos e pela legenda
  const markerPosition = hasValue && thresholds
    ? normalizeLinear(featureValue, thresholds.min, thresholds.max)
    : 0

  // Cores da escala: mesmas cores usadas no choropleth do mapa e na legenda
  // Centralizado em VULNERABILITY_COLOR_SCALE
  const gradientStyle = {
    background: `linear-gradient(90deg, ${VULNERABILITY_COLOR_SCALE.join(', ')})`,
  }

  return (
    <div className="space-y-1.5 p-1">
      {nomeComite ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
          {nomeComite}
        </p>
      ) : null}
      {hybasId ? (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">ID: {hybasId}</p>
      ) : (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
          {name}
        </p>
      )}
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{formattedValue}</p>

      {hasValue ? (
        <div className="mt-2 space-y-1">
          <div className="relative h-2 w-full rounded-full" style={gradientStyle}>
            {/* Marcador posicionado usando thresholds estatísticos */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${markerPosition * 100}%` }}
            >
              <div
                className="h-4 w-1 rounded-sm shadow-md"
                style={{ backgroundColor: featureColor || '#000' }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[9px] text-neutral-500 dark:text-neutral-400">
            <span>Mín</span>
            <span>Máx</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
