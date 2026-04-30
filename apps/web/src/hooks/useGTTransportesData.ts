import { GTType } from '@napi-aguas/shared'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useDebounce } from '@/hooks/useDebounce'
import { createLineColorExpression, createLineWidthExpression } from '@/lib/utils/map-expressions'
import {
  transportesService,
  type TransportesGeometriesResponse,
  type TransportesIndicatorFeatureCollection,
  type TransportesIndicatorProperties,
  type TransportesGeometryProperties,
} from '@/services/transportes.service'
import type { IndicatorNode } from '@/types/indicators'
import type { MapLayer } from '@/types/map.types'

export type RoadTypeFilter = 'all' | 'federal' | 'estadual'

interface HookState {
  geometries: TransportesGeometriesResponse | null
  backgroundLayer: FeatureCollection<Geometry, Record<string, unknown>> | null
  indicatorsTree: IndicatorNode[] | null
  indicatorData: TransportesIndicatorFeatureCollection | null
  isLoading: boolean
  isIndicatorLoading: boolean
  error: Error | null
  indicatorError: Error | null
}

export interface RoadTypeTotals {
  all: number
  federal: number
  estadual: number
}

interface UseGTTransportesDataOptions {
  initialRoadType?: RoadTypeFilter
  initialIndicatorId?: string | null
}

export interface UseGTTransportesDataResult {
  roadType: RoadTypeFilter
  setRoadType: (next: RoadTypeFilter) => void
  selectedIndicatorId: string | null
  setSelectedIndicatorId: (next: string | null) => void
  indicatorsTree: IndicatorNode[] | null
  layers: MapLayer[]
  backgroundLayer: FeatureCollection<Geometry, Record<string, unknown>> | null
  isLoading: boolean
  isIndicatorLoading: boolean
  error: Error | null
  indicatorError: Error | null
  totals: RoadTypeTotals
  filteredCount: number
  indicatorUnit: string | null
  indicatorLastUpdated: string | null
  refetch: () => Promise<void>
  refetchIndicator: () => Promise<void>
}

const geometriesCache = new Map<RoadTypeFilter, TransportesGeometriesResponse>()
const indicatorDataCache = new Map<string, TransportesIndicatorFeatureCollection>()
let backgroundLayerCache: FeatureCollection<Geometry, Record<string, unknown>> | null = null
let indicatorsTreeCache: IndicatorNode[] | null = null

const DEFAULT_TOTALS: RoadTypeTotals = {
  all: 0,
  federal: 0,
  estadual: 0,
}

const LINE_COLORS = ['#00CC66', '#FFD700', '#FB8500', '#D62828'] as const
const LINE_DOMAIN = [0, 0.33, 0.66, 1]
const FALLBACK_ERROR = 'Erro desconhecido ao carregar dados do GT Transportes'
const FALLBACK_INDICATOR_ERROR = 'Erro ao carregar dados do indicador selecionado'

const clone = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

function findFirstIndicatorNode(nodes: IndicatorNode[] | null | undefined): IndicatorNode | null {
  if (!nodes) {
    return null
  }

  for (const node of nodes) {
    if (node.type === 'indicator') {
      return node
    }

    const child = findFirstIndicatorNode(node.children)
    if (child) {
      return child
    }
  }

  return null
}

function buildTotalsFromAllFeatures(collection: TransportesGeometriesResponse | null): RoadTypeTotals {
  if (!collection) {
    return DEFAULT_TOTALS
  }

  const base = {
    all: collection.features.length,
    federal: 0,
    estadual: 0,
  }

  collection.features.forEach((feature) => {
    const props = feature.properties as TransportesGeometryProperties
    const roadType = props.roadType
    if (roadType === 'federal') {
      base.federal += 1
    } else if (roadType === 'estadual') {
      base.estadual += 1
    }
  })

  return base
}

