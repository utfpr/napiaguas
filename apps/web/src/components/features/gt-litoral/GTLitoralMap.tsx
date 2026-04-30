import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { useMemo } from 'react'

import { InteractiveMap } from '@/components/features/InteractiveMap'
import { useGTLitoralContext } from '@/contexts/GTLitoralContext'
import {
  GT_LITORAL_INDICATOR_MAP,
  GTLITORAL_PERIOD_FORMATTER,
  type GTLitoralIndicatorKey,
} from '@/lib/gt-litoral/constants'
import { MUNICIPIO_INDICATOR_VALUE_MAP } from '@/lib/gt-litoral/utils'
import type { MapLayer } from '@/types/map.types'
import { GTType } from '@napi-aguas/shared'

interface MapFeatureProperties {
  id: string
  nome: string
  value: number | null
  risco_inundacao: number | null
  [key: string]: unknown
}

const MAP_CENTER: [number, number] = [-48.5, -25.5]

export function GTLitoralMap() {
  const {
    municipios,
    filteredMunicipios,
    selectedIndicatorKey,
    selectedIndicator,
    isLoading,
    error,
    refetch,
    setSelectedMunicipioId,
  } = useGTLitoralContext()

  const featureCollection = useMemo<FeatureCollection<Geometry, MapFeatureProperties> | null>(() => {
    if (!municipios) {
      return null
    }

    const source = filteredMunicipios

    return {
      type: 'FeatureCollection',
      features: source.map((municipio) => {
        const value = MUNICIPIO_INDICATOR_VALUE_MAP[selectedIndicatorKey](municipio)
        return {
          type: 'Feature',
          geometry: municipio.geometria,
          properties: {
            id: municipio.id,
            nome: municipio.nome,
            value: value ?? null,
            risco_inundacao: municipio.indicadores.risco_inundacao ?? null,
          },
        } satisfies Feature<Geometry, MapFeatureProperties>
      }),
    }
  }, [filteredMunicipios, municipios, selectedIndicatorKey])

  const layers = useMemo<MapLayer[]>(() => {
    if (!featureCollection) {
      return []
    }

    return [
      {
        id: 'gt-litoral-municipios',
        type: 'geojson',
        data: featureCollection,
        style: {
          mode: 'choropleth',
          property: 'value',
          colorScale: selectedIndicator.colorScale,
          opacity: 0.85,
          outlineColor: '#0f172a',
        },
        legend: {
          title: selectedIndicator.label,
          unit: selectedIndicator.unit ?? null,
          entries: undefined,
        },
      },
    ]
  }, [featureCollection, selectedIndicator])

  return (
    <div data-testid="gtlitoral-map" className="w-full">
      <InteractiveMap
        gtType={GTType.LITORAL}
        layers={layers}
        className="h-[520px] w-full rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40"
        center={MAP_CENTER}
        zoom={8}
        isLoading={isLoading}
        loadingMessage="Carregando dados do GT Litoral..."
        externalError={error}
        refetch={() => refetch({ ignoreCache: true })}
        onFeatureClick={({ feature }) => {
          const props = feature.properties as MapFeatureProperties | undefined
          if (props?.id) {
            setSelectedMunicipioId(props.id, { openDetails: true })
          }
        }}
        controlsPosition="top-right"
        layerControlPosition="top-left"
        fitBoundsOnLoad
        loadingRenderer={null}
        errorRenderer={(mapError) => (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Falha ao carregar mapa do GT Litoral
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{mapError.message}</p>
            <button
              type="button"
              className="text-sm font-medium text-sky-600 hover:underline"
              onClick={() => {
                void refetch({ ignoreCache: true })
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}
      />
    </div>
  )
}
