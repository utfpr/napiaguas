import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { indicatorsService } from '@/services/indicators.service'
import { geometriesService } from '@/services/geometries.service'
import type { IndicatorData } from '@/types/indicators'
import type { ColorThresholds } from '@/utils/colorUtils'
import { calculateThresholds } from '@/utils/colorUtils'
import { coerceToFiniteNumber } from '@/utils/numberUtils'
import { getColorFromScale } from '@/lib/utils/map-utils'
import { VULNERABILITY_COLOR_SCALE } from '@/utils/scaleUtils'
import { getVulnerabilityColor } from '@/lib/colors'

interface UseIndicatorDataOptions {
  enabled?: boolean
  unit?: string | null
}

interface UseIndicatorDataResult {
  data: IndicatorData | null
  isLoading: boolean
  error: Error | null
  min: number | null
  max: number | null
  thresholds: ColorThresholds | null
  refetch: () => Promise<void>
}

const indicatorDataCache = new Map<string, IndicatorData>()

function cloneIndicatorData(payload: IndicatorData): IndicatorData {
  return {
    ...payload,
    metadata: { ...payload.metadata },
    features: payload.features.map((feature) => ({
      ...feature,
      geometry: JSON.parse(JSON.stringify(feature.geometry)),
      properties: {
        ...feature.properties,
        value: coerceToFiniteNumber(feature.properties.value),
        normalizedValue: coerceToFiniteNumber(feature.properties.normalizedValue ?? null),
        indicator_normalized: coerceToFiniteNumber(
          feature.properties.indicator_normalized ?? null,
        ),
      },
    })),
  }
}

