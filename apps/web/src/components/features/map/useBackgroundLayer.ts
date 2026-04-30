import { useCallback, useMemo } from 'react'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoJSONSource, Map } from 'maplibre-gl'

interface EnsureBackgroundLayerParams {
  map: Map
  data: FeatureCollection<Geometry, Record<string, unknown>> | null | undefined
  visible: boolean
  beforeLayerId?: string | null
}

const BACKGROUND_SOURCE_ID = 'interactive-map-background'
const BACKGROUND_LAYER_ID = 'interactive-map-background-fill'

export function useBackgroundLayer() {
  const ensureBackgroundLayer = useCallback(
    ({ map, data, visible, beforeLayerId }: EnsureBackgroundLayerParams) => {
      if (!data) {
        if (map.getLayer(BACKGROUND_LAYER_ID)) {
          map.removeLayer(BACKGROUND_LAYER_ID)
        }
        if (map.getSource(BACKGROUND_SOURCE_ID)) {
          map.removeSource(BACKGROUND_SOURCE_ID)
        }
        return
      }

      const existingSource = map.getSource(BACKGROUND_SOURCE_ID) as GeoJSONSource | undefined
      if (existingSource) {
        existingSource.setData(data)
      } else {
        map.addSource(BACKGROUND_SOURCE_ID, {
          type: 'geojson',
          data,
          promoteId: 'id',
        })
      }

      if (!map.getLayer(BACKGROUND_LAYER_ID)) {
        map.addLayer(
          {
            id: BACKGROUND_LAYER_ID,
            type: 'fill',
            source: BACKGROUND_SOURCE_ID,
            paint: {
              'fill-color': '#F5F5F5',
              'fill-opacity': 0.5,
              'fill-outline-color': '#CCCCCC',
            },
            layout: {
              visibility: visible ? 'visible' : 'none',
            },
            metadata: {
              interactive: false,
            },
          },
          beforeLayerId ?? undefined,
        )
      } else {
        map.setLayoutProperty(
          BACKGROUND_LAYER_ID,
          'visibility',
          visible ? 'visible' : 'none',
        )
        if (beforeLayerId) {
          map.moveLayer(BACKGROUND_LAYER_ID, beforeLayerId)
        }
      }
    },
    [],
  )

  const removeBackgroundLayer = useCallback((map: Map) => {
    if (map.getLayer(BACKGROUND_LAYER_ID)) {
      map.removeLayer(BACKGROUND_LAYER_ID)
    }
    if (map.getSource(BACKGROUND_SOURCE_ID)) {
      map.removeSource(BACKGROUND_SOURCE_ID)
    }
  }, [])

  return useMemo(
    () => ({
      ensureBackgroundLayer,
      removeBackgroundLayer,
    }),
    [ensureBackgroundLayer, removeBackgroundLayer],
  )
}
