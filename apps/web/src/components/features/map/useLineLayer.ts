import { useCallback, useMemo, useRef } from 'react'
import type {
  ExpressionSpecification,
  GeoJSONSource,
  MapLayerMouseEvent,
  LineLayerSpecification,
} from 'maplibre-gl'
import type maplibregl from 'maplibre-gl'

type LinePaint = LineLayerSpecification['paint']

import {
  createLineColorExpression,
  createLineWidthExpression,
} from '@/lib/utils/map-expressions'
import type { GeoJsonMapLayer, LineLayerStyle } from '@/types/map.types'

const DEFAULT_COLOR_DOMAIN = [0, 0.33, 0.66, 1]
const DEFAULT_COLORS = ['#00CC66', '#FFD700', '#FB8500', '#D62828'] as const
const DEFAULT_OPACITY = 0.8

interface RegisterLineLayerParams {
  map: maplibregl.Map
  layer: GeoJsonMapLayer
  sourceId: string
  visible: boolean
  beforeLayerId?: string | null
}

interface UpdateLineLayerParams extends RegisterLineLayerParams {
  mapLayerIds: string[]
}

interface LineLayerRegistration {
  mapLayerIds: string[]
  interactiveLayerIds: string[]
  cleanup: () => void
}

export function useLineLayer() {
  const hoveredFeatureRef = useRef<Map<string, string | number | null>>(new Map())

  const resolveStyle = useCallback((layer: GeoJsonMapLayer) => {
    const style = layer.style?.mode === 'line' ? (layer.style as LineLayerStyle) : undefined

    const color =
      style?.color ??
      createLineColorExpression([...DEFAULT_COLOR_DOMAIN], [...DEFAULT_COLORS])

    const width = style?.width ?? createLineWidthExpression(2, 6)
    const opacity = style?.opacity ?? DEFAULT_OPACITY
    const dashArray = style?.dashArray

    return {
      color,
      width,
      opacity,
      dashArray,
    }
  }, [])

  const buildHoverableWidth = useCallback(
    (width: number | ExpressionSpecification): ExpressionSpecification => {
      if (typeof width === 'number') {
        return ['case', ['boolean', ['feature-state', 'hover'], false], width + 4, width]
      }
      return ['case', ['boolean', ['feature-state', 'hover'], false], ['+', width, 4], width]
    },
    [],
  )

  const buildHitboxWidth = useCallback(
    (width: number | ExpressionSpecification): number | ExpressionSpecification => {
      if (typeof width === 'number') {
        return Math.max(width * 3, width + 8)
      }
      return ['*', width, 3]
    },
    [],
  )

  const buildHoverableOpacity = useCallback((opacity: number): ExpressionSpecification => {
    return [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      1, // Opacidade máxima no hover para destaque forte
      opacity,
    ]
  }, [])

  const clearHoverState = useCallback((map: maplibregl.Map, sourceId: string) => {
    const hoveredId = hoveredFeatureRef.current.get(sourceId)
    if (hoveredId !== undefined && hoveredId !== null) {
      map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false })
    }
    hoveredFeatureRef.current.set(sourceId, null)
    const canvas = map.getCanvas?.()
    if (canvas) {
      canvas.style.cursor = ''
    }
  }, [])

  const registerLineLayer = useCallback(
    ({
      map,
      layer,
      sourceId,
      visible,
      beforeLayerId,
    }: RegisterLineLayerParams): LineLayerRegistration => {
      const style = resolveStyle(layer)
      const lineLayerId = `${layer.id}-line`
      const hitboxLayerId = `${layer.id}-line-hitbox`

      if (map.getSource(sourceId)) {
        map.removeSource(sourceId)
      }

      map.addSource(sourceId, {
        type: 'geojson',
        data: layer.data,
        promoteId: 'id',
      })

      const hoverableWidth = buildHoverableWidth(style.width)
      const hoverableOpacity = buildHoverableOpacity(style.opacity)
      const hitboxWidth = buildHitboxWidth(style.width)

      const hitboxPaint: LinePaint = {
        'line-color': 'rgba(0,0,0,0)',
        'line-width': hitboxWidth as any,
        'line-opacity': 0.05,
      }

      map.addLayer(
        {
          id: hitboxLayerId,
          type: 'line',
          source: sourceId,
          paint: hitboxPaint,
          layout: {
            visibility: visible ? 'visible' : 'none',
            'line-cap': 'round',
            'line-join': 'round',
          },
        },
        beforeLayerId ?? undefined,
      )

      const linePaint: LinePaint = {
        'line-color': style.color as any,
        'line-width': hoverableWidth as any,
        'line-opacity': hoverableOpacity as any,
      }

      if (style.dashArray) {
        linePaint['line-dasharray'] = ['literal', style.dashArray] as unknown as ExpressionSpecification
      }

      map.addLayer(
        {
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: linePaint,
          layout: {
            visibility: visible ? 'visible' : 'none',
            'line-cap': 'round',
            'line-join': 'round',
          },
        },
        beforeLayerId ?? undefined,
      )

      const handleHover = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        if (!feature || feature.id === undefined || feature.id === null) {
          return
        }

        const previous = hoveredFeatureRef.current.get(sourceId)
        if (previous !== undefined && previous !== null && previous !== feature.id) {
          map.setFeatureState({ source: sourceId, id: previous }, { hover: false })
        }

        hoveredFeatureRef.current.set(sourceId, feature.id as string | number)
        map.setFeatureState({ source: sourceId, id: feature.id }, { hover: true })

        const canvas = map.getCanvas?.()
        if (canvas) {
          canvas.style.cursor = 'pointer'
        }
      }

      const handleMouseLeave = () => {
        clearHoverState(map, sourceId)
      }

      map.on('mousemove', hitboxLayerId, handleHover)
      map.on('mouseleave', hitboxLayerId, handleMouseLeave)

      const cleanup = () => {
        map.off('mousemove', hitboxLayerId, handleHover)
        map.off('mouseleave', hitboxLayerId, handleMouseLeave)
        clearHoverState(map, sourceId)
      }

      return {
        mapLayerIds: [hitboxLayerId, lineLayerId],
        interactiveLayerIds: [hitboxLayerId],
        cleanup,
      }
    },
    [buildHitboxWidth, buildHoverableOpacity, buildHoverableWidth, clearHoverState, resolveStyle],
  )

  const updateLineLayer = useCallback(
    ({ map, layer, sourceId, visible, beforeLayerId, mapLayerIds }: UpdateLineLayerParams) => {
      const style = resolveStyle(layer)
      const hitboxLayerId = mapLayerIds[0]
      const lineLayerId = mapLayerIds[1]

      const source = map.getSource(sourceId) as GeoJSONSource | undefined
      if (source) {
        source.setData(layer.data)
      }

      const hoverableWidth = buildHoverableWidth(style.width)
      const hoverableOpacity = buildHoverableOpacity(style.opacity)
      const hitboxWidth = buildHitboxWidth(style.width)

      map.setPaintProperty(hitboxLayerId, 'line-width', hitboxWidth as any)
      map.setPaintProperty(hitboxLayerId, 'line-opacity', 0.05)

      map.setPaintProperty(lineLayerId, 'line-width', hoverableWidth as any)
      map.setPaintProperty(lineLayerId, 'line-color', style.color as any)
      map.setPaintProperty(lineLayerId, 'line-opacity', hoverableOpacity as any)

      if (style.dashArray) {
        map.setPaintProperty(
          lineLayerId,
          'line-dasharray',
          ['literal', style.dashArray] as unknown as ExpressionSpecification,
        )
      } else {
        map.setPaintProperty(lineLayerId, 'line-dasharray', null)
      }

      const visibility = visible ? 'visible' : 'none'
      map.setLayoutProperty(hitboxLayerId, 'visibility', visibility)
      map.setLayoutProperty(lineLayerId, 'visibility', visibility)

      if (beforeLayerId) {
        map.moveLayer(lineLayerId, beforeLayerId)
        map.moveLayer(hitboxLayerId, lineLayerId)
      }
    },
    [buildHitboxWidth, buildHoverableOpacity, buildHoverableWidth, resolveStyle],
  )

  return useMemo(
    () => ({
      registerLineLayer,
      updateLineLayer,
      clearHoverState,
    }),
    [clearHoverState, registerLineLayer, updateLineLayer],
  )
}