function mergeIndicatorData(
  base: TransportesGeometriesResponse | null,
  indicatorData: TransportesIndicatorFeatureCollection | null,
  indicatorUnit: string | null,
): FeatureCollection<Geometry, Record<string, unknown>> | null {
  if (!base) {
    return null
  }

  const indicatorMap = new Map<string, Feature<Geometry, TransportesIndicatorProperties>>()
  if (indicatorData) {
    indicatorData.features.forEach((feature: Feature<Geometry, TransportesIndicatorProperties>) => {
      const indicatorProps = feature.properties
      const featureId = feature.id ?? indicatorProps.geometryId
      if (featureId !== undefined && featureId !== null) {
        indicatorMap.set(String(featureId), feature)
      }
    })
  }

  const features: Feature<Geometry, Record<string, unknown>>[] = base.features.map((feature) => {
    const baseProps = feature.properties as TransportesGeometryProperties
    const indicatorFeature = indicatorMap.get(String(feature.id ?? baseProps.id))
    const indicatorProps = indicatorFeature?.properties

    const indicatorValue = typeof indicatorProps?.value === 'number' ? indicatorProps.value : null
    const normalizedValue =
      typeof indicatorProps?.normalizedValue === 'number'
        ? indicatorProps.normalizedValue
        : typeof indicatorProps?.value === 'number'
          ? indicatorProps.value
          : null

    return {
      type: 'Feature',
      id: feature.id ?? baseProps.id,
      geometry: indicatorFeature?.geometry ?? feature.geometry,
      properties: {
        ...baseProps,
        name: indicatorProps?.name ?? baseProps.name,
        code: indicatorProps?.code ?? baseProps.code,
        roadType: indicatorProps?.roadType ?? baseProps.roadType,
        road_type: indicatorProps?.roadType ?? baseProps.roadType,
        lengthKm: indicatorProps?.lengthKm ?? baseProps.lengthKm,
        length_km: indicatorProps?.lengthKm ?? baseProps.lengthKm,
        indicator_value: indicatorValue,
        indicator_normalized: normalizedValue,
        indicator_unit: indicatorUnit,
      },
    }
  })

  return {
    type: 'FeatureCollection',
    features,
  }
}

function buildLineLayer(
  mergedCollection: FeatureCollection<Geometry, Record<string, unknown>> | null,
  indicatorUnit: string | null,
  indicatorLastUpdated: string | null,
  indicatorName: string | null,
): MapLayer[] {
  if (!mergedCollection) {
    return []
  }

  const lineLayer: MapLayer = {
    id: 'transportes-road-network',
    type: 'geojson',
    data: mergedCollection,
    geometryMode: 'line',
    style: {
      mode: 'line',
      color: createLineColorExpression([...LINE_DOMAIN], [...LINE_COLORS]),
      width: createLineWidthExpression(2, 8),
      opacity: 0.85,
    },
    legend: {
      title: indicatorName ?? 'Vulnerabilidade Rodoviária',
      unit: indicatorUnit,
      lastUpdated: indicatorLastUpdated,
      type: 'line',
      showNoData: true,
      entries: [
        {
          label: 'Alta crítica (≥ 0.75)',
          color: LINE_COLORS[3],
        },
        {
          label: 'Alta (0.50 - 0.74)',
          color: LINE_COLORS[2],
        },
        {
          label: 'Moderada (0.33 - 0.49)',
          color: LINE_COLORS[1],
        },
        {
          label: 'Baixa (0 - 0.32)',
          color: LINE_COLORS[0],
        },
      ],
    },
    metadata: {
      gt: GTType.TRANSPORTES,
    },
  }

  return [lineLayer]
}

function findIndicatorName(nodes: IndicatorNode[] | null, targetId: string | null): string | null {
  if (!nodes || !targetId) {
    return null
  }

  for (const node of nodes) {
    if (node.id === targetId) {
      return node.name
    }

    if (node.children.length > 0) {
      const found = findIndicatorName(node.children, targetId)
      if (found) {
        return found
      }
    }
  }
  return null
}