export function useIndicatorData(
  workgroupId: string,
  indicatorId: string | null,
  options: UseIndicatorDataOptions = {},
): UseIndicatorDataResult {
  const enabled = options.enabled ?? true
  const cacheKey = indicatorId ? `${workgroupId}:${indicatorId}` : null

  const initialCached = cacheKey ? indicatorDataCache.get(cacheKey) ?? null : null

  const [data, setData] = useState<IndicatorData | null>(
    initialCached ? cloneIndicatorData(initialCached) : null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!indicatorId || !cacheKey || !enabled) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (!indicatorDataCache.has(cacheKey)) {
      setIsLoading(true)
    }
    setError(null)

    try {
      // GT Litoral e GT Transportes usam endpoint otimizado que retorna geometrias + valores em uma única chamada
      if (workgroupId === 'litoral' || workgroupId === 'transportes') {
        // Para transportes, precisamos buscar o UUID do indicador pela hierarquia
        // pois o indicatorId pode ser o nome (não o UUID)
        let resolvedIndicatorId = indicatorId

        if (workgroupId === 'transportes') {
          try {
            const hierarchy = await indicatorsService.getIndicatorHierarchy(workgroupId, {
              signal: controller.signal,
            })

            // Função recursiva para encontrar o indicador pelo ID (nome ou UUID)
            const findIndicator = (nodes: any[]): any => {
              for (const node of nodes) {
                if (node.id === indicatorId || node.uuid === indicatorId) {
                  return node
                }
                if (node.children?.length > 0) {
                  const found = findIndicator(node.children)
                  if (found) return found
                }
              }
              return null
            }

            const indicator = findIndicator(hierarchy)
            if (indicator?.uuid) {
              resolvedIndicatorId = indicator.uuid
            }
          } catch (err) {
            if (controller.signal.aborted) {
              return
            }
            console.error('Erro ao buscar hierarquia para resolver UUID:', err)
          }
        }

        const response = await indicatorsService.getIndicatorDataOptimized(
          workgroupId,
          resolvedIndicatorId,
          {
            signal: controller.signal,
          }
        )

        if (controller.signal.aborted) {
          return
        }

        // Response já vem no formato FeatureCollection com geometrias e valores
        const features = response.features.map((feature: any, index: number) => {
          const value = coerceToFiniteNumber(feature.properties?.value ?? null)
          const normalizedValue = coerceToFiniteNumber(
            feature.properties?.normalizedValue ?? feature.properties?.normalized_value ?? null
          )
          const color = getVulnerabilityColor(normalizedValue)

          // Para litoral: usar codigo e municipio
          // Para transportes: usar geometryId e name
          const isLitoral = workgroupId === 'litoral'
          const geometryId = String(
            feature.properties?.geometryId ??
            feature.properties?.codigo ??
            feature.id ??
            index
          )
          const name = isLitoral
            ? (feature.properties?.municipio ?? `Município ${geometryId}`)
            : (feature.properties?.name ?? feature.properties?.code ?? `Trecho ${geometryId}`)

          return {
            type: 'Feature' as const,
            id: feature.id ?? geometryId,
            geometry: feature.geometry,
            properties: {
              ...feature.properties,
              geometryId,
              ...(isLitoral ? {
                codigo: geometryId,
                Codigo: geometryId,
                municipio: name,
              } : {}),
              value,
              normalizedValue,
              indicator_normalized: normalizedValue,
              color,
              indicator_unit: options.unit ?? null,
              name,
            },
          }
        })

        const payload: IndicatorData = {
          type: 'FeatureCollection',
          metadata: {
            indicatorId,
            workgroupId,
            lastUpdated: new Date().toISOString(),
            unit: options.unit ?? response.metadata?.unit ?? undefined,
          },
          features,
        }

        if (!controller.signal.aborted) {
          indicatorDataCache.set(cacheKey, cloneIndicatorData(payload))
          setData(cloneIndicatorData(payload))
        }

        return
      }

      // Abordagem tradicional para outros GTs (geometrias + valores separados)
      const [geometries, values] = await Promise.all([
        geometriesService.getGeometriesByWorkgroup(workgroupId, {
          signal: controller.signal,
        }),
        indicatorsService.getIndicatorValues(workgroupId, indicatorId, {
          signal: controller.signal,
        }),
      ])

      if (controller.signal.aborted) {
        return
      }

      // Determinar qual campo usar como ID baseado no workgroup ou nos dados retornados
      const isHealthWorkgroup = workgroupId === 'saude'
      const idField = isHealthWorkgroup ? 'codigo_municipio' : 'hybas_id'

      const valueMap = new Map<string, { value: number | null; normalized: number | null }>(
        values.map((entry: any) => [
          String(entry[idField] ?? entry.hybas_id ?? entry.codigo_municipio ?? ''),
          {
            value:
              entry.value === null || entry.value === undefined
                ? null
                : coerceToFiniteNumber(entry.value),
            normalized:
              entry.normalized_value === null || entry.normalized_value === undefined
                ? null
                : coerceToFiniteNumber(entry.normalized_value),
          },
        ]),
      )

      // Calcular thresholds primeiro para adicionar nas features
      const allValues = Array.from(valueMap.values())
        .map((entry) => entry.value)
        .filter((v): v is number => v !== null)
      const computedThresholds = calculateThresholds(allValues)

      const features = geometries.features.map((feature, index) => {
        // Para saúde, usar codigo; para água-doce, usar hybas_id
        const geometryId = isHealthWorkgroup
          ? String(feature.properties?.codigo ?? feature.properties?.Codigo ?? feature.id ?? index)
          : String(
              feature.properties?.hybas_id ??
                feature.properties?.HYBAS_ID ??
                feature.properties?.hybasId ??
                feature.id ??
                index,
            )

        const featureId =
          (typeof feature.id === 'string' || typeof feature.id === 'number'
            ? feature.id
            : geometryId) ?? String(index)

        const entry = valueMap.get(geometryId)
        const value = entry?.value ?? null
        const normalizedValue =
          entry?.normalized !== null && entry?.normalized !== undefined
            ? entry?.normalized
            : null

        // Calcular cor usando interpolação de gradiente (mesma lógica do mapa)
        const colorScale = {
          domain: [computedThresholds.min, computedThresholds.max] as [number, number],
          colors: VULNERABILITY_COLOR_SCALE,
          noDataColor: '#e2e8f0',
        }
        const color = getColorFromScale(colorScale, value)

        // Nome padrão baseado no workgroup
        const defaultName = isHealthWorkgroup
          ? feature.properties?.municipio ?? feature.properties?.Municipio ?? `Município ${geometryId}`
          : `Sub-bacia ${geometryId}`

        return {
          type: 'Feature' as const,
          id: featureId,
          geometry: feature.geometry,
          properties: {
            ...feature.properties,
            geometryId: String(featureId),
            // Manter compatibilidade com ambos os tipos
            ...(isHealthWorkgroup
              ? {
                  codigo: geometryId,
                  Codigo: geometryId,
                  municipio: feature.properties?.municipio ?? feature.properties?.Municipio,
                }
              : {
                  hybasId: geometryId,
                  hybas_id: geometryId,
                  HYBAS_ID: geometryId,
                }),
            value,
            normalizedValue,
            indicator_normalized: normalizedValue,
            color,
            indicator_unit: options.unit ?? null,
            name: (feature.properties?.name as string | undefined) ?? defaultName,
            // Adicionar thresholds para uso no tooltip
            _thresholds: computedThresholds,
          },
        }
      })

      const payload: IndicatorData = {
        type: 'FeatureCollection',
        metadata: {
          indicatorId,
          workgroupId,
          lastUpdated: new Date().toISOString(),
          unit: options.unit ?? undefined,
        },
        features,
      }

      if (!controller.signal.aborted) {
        indicatorDataCache.set(cacheKey, cloneIndicatorData(payload))
        setData(cloneIndicatorData(payload))
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return
      }

      const message =
        err instanceof Error
          ? err
          : new Error('Falha desconhecida ao carregar dados do indicador')

      setError(message)
      setData(null)
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [cacheKey, enabled, indicatorId, options.unit, workgroupId])

  useEffect(() => {
    if (!indicatorId || !cacheKey || !enabled) {
      abortRef.current?.abort()
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    if (indicatorDataCache.has(cacheKey)) {
      setData(cloneIndicatorData(indicatorDataCache.get(cacheKey)!))
      setIsLoading(false)
      return
    }

    void fetchData()

    return () => {
      abortRef.current?.abort()
    }
  }, [cacheKey, enabled, fetchData, indicatorId, workgroupId])

  const refetch = useCallback(async () => {
    if (!indicatorId || !cacheKey) {
      return
    }

    indicatorDataCache.delete(cacheKey)
    await fetchData()
  }, [cacheKey, fetchData, indicatorId])

  const { min, max, thresholds } = useMemo(() => {
    if (!data) {
      return {
        min: null,
        max: null,
        thresholds: null,
      }
    }

    const values = data.features.map((feature) =>
      coerceToFiniteNumber(feature.properties.value),
    )
    const filtered = values.filter((value): value is number => value !== null)

    if (filtered.length === 0) {
      return {
        min: null,
        max: null,
        thresholds: null,
      }
    }

    const computedThresholds = calculateThresholds(filtered)

    return {
      min: computedThresholds.min,
      max: computedThresholds.max,
      thresholds: computedThresholds,
    }
  }, [data])

  return {
    data,
    isLoading,
    error,
    min,
    max,
    thresholds,
    refetch,
  }
}

export function __resetIndicatorDataCache() {
  indicatorDataCache.clear()
}
