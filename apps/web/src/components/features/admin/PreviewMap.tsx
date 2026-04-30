import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface PreviewMapProps {
  uploadId: string
  geojsonEndpoint: string
}

// Função para calcular cor baseada em valor de vulnerabilidade
const calculateColor = (value: number, min: number, max: number): string => {
  const normalized = (value - min) / (max - min)

  if (normalized <= 0.25) return '#00CC66' // Verde - Baixa vulnerabilidade
  if (normalized <= 0.5) return '#FFD700'  // Amarelo - Vulnerabilidade média
  if (normalized <= 0.75) return '#FB8500' // Laranja - Vulnerabilidade média-alta
  return '#D62828' // Vermelho - Alta vulnerabilidade
}

export function PreviewMap({ uploadId, geojsonEndpoint }: PreviewMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Inicializar mapa
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [-51.5, -25.5], // Centro do Paraná
      zoom: 6
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    // Carregar dados GeoJSON
    const loadGeoJSON = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(geojsonEndpoint)
        if (!response.ok) {
          throw new Error('Falha ao carregar dados geoespaciais')
        }

        const geojsonData = await response.json()

        // Calcular min/max para colorização
        const values = geojsonData.features.map(
          (f: any) => f.properties.indicator_value
        )
        const min = Math.min(...values)
        const max = Math.max(...values)

        // Adicionar cores às features
        geojsonData.features = geojsonData.features.map((feature: any) => ({
          ...feature,
          properties: {
            ...feature.properties,
            color: calculateColor(feature.properties.indicator_value, min, max)
          }
        }))

        if (map.current) {
          map.current.on('load', () => {
            if (!map.current) return

            // Adicionar source
            map.current.addSource('preview-data', {
              type: 'geojson',
              data: geojsonData
            })

            // Adicionar camada de preenchimento (polígonos)
            map.current.addLayer({
              id: 'preview-fill',
              type: 'fill',
              source: 'preview-data',
              paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.7
              },
              filter: ['==', ['geometry-type'], 'Polygon']
            })

            // Adicionar camada de contorno
            map.current.addLayer({
              id: 'preview-outline',
              type: 'line',
              source: 'preview-data',
              paint: {
                'line-color': '#333333',
                'line-width': 1
              },
              filter: ['==', ['geometry-type'], 'Polygon']
            })

            // Adicionar camada de linhas (para GT Transportes)
            map.current.addLayer({
              id: 'preview-lines',
              type: 'line',
              source: 'preview-data',
              paint: {
                'line-color': ['get', 'color'],
                'line-width': 3
              },
              filter: ['==', ['geometry-type'], 'LineString']
            })

            // Adicionar camada de pontos (para CSV com lat/lng)
            map.current.addLayer({
              id: 'preview-points',
              type: 'circle',
              source: 'preview-data',
              paint: {
                'circle-color': ['get', 'color'],
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
              },
              filter: ['==', ['geometry-type'], 'Point']
            })

            // Adicionar tooltip ao hover
            const popup = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false
            })

            map.current.on('mousemove', 'preview-fill', (e) => {
              if (!map.current || !e.features || e.features.length === 0) return

              map.current.getCanvas().style.cursor = 'pointer'

              const feature = e.features[0]
              const coordinates = e.lngLat
              const { name, indicator_value } = feature.properties

              popup
                .setLngLat(coordinates)
                .setHTML(
                  `<div class="p-2">
                    <p class="font-semibold">${name}</p>
                    <p class="text-sm">Valor: ${Number(indicator_value).toFixed(2)}</p>
                  </div>`
                )
                .addTo(map.current)
            })

            map.current.on('mouseleave', 'preview-fill', () => {
              if (!map.current) return
              map.current.getCanvas().style.cursor = ''
              popup.remove()
            })

            // Adicionar tooltip para pontos
            map.current.on('mousemove', 'preview-points', (e) => {
              if (!map.current || !e.features || e.features.length === 0) return

              map.current.getCanvas().style.cursor = 'pointer'

              const feature = e.features[0]
              const coordinates = e.lngLat
              const { name, indicator_value } = feature.properties

              popup
                .setLngLat(coordinates)
                .setHTML(
                  `<div class="p-2">
                    <p class="font-semibold">${name}</p>
                    <p class="text-sm">Valor: ${Number(indicator_value).toFixed(2)}</p>
                  </div>`
                )
                .addTo(map.current)
            })

            map.current.on('mouseleave', 'preview-points', () => {
              if (!map.current) return
              map.current.getCanvas().style.cursor = ''
              popup.remove()
            })

            // Ajustar bounds ao conteúdo
            const bounds = new maplibregl.LngLatBounds()
            geojsonData.features.forEach((feature: any) => {
              if (feature.geometry.type === 'Polygon') {
                feature.geometry.coordinates[0].forEach((coord: number[]) => {
                  bounds.extend(coord as [number, number])
                })
              } else if (feature.geometry.type === 'LineString') {
                feature.geometry.coordinates.forEach((coord: number[]) => {
                  bounds.extend(coord as [number, number])
                })
              } else if (feature.geometry.type === 'Point') {
                bounds.extend(feature.geometry.coordinates as [number, number])
              }
            })

            map.current.fitBounds(bounds, { padding: 50 })
          })
        }

        setLoading(false)
      } catch (err) {
        console.error('Erro ao carregar GeoJSON:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
        setLoading(false)
      }
    }

    loadGeoJSON()

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [uploadId, geojsonEndpoint])

  return (
    <div className="w-full">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Mapa de Preview
      </h3>
      <div className="relative h-[500px] w-full rounded-lg border border-gray-200 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-75">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Carregando mapa...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="text-center text-red-600">
              <p className="font-semibold">Erro ao carregar mapa</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="h-full w-full" />
      </div>

      {/* Legenda */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-700">Legenda</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: '#00CC66' }} />
            <span className="text-sm text-gray-700">Baixa vulnerabilidade</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: '#FFD700' }} />
            <span className="text-sm text-gray-700">Vulnerabilidade média</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: '#FB8500' }} />
            <span className="text-sm text-gray-700">Vulnerabilidade média-alta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: '#D62828' }} />
            <span className="text-sm text-gray-700">Alta vulnerabilidade</span>
          </div>
        </div>
      </div>
    </div>
  )
}