export function useGTTransportesData(
  options: UseGTTransportesDataOptions = {},
): UseGTTransportesDataResult {
  const [roadType, setRoadType] = useState<RoadTypeFilter>(options.initialRoadType ?? 'all')
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(
    options.initialIndicatorId ?? null,
  )
  const [state, setState] = useState<HookState>({
    geometries: null,
    backgroundLayer: null,
    indicatorsTree: null,
    indicatorData: null,
    isLoading: true,
    isIndicatorLoading: false,
    error: null,
    indicatorError: null,
  })
  const [totals, setTotals] = useState<RoadTypeTotals>(DEFAULT_TOTALS)

  const baseAbortRef = useRef<AbortController | null>(null)
  const indicatorAbortRef = useRef<AbortController | null>(null)

  const debouncedRoadType = useDebounce(roadType, 300)

  const loadBaseData = useCallback(
    async (targetRoadType: RoadTypeFilter, { ignoreCache = false } = {}) => {
      baseAbortRef.current?.abort()
      const controller = new AbortController()
      baseAbortRef.current = controller

      const shouldMeasure =
        typeof console !== 'undefined' &&
        typeof console.time === 'function' &&
        import.meta.env.DEV
      const performanceLabel = `GTTransportes::geometries:${targetRoadType}`
      let timerStopped = false
      const endPerformanceTimer = () => {
        if (!timerStopped && shouldMeasure) {
          timerStopped = true
          try {
            console.timeEnd(performanceLabel)
          } catch {
            // timer pode não existir
          }
        }
      }

      if (shouldMeasure) {
        console.time(performanceLabel)
      }

      const shouldUseCache = !ignoreCache
      const cachedGeometries = shouldUseCache ? geometriesCache.get(targetRoadType) : undefined
      const cachedBackground = shouldUseCache ? backgroundLayerCache : null
      const previousBackground = backgroundLayerCache
      const cachedIndicatorsTree = shouldUseCache ? indicatorsTreeCache : null

      setState((prev) => ({
        ...prev,
        isLoading: !cachedGeometries,
        error: null,
      }))

      try {
        const geometries =
          cachedGeometries && !ignoreCache
            ? clone(cachedGeometries)
            : await transportesService.getGeometries({
                roadType: targetRoadType,
                signal: controller.signal,
              })

        if (!controller.signal.aborted && (!cachedGeometries || ignoreCache)) {
          geometriesCache.set(targetRoadType, clone(geometries))
        }

        let backgroundLayer: FeatureCollection<Geometry, Record<string, unknown>> | null = cachedBackground
          ? clone(cachedBackground)
          : previousBackground ?? null
        if (!backgroundLayerCache || ignoreCache) {
          try {
            const backgroundResponse = await transportesService.getBackground(controller.signal)
            if (controller.signal.aborted) {
              endPerformanceTimer()
              return
            }
            const clonedBackground = clone(backgroundResponse) as FeatureCollection<
              Geometry,
              Record<string, unknown>
            >
            backgroundLayerCache = clonedBackground
            backgroundLayer = clonedBackground
          } catch (backgroundError) {
            if (controller.signal.aborted) {
              endPerformanceTimer()
              return
            }

            if (import.meta.env.DEV) {
              console.warn('[GT Transportes] Falha ao carregar camada de background', backgroundError)
            }

            if (previousBackground) {
              backgroundLayer = previousBackground
            }
          }
        }

        let indicatorsTree = cachedIndicatorsTree ? clone(cachedIndicatorsTree) : null
        if (!indicatorsTreeCache || ignoreCache) {
          const indicatorTreeResponse = await transportesService.getIndicatorsTree(controller.signal)
          if (controller.signal.aborted) {
            endPerformanceTimer()
            return
          }
          indicatorsTreeCache = clone(indicatorTreeResponse)
          indicatorsTree = clone(indicatorTreeResponse)
        }

        if (controller.signal.aborted) {
          endPerformanceTimer()
          return
        }

        setState((prev) => ({
          ...prev,
          geometries,
          backgroundLayer,
          indicatorsTree,
          isLoading: false,
          error: null,
        }))

        if (targetRoadType === 'all' && geometries) {
          setTotals(buildTotalsFromAllFeatures(geometries))
        } else if (totals.all === 0) {
          const cachedAll = geometriesCache.get('all')
          if (cachedAll) {
            setTotals(buildTotalsFromAllFeatures(cachedAll))
          }
        }

        endPerformanceTimer()
      } catch (err) {
        if (controller.signal.aborted) {
          endPerformanceTimer()
          return
        }

        const message =
          err instanceof Error ? err : new Error(FALLBACK_ERROR)

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }))
        endPerformanceTimer()
      }
    },
    [totals.all],
  )

  const loadIndicatorData = useCallback(
    async (indicatorId: string | null, { ignoreCache = false } = {}) => {
      indicatorAbortRef.current?.abort()

      if (!indicatorId) {
        setState((prev) => ({
          ...prev,
          indicatorData: null,
          indicatorError: null,
          isIndicatorLoading: false,
        }))
        return
      }

      const controller = new AbortController()
      indicatorAbortRef.current = controller

      const shouldMeasure =
        typeof console !== 'undefined' &&
        typeof console.time === 'function' &&
        import.meta.env.DEV
      const performanceLabel = `GTTransportes::indicator:${indicatorId}`
      let timerStopped = false
      const endPerformanceTimer = () => {
        if (!timerStopped && shouldMeasure) {
          timerStopped = true
          try {
            console.timeEnd(performanceLabel)
          } catch {
            // timer pode não existir
          }
        }
      }

      const cached = indicatorDataCache.get(indicatorId)
      if (cached && !ignoreCache) {
        setState((prev) => ({
          ...prev,
          indicatorData: clone(cached),
          indicatorError: null,
          isIndicatorLoading: false,
        }))
        return
      }

      setState((prev) => ({
        ...prev,
        isIndicatorLoading: true,
        indicatorError: null,
      }))

      try {
        if (shouldMeasure) {
          console.time(performanceLabel)
        }

        const response = await transportesService.getIndicatorValues(indicatorId, controller.signal)
        if (controller.signal.aborted) {
          endPerformanceTimer()
          return
        }

        indicatorDataCache.set(indicatorId, clone(response))
        setState((prev) => ({
          ...prev,
          indicatorData: clone(response),
          indicatorError: null,
          isIndicatorLoading: false,
        }))
        endPerformanceTimer()
      } catch (err) {
        if (controller.signal.aborted) {
          endPerformanceTimer()
          return
        }

        const message =
          err instanceof Error ? err : new Error(FALLBACK_INDICATOR_ERROR)

        setState((prev) => ({
          ...prev,
          indicatorData: null,
          indicatorError: message,
          isIndicatorLoading: false,
        }))
        endPerformanceTimer()
      }
    },
    [],
  )

  useEffect(() => {
    void loadBaseData(debouncedRoadType)

    return () => {
      baseAbortRef.current?.abort()
    }
  }, [debouncedRoadType, loadBaseData])

  useEffect(() => {
    const firstIndicator = findFirstIndicatorNode(state.indicatorsTree)
    if (!selectedIndicatorId && firstIndicator?.id) {
      setSelectedIndicatorId(firstIndicator.id)
    }
  }, [selectedIndicatorId, state.indicatorsTree])

  useEffect(() => {
    void loadIndicatorData(selectedIndicatorId)

    return () => {
      indicatorAbortRef.current?.abort()
    }
  }, [loadIndicatorData, selectedIndicatorId])

  const mergedCollection = useMemo(() => {
    return mergeIndicatorData(
      state.geometries,
      state.indicatorData,
      state.indicatorData?.metadata?.unit ?? null,
    )
  }, [state.geometries, state.indicatorData])

  const selectedIndicatorName = useMemo(() => {
    return findIndicatorName(state.indicatorsTree, selectedIndicatorId)
  }, [state.indicatorsTree, selectedIndicatorId])

  const layers = useMemo(() => {
    return buildLineLayer(
      mergedCollection,
      state.indicatorData?.metadata?.unit ?? null,
      state.indicatorData?.metadata?.lastUpdated ?? null,
      selectedIndicatorName,
    )
  }, [mergedCollection, state.indicatorData, selectedIndicatorName])

  const filteredCount = state.geometries?.features.length ?? 0

  const refetch = useCallback(async () => {
    geometriesCache.delete(debouncedRoadType)
    await loadBaseData(debouncedRoadType, { ignoreCache: true })
    if (selectedIndicatorId) {
      indicatorDataCache.delete(selectedIndicatorId)
      await loadIndicatorData(selectedIndicatorId, { ignoreCache: true })
    }
  }, [debouncedRoadType, loadBaseData, loadIndicatorData, selectedIndicatorId])

  const refetchIndicator = useCallback(async () => {
    if (!selectedIndicatorId) {
      return
    }
    indicatorDataCache.delete(selectedIndicatorId)
    await loadIndicatorData(selectedIndicatorId, { ignoreCache: true })
  }, [loadIndicatorData, selectedIndicatorId])

  return {
    roadType,
    setRoadType,
    selectedIndicatorId,
    setSelectedIndicatorId,
    indicatorsTree: state.indicatorsTree,
    layers,
    backgroundLayer: state.backgroundLayer,
    isLoading: state.isLoading,
    isIndicatorLoading: state.isIndicatorLoading,
    error: state.error,
    indicatorError: state.indicatorError,
    totals,
    filteredCount,
    indicatorUnit: state.indicatorData?.metadata?.unit ?? null,
    indicatorLastUpdated: state.indicatorData?.metadata?.lastUpdated ?? null,
    refetch,
    refetchIndicator,
  }
}

export function __resetGTTransportesCache() {
  geometriesCache.clear()
  indicatorDataCache.clear()
  backgroundLayerCache = null
  indicatorsTreeCache = null
}
